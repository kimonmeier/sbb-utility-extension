/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTableColumns } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { client, db, initDatabaseAndMigrate } from './db';
import * as schema from './schema';
import { erzeugeHochrechnungFuerAlle } from '$background/caluclations/linie/store';
import { seedJahrestourenplaene } from './jahrestourenplan';

// Parents before children, so import can insert in this order and delete
// can run in reverse without violating foreign key references.
// hochrechnungTouren fehlt hier bewusst: die Tabelle ist abgeleitet und wird
// nach Import und Sync ohnehin neu erzeugt. Ein Restore wuerde sonst veraltete
// Prognosen einschleppen.
const BACKUP_TABLES: Record<string, SQLiteTable> = {
	employee: schema.employee,
	jahrestourenplan: schema.jahrestourenplan,
	jahrestourenplanWoche: schema.jahrestourenplanWoche,
	touren: schema.touren,
	zeitkontenSnapshots: schema.zeitkontenSnapshots,
	employeeFerienanspruch: schema.employeeFerienanspruch,
	employeeArbeitsverhaeltnis: schema.employeeArbeitsverhaeltnis,
	arbeitszeitManualKuerzungen: schema.arbeitszeitManualKuerzungen,
	employeeLinie: schema.employeeLinie
};

export async function resetDatabase(): Promise<void> {
	await client.deleteDatabaseFile();
	await initDatabaseAndMigrate();
}

export async function exportDatabaseFile(): Promise<File> {
	return await client.getDatabaseFile();
}

export async function importDatabaseFile(file: File | Blob): Promise<void> {
	await client.overwriteDatabaseFile(file);
	await initDatabaseAndMigrate();
	await erzeugeHochrechnungFuerAlle();
}

export async function exportDatabaseAsJson(): Promise<string> {
	const data: Record<string, unknown[]> = {};

	for (const [name, table] of Object.entries(BACKUP_TABLES)) {
		data[name] = await (db as any).select().from(table);
	}

	return JSON.stringify(data, null, 2);
}

export async function importDatabaseFromJson(json: string): Promise<void> {
	const data = JSON.parse(json) as Record<string, Record<string, unknown>[]>;
	const tableEntries = Object.entries(BACKUP_TABLES);

	for (const [, table] of [...tableEntries].reverse()) {
		await (db as any).delete(table);
	}

	for (const [name, table] of tableEntries) {
		const rows = data[name];
		if (!Array.isArray(rows) || rows.length === 0) continue;

		const columns = getTableColumns(table);
		const coercedRows = rows.map((row) => {
			const coerced: Record<string, unknown> = { ...row };
			for (const [key, column] of Object.entries(columns)) {
				if (column.dataType === 'date' && coerced[key] != null) {
					coerced[key] = new Date(coerced[key] as string | number);
				}
			}
			return coerced;
		});

		await (db as any).insert(table).values(coercedRows);
	}

	// Eine Sicherung aus einer aelteren Version bringt noch keine
	// Jahrestourenplaene mit; die mitgelieferten wieder herstellen.
	await seedJahrestourenplaene();

	// Die Hochrechnung ist abgeleitet und deshalb nicht Teil der Sicherung.
	await erzeugeHochrechnungFuerAlle();
}
