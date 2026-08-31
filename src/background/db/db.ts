import { sql } from 'drizzle-orm';
import { SQLocalDrizzle } from 'sqlocal/drizzle';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import journal from './migrations/meta/_journal.json';
import * as schema from './schema';
import { seedJahrestourenplaene } from './jahrestourenplan';

// 1. Vite inlines all .sql files as strings at build time
const migrationFiles = import.meta.glob('./migrations/*.sql', {
	query: '?raw',
	import: 'default',
	eager: true
});

// 2. Initialize SQLocal (handles the Web Worker and OPFS automatically)
export const client = new SQLocalDrizzle('sbb-utility.sqlite');

// 3. Connect Drizzle via the proxy driver
export const db = drizzle(client.driver, client.batchDriver, {
	logger: true,
	schema
});

export async function initDatabaseAndMigrate() {
	console.log('Initializing database and applying migrations...');
	console.log('Following files were found', migrationFiles);

	// Create the Drizzle migrations tracking table
	await db.run(sql`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drizzle_tag TEXT NOT NULL,
      created_at NUMERIC
    )
  `);

	// Get already applied migrations
	const appliedMigrations = await db.all(sql`SELECT drizzle_tag FROM __drizzle_migrations`);

	// Loop through the journal and apply missing migrations
	for (const entry of journal.entries) {
		if (!appliedMigrations.find((appliedTag) => appliedTag == entry.tag)) {
			const sqlString = migrationFiles[`./migrations/${entry.tag}.sql`] as string;

			// Execute the raw SQL migration
			await db.run(sql.raw(sqlString));

			// Mark as applied
			await db.run(sql`
        INSERT INTO __drizzle_migrations (drizzle_tag, created_at) 
        VALUES (${entry.tag}, strftime('%s', 'now'))
      `);

			console.log(`✅ Applied migration: ${entry.tag}`);
		}
	}

	// Die mitgelieferten Jahrestourenplaene gehoeren zum Auslieferungsstand und
	// werden bei jedem Start abgeglichen -- auch nach einem Reset oder Import.
	await seedJahrestourenplaene();

	console.log('Database ready & fully migrated!');
	return db;
}
