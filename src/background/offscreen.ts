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
	employeeLinie,
	jahrestourenplan,
	touren,
	zeitkontenSnapshots
} from './db/schema';
import { createOffscreenListener } from './messages/messageReciever';
import { arrayBufferToBase64, base64ToArrayBuffer } from '$lib/utils/base64';
import { CalulcationEngine } from './caluclations/engine';
import type { CalculationLogEntry } from './caluclations/rules/types';
import { RUHETAGE_SOLL, type AccountId, type TourRow } from './caluclations/types';
import { countSaturdaysInYear, toZonedDateKey } from './caluclations/date-helper';
import { isKompensationstagType, isRuhetagType } from './caluclations/tour-helper';
import { collectFerienChargeTargets } from './caluclations/holiday-schedule';
import { collectKuerzungenChargeTargets } from './caluclations/kuerzungen-helper';
import {
	bewerteAlleGruppen,
	erzeugeHochrechnung,
	ladeHochrechnungAlsTourRows
} from './caluclations/linie/store';
import { importiereJahrestourenplan } from './db/jahrestourenplan';

/**
 * Fuehrt echte und hochgerechnete Tage zu einer Liste zusammen. Hochgerechnet
 * wird nur fuer Tage ohne echte Tour, ein Ueberschreiben kann es also nicht
 * geben; sortiert wird trotzdem, damit die Ferien- und Kuerzungsregeln die
 * Tage in der richtigen Reihenfolge sehen.
 */
