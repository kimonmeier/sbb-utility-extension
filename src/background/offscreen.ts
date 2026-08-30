import { and, eq, gte, lte } from 'drizzle-orm';
import { synchronizeTourenForAllEmployees } from './api/syncLogic';
import { db, initDatabaseAndMigrate } from './db/db';
import {
	exportDatabaseAsJson,
	exportDatabaseFile,
	importDatabaseFile,
	importDatabaseFromJson,
	resetDatabase
} from './db/backup';
import {
	employee,
	employeeArbeitsverhaeltnis,
	employeeFerienanspruch,
	touren,
	zeitkontenSnapshots
} from './db/schema';
import { createOffscreenListener } from './messages/messageReciever';
import { arrayBufferToBase64, base64ToArrayBuffer } from '$lib/utils/base64';
import { CalulcationEngine } from './caluclations/engine';
import type { CalculationLogEntry } from './caluclations/rules/types';
import { RUHETAGE_SOLL, type AccountId } from './caluclations/types';
import { countSaturdaysInYear } from './caluclations/date-helper';
import { isKompensationstagType, isRuhetagType } from './caluclations/tour-helper';
import { collectFerienChargeTargets } from './caluclations/holiday-schedule';
import { collectKuerzungenChargeTargets } from './caluclations/kuerzungen-helper';

