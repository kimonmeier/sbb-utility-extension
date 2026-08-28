import { eq } from 'drizzle-orm';
import { synchronizeTourenForAllEmployees } from './api/syncLogic';
import { db, initDatabaseAndMigrate } from './db/db';
import { employee } from './db/schema';
import { createOffscreenListener } from './messages/messageReciever';

createOffscreenListener({
	INIT_DB: async () => {
		// TS knows there is no payload here
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
	QUERY_DB: {
		GET_EPMLOYEES: async () => {
			try {
				const employees = await db.query.employee.findMany();

				return {
					success: true,
					employees: employees.map((employee) => ({
						id: employee.id,
						name: employee.name,
						employeeIdentification: employee.employeeId
					}))
				};
			} catch (error) {
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
				return { success: false, error: String(error) };
			}
		}
	}
});