function mergeTouren(echte: TourRow[], hochgerechnete: TourRow[]): TourRow[] {
	return [...echte, ...hochgerechnete].sort((a, b) => a.datum.getTime() - b.datum.getTime());
}

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
		GET_JAHRESTOURENPLAENE: async (payload) => {
			try {
				const plaene = await db.query.jahrestourenplan.findMany({
					where: eq(jahrestourenplan.jahr, payload.jahr)
				});

				return {
					success: true,
					plaene: plaene
						.map((plan) => ({
							id: plan.id,
							depot: plan.depot,
							gruppe: plan.gruppe,
							wochenschema: plan.wochenschema,
							jahr: plan.jahr,
							gueltigVon: toZonedDateKey(plan.gueltigVon),
							gueltigBis: toZonedDateKey(plan.gueltigBis),
							zyklusLaenge: plan.zyklusLaenge
						}))
						.sort((a, b) => a.gruppe.localeCompare(b.gruppe))
				};
			} catch (error) {
				console.error('Error querying jahrestourenplan:', error);
				return { success: false, error: String(error) };
			}
		},
		GET_EMPLOYEE_LINIE: async (payload) => {
			try {
				const zuweisungen = await db
					.select({
						id: employeeLinie.id,
						jahr: employeeLinie.jahr,
						planId: employeeLinie.plan,
						gruppe: jahrestourenplan.gruppe,
						zyklusLaenge: jahrestourenplan.zyklusLaenge,
						linie: employeeLinie.linie,
						quelle: employeeLinie.quelle,
						trefferquote: employeeLinie.trefferquote
					})
					.from(employeeLinie)
					.innerJoin(jahrestourenplan, eq(employeeLinie.plan, jahrestourenplan.id))
					.where(eq(employeeLinie.employee, payload.employeeId));

				return { success: true, zuweisungen };
			} catch (error) {
				console.error('Error querying employeeLinie:', error);
				return { success: false, error: String(error) };
			}
		},
		GET_EMPLOYEE_LINIEN_BEWERTUNG: async (payload) => {
			try {
				const bewertungen = await bewerteAlleGruppen(payload.employeeId, payload.jahr);

				return {
					success: true,
					bewertungen: bewertungen.map(({ plan, ergebnis }) => ({
						gruppe: plan.gruppe,
						planId: plan.id,
						erkannt: ergebnis.kind === 'erkannt',
						linie: ergebnis.kind === 'erkannt' ? ergebnis.linie : null,
						trefferquote: Math.round(
							(ergebnis.kind === 'erkannt' ? ergebnis.trefferquote : ergebnis.besteTrefferquote) *
								100
						),
						bewertbareTage: ergebnis.bewertbareTage,
						grund: ergebnis.kind === 'unklar' ? ergebnis.grund : null
					}))
				};
			} catch (error) {
				console.error('Error evaluating linien detection:', error);
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

					// Die hochgerechneten Dezembertage zaehlen wie echte Touren mit.
					const hochgerechnet = await ladeHochrechnungAlsTourRows(employee.id, 2026);
					const alleZeilen = mergeTouren(allTouren, hochgerechnet);

					engine.initContext(alleZeilen, 2026, ferienanspruch?.ferienAnspruchInTagen ?? 0);
					const scores = engine.calculateScores(alleZeilen);

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

				const hochgerechnet = await ladeHochrechnungAlsTourRows(payload.employeeId, year);
				const alleZeilen = mergeTouren(yearTouren, hochgerechnet);

				const engine = new CalulcationEngine();
				engine.initContext(alleZeilen, year, ferienanspruch?.ferienAnspruchInTagen ?? 0);
				const scores = engine.calculateScores(alleZeilen);

				const ferienChargeTargets = collectFerienChargeTargets(alleZeilen);
				const ferienAnteil = { ruhetage: 0, kompensationstage: 0 };
				for (const account of ferienChargeTargets.values()) {
					if (account === '9047') {
						ferienAnteil.ruhetage += 1;
					} else if (account === '9046') {
						ferienAnteil.kompensationstage += 1;
					}
				}

				const kuerzungenChargeTargets = collectKuerzungenChargeTargets(
					alleZeilen,
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
					ruhetage: alleZeilen.filter((tour) => isRuhetagType(tour.abkuerzung)).length,
					kompensationstage: alleZeilen.filter((tour) => isKompensationstagType(tour.abkuerzung))
						.length
				};
				const hochgerechneteTage = {
					ruhetage: hochgerechnet.filter((tour) => isRuhetagType(tour.abkuerzung)).length,
					kompensationstage: hochgerechnet.filter((tour) =>
						isKompensationstagType(tour.abkuerzung)
					).length,
					daten: hochgerechnet.map((tour) => toZonedDateKey(tour.datum))
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
						hochgerechnet: hochgerechneteTage,
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
		UPSERT_EMPLOYEE_LINIE: async (payload) => {
			try {
				await db
					.insert(employeeLinie)
					.values({
						employee: payload.employeeId,
						jahr: payload.jahr,
						plan: payload.planId,
						linie: payload.linie,
						quelle: 'MANUAL',
						trefferquote: null,
						erkanntAm: null
					})
					.onConflictDoUpdate({
						target: [employeeLinie.employee, employeeLinie.jahr],
						set: {
							plan: payload.planId,
							linie: payload.linie,
							quelle: 'MANUAL',
							trefferquote: null,
							erkanntAm: null
						}
					});

				// Die Hochrechnung haengt an der Zuweisung und muss mitziehen.
				await erzeugeHochrechnung(payload.employeeId, payload.jahr);

				return { success: true };
			} catch (error) {
				console.error('Error upserting employeeLinie:', error);
				return { success: false, error: String(error) };
			}
		},
		IMPORT_JAHRESTOURENPLAN: async (payload) => {
			try {
				const datei = await importiereJahrestourenplan(payload.json);
				return { success: true, gruppen: datei.gruppen.length };
			} catch (error) {
				console.error('Error importing jahrestourenplan:', error);
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
		},
		DELETE_EMPLOYEE_LINIE: async (payload) => {
			try {
				const zuweisung = await db.query.employeeLinie.findFirst({
					where: eq(employeeLinie.id, payload.id)
				});

				if (!zuweisung) {
					return { success: true };
				}

				await db.delete(employeeLinie).where(eq(employeeLinie.id, payload.id));
				// Ohne Zuweisung gibt es nichts hochzurechnen; der Aufruf raeumt
				// die bisherigen Prognosetage weg.
				await erzeugeHochrechnung(zuweisung.employee, zuweisung.jahr);

				return { success: true };
			} catch (error) {
				console.error('Error deleting employeeLinie:', error);
				return { success: false, error: String(error) };
			}
		}
	}
});
