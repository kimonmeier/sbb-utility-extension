import { eq } from 'drizzle-orm';
import { synchronizeTourenForAllEmployees } from './api/syncLogic';
import { db, initDatabaseAndMigrate } from './db/db';
import {
	exportDatabaseAsJson,
	exportDatabaseFile,
	importDatabaseFile,
	importDatabaseFromJson,
	resetDatabase
} from './db/backup';
import { employee, employeeArbeitsverhaeltnis, employeeFerienanspruch } from './db/schema';
import { createOffscreenListener } from './messages/messageReciever';
import { arrayBufferToBase64, base64ToArrayBuffer } from '$lib/utils/base64';

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