createOffscreenListener({
	INIT_DB: async () => {
		await initDatabaseAndMigrate();
		return { success: true };
	},
	SYNC_API: async (payload) => {
		console.log('Syncing with API');

		try {
			await synchronizeTourenForAllEmployees(payload.api_token);

			return { success: true };
		} catch (error) {
			console.error('Error during API sync:', error);
			return { success: false, error: String(error) };
		}
	},
	RESET_DB: async () => {
		try {
			await resetDatabase();
			return { success: true };
		} catch (error) {
			console.error('Error resetting database:', error);
			return { success: false, error: String(error) };
		}
	},
	EXPORT_DB_SQLITE: async () => {
		try {
			const file = await exportDatabaseFile();
			const buffer = await file.arrayBuffer();
			return { success: true, fileBase64: arrayBufferToBase64(buffer) };
		} catch (error) {
			console.error('Error exporting database file:', error);
			return { success: false, error: String(error) };
		}
	},
	IMPORT_DB_SQLITE: async (payload) => {
		try {
			const buffer = base64ToArrayBuffer(payload.fileBase64);
			await importDatabaseFile(new Blob([buffer]));
			return { success: true };
		} catch (error) {
			console.error('Error importing database file:', error);
			return { success: false, error: String(error) };
		}
	},
	EXPORT_DB_JSON: async () => {
		try {
			const json = await exportDatabaseAsJson();
			return { success: true, json };
		} catch (error) {
			console.error('Error exporting database as JSON:', error);
			return { success: false, error: String(error) };
		}
	},
	IMPORT_DB_JSON: async (payload) => {
		try {
			await importDatabaseFromJson(payload.json);
			return { success: true };
		} catch (error) {
			console.error('Error importing database from JSON:', error);
			return { success: false, error: String(error) };
		}
	},
	QUERY_DB: {
		GET_EPMLOYEES: async () => {
			try {
				const employees = await db.query.employee.findMany({
					orderBy: (entry) => entry.employeeId
				});

				return {
					success: true,
					employees: employees.map((employee) => ({
						id: employee.id,
						name: employee.name,
						employeeIdentification: employee.employeeId
					}))
				};
			} catch (error) {
				console.error('Error querying employees:', error);
				return { success: false, error: String(error) };
			}
		},
		GET_EMPLOYEE_BY_ID: async (payload) => {
			try {
				const employeeRecord = await db.query.employee.findFirst({
					where: eq(employee.id, payload.employeeId)
				});

				return {
					success: true,
					employee: {
						id: employeeRecord?.id ?? '',
						name: employeeRecord?.name ?? '',
						employeeIdentification: employeeRecord?.employeeId ?? ''
					}
				};
			} catch (error) {
				console.error('Error querying employee by ID:', error);
				return { success: false, error: String(error) };
			}
		},
		GET_TOUREN: async () => {
			try {
				const touren = await db.query.touren.findMany();

				return {
					success: true,
					touren: touren.map((tour) => ({
						id: tour.id,
						name: tour.abkuerzung ?? ''
					}))
				};
			} catch (error) {
				console.error('Error querying touren:', error);
				return { success: false, error: String(error) };
			}
		},
		GET_EMPLOYEE_FERIENANSPRUCH: async (payload) => {
			try {
				const ferienanspruch = await db.query.employeeFerienanspruch.findMany({
					where: eq(employeeFerienanspruch.employee, payload.employeeId),
					orderBy: (entry) => entry.jahr
				});

				return {
					success: true,
					ferienanspruch: ferienanspruch.map((entry) => ({
						id: entry.id,
						jahr: entry.jahr,
						ferienAnspruchInTagen: entry.ferienAnspruchInTagen
					}))
				};
			} catch (error) {
				console.error('Error querying employeeFerienanspruch:', error);
				return { success: false, error: String(error) };
			}
		},
		GET_EMPLOYEE_ARBEITSVERHAELTNIS: async (payload) => {
			try {
				const arbeitsverhaeltnisse = await db.query.employeeArbeitsverhaeltnis.findMany({
					where: eq(employeeArbeitsverhaeltnis.employee, payload.employeeId),
					orderBy: (entry) => entry.von
				});

				return {
					success: true,
					arbeitsverhaeltnisse: arbeitsverhaeltnisse.map((entry) => ({
						id: entry.id,
						von: entry.von,
						bis: entry.bis,
						pensumProzent: entry.pensumProzent
					}))
				};
			} catch (error) {
				console.error('Error querying employeeArbeitsverhaeltnis:', error);
				return { success: false, error: String(error) };
			}
		},
		GET_ALL_EMPLOYEE_CALUCULATION: async () => {
			try {
				const employees = await db.query.employee.findMany();

				const results: {
					id: string;
					name: string;
					employeeId: string;
					ruhetage: number;
					kompensationstage: number;
					ferien: number;
					logs: CalculationLogEntry[];
				}[] = [];
				for (const employee of employees) {
					const engine = new CalulcationEngine();

					// TODO: Make the year dynamic instead of hardcoding 2026
					const allTouren = await db
						.select()
						.from(touren)
						.where(
							and(
								eq(touren.employee, employee.id),
								gte(touren.datum, new Date('2026-01-01')),
								lte(touren.datum, new Date('2026-12-31'))
							)
						);
					const ferienanspruch = await db.query.employeeFerienanspruch.findFirst({
						where: (entry) => and(eq(entry.employee, employee.id), eq(entry.jahr, 2026))
					});

					engine.initContext(allTouren, 2026, ferienanspruch?.ferienAnspruchInTagen ?? 0);
					const scores = engine.calculateScores(allTouren);

					results.push({
						id: employee.id,
						name: employee.name,
						employeeId: employee.employeeId,
						ruhetage: scores.ruhetage,
						kompensationstage: scores.kompensationstage,
						ferien: scores.ferien,
						logs: scores.log
					});
				}

				return {
					success: true,
					calculations: results
				};
			} catch (error) {
				console.error('Error calculating employee calculations:', error);
				return { success: false, error: String(error) };
			}
		},
		GET_EMPLOYEE_CALUCULATION: async (payload) => {
			try {
				const year = payload.year ?? 2026;
				const employeeRecord = await db.query.employee.findFirst({
					where: eq(employee.id, payload.employeeId)
				});

				if (!employeeRecord) {
					return { success: false, error: 'Employee not found' };
				}

				const yearTouren = await db
					.select()
					.from(touren)
					.where(
						and(
							eq(touren.employee, payload.employeeId),
							gte(touren.datum, new Date(`${year}-01-01`)),
							lte(touren.datum, new Date(`${year}-12-31`))
						)
					);
				const ferienanspruch = await db.query.employeeFerienanspruch.findFirst({
					where: (entry) => and(eq(entry.employee, payload.employeeId), eq(entry.jahr, year))
				});

				const engine = new CalulcationEngine();
				engine.initContext(yearTouren, year, ferienanspruch?.ferienAnspruchInTagen ?? 0);
				const scores = engine.calculateScores(yearTouren);

				const ferienChargeTargets = collectFerienChargeTargets(yearTouren);
				const ferienAnteil = { ruhetage: 0, kompensationstage: 0 };
				for (const account of ferienChargeTargets.values()) {
					if (account === '9047') {
						ferienAnteil.ruhetage += 1;
					} else if (account === '9046') {
						ferienAnteil.kompensationstage += 1;
					}
				}

				const kuerzungenChargeTargets = collectKuerzungenChargeTargets(
					yearTouren,
					year,
					ferienanspruch?.ferienAnspruchInTagen ?? 0
				);
				const kuerzungen = { ruhetage: 0, kompensationstage: 0, ferien: 0 };
				for (const account of kuerzungenChargeTargets.values()) {
					if (account === '9047') {
						kuerzungen.ruhetage += 1;
					} else if (account === '9046') {
						kuerzungen.kompensationstage += 1;
					} else if (account === '9040') {
						kuerzungen.ferien += 1;
					}
				}

				const geplant = {
					ruhetage: yearTouren.filter((tour) => isRuhetagType(tour.abkuerzung)).length,
					kompensationstage: yearTouren.filter((tour) => isKompensationstagType(tour.abkuerzung))
						.length
				};

				const snapshots = await db.query.zeitkontenSnapshots.findMany({
					where: eq(zeitkontenSnapshots.employee, payload.employeeId)
				});
				const latestSnapshotByAccount = new Map<string, (typeof snapshots)[number]>();
				for (const snapshot of snapshots) {
					const existing = latestSnapshotByAccount.get(snapshot.sapLeaveTypeId);
					if (!existing || snapshot.snapshotDate > existing.snapshotDate) {
						latestSnapshotByAccount.set(snapshot.sapLeaveTypeId, snapshot);
					}
				}
				const aktuell: Partial<Record<AccountId, number>> = {};
				for (const [accountId, snapshot] of latestSnapshotByAccount.entries()) {
					aktuell[accountId as AccountId] = Number(snapshot.anzahl);
				}

				return {
					success: true,
					calculation: {
						year,
						scores: {
							ferien: scores.ferien,
							kompensationstage: scores.kompensationstage,
							ruhetage: scores.ruhetage
						},
						soll: { ruhetage: RUHETAGE_SOLL, kompensationstage: countSaturdaysInYear(year) },
						geplant,
						ferienAnteil,
						aktuell,
						kuerzungen,
						log: scores.log
					}
				};
			} catch (error) {
				console.error('Error calculating employee calculation:', error);
				return { success: false, error: String(error) };
			}
		}
	},
	INSERT_DB: {
		INSERT_EMPLOYEE: async (payload) => {
			try {
				const newEmployee = await db
					.insert(employee)
					.values({
						name: payload.name,
						employeeId: payload.employeeIdentification
					})
					.returning();

				return {
					success: true,
					employee: {
						id: newEmployee[0].id,
						name: newEmployee[0].name,
						employeeIdentification: newEmployee[0].employeeId
					}
				};
			} catch (error) {
				console.error('Error inserting employee:', error);
				return { success: false, error: String(error) };
			}
		},
		UPSERT_EMPLOYEE_FERIENANSPRUCH: async (payload) => {
			try {
				await db
					.insert(employeeFerienanspruch)
					.values({
						employee: payload.employeeId,
						jahr: payload.jahr,
						ferienAnspruchInTagen: payload.ferienAnspruchInTagen
					})
					.onConflictDoUpdate({
						target: [employeeFerienanspruch.employee, employeeFerienanspruch.jahr],
						set: { ferienAnspruchInTagen: payload.ferienAnspruchInTagen }
					});

				return { success: true };
			} catch (error) {
				console.error('Error upserting employeeFerienanspruch:', error);
				return { success: false, error: String(error) };
			}
		},
		INSERT_EMPLOYEE_ARBEITSVERHAELTNIS: async (payload) => {
			try {
				const vonDate = new Date(payload.von);
				const entries = await db.query.employeeArbeitsverhaeltnis
					.findMany({
						where: eq(employeeArbeitsverhaeltnis.employee, payload.employeeId)
					})
					.then((entries) =>
						entries.map((entry) => ({
							...entry,
							von: new Date(entry.von),
							bis: entry.bis ? new Date(entry.bis) : null
						}))
					)
					.then((entries) => entries.sort((a, b) => a.von.getTime() - b.von.getTime()));

				const firstEntryAfter = entries.find((entry) => entry.von > vonDate);
				const lastEntryBefore = entries.findLast((entry) => entry.von <= vonDate);

				if (firstEntryAfter) {
					await db
						.update(employeeArbeitsverhaeltnis)
						.set({ bis: vonDate })
						.where(eq(employeeArbeitsverhaeltnis.id, firstEntryAfter.id));
				}

				if (lastEntryBefore && (!lastEntryBefore.bis || lastEntryBefore.bis > vonDate)) {
					await db
						.update(employeeArbeitsverhaeltnis)
						.set({ bis: vonDate })
						.where(eq(employeeArbeitsverhaeltnis.id, lastEntryBefore.id));
				}

				await db.insert(employeeArbeitsverhaeltnis).values({
					employee: payload.employeeId,
					von: vonDate,
					pensumProzent: payload.pensumProzent
				});

				return { success: true };
			} catch (error) {
				console.error('Error inserting employeeArbeitsverhaeltnis:', error);
				return { success: false, error: String(error) };
			}
		}
	},
	DELETE_DB: {
		DELETE_EMPLOYEE: async (payload) => {
			try {
				await db.delete(employee).where(eq(employee.id, payload.employeeId));

				return { success: true };
			} catch (error) {
				console.error('Error deleting employee:', error);
				return { success: false, error: String(error) };
			}
		},
		DELETE_EMPLOYEE_FERIENANSPRUCH: async (payload) => {
			try {
				await db.delete(employeeFerienanspruch).where(eq(employeeFerienanspruch.id, payload.id));

				return { success: true };
			} catch (error) {
				console.error('Error deleting employeeFerienanspruch:', error);
				return { success: false, error: String(error) };
			}
		},
		DELETE_EMPLOYEE_ARBEITSVERHAELTNIS: async (payload) => {
			try {
				await db
					.delete(employeeArbeitsverhaeltnis)
					.where(eq(employeeArbeitsverhaeltnis.id, payload.id));

				return { success: true };
			} catch (error) {
				console.error('Error deleting employeeArbeitsverhaeltnis:', error);
				return { success: false, error: String(error) };
			}
		}
	}
});
