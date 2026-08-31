import type { SopreDepot, SopreTourType } from '$background/api/types/sopretypes';
import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export const employee = sqliteTable('employee', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name').notNull(),
	employeeId: text('employeeId').notNull()
});

export type SBBUtilityTouren = typeof touren.$inferInsert;

export type SBBUtilityZeitkontoSnapshot = typeof zeitkontenSnapshots.$inferInsert;

export const touren = sqliteTable(
	'assigned_touren',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		datum: integer('datum', { mode: 'timestamp' }).notNull(),
		employee: text('employee_id')
			.notNull()
			.references(() => employee.id, { onDelete: 'cascade' }),
		abkuerzung: text('abkuerzung').$type<SopreTourType>(),
		tourNumber: integer('tour_number'),
		tourSuffix: text('tour_suffix'),
		aenderungKommentar: text('aenderung_kommentar'),
		schichtdauer: integer('schichtdauer'),
		arbeitszeit: integer('arbeitszeit'),
		bezahlteZeit: integer('bezahlte_zeit'),
		bezahltePause: integer('bezahlte_pause'),
		depot: text('depot').$type<SopreDepot>(),
		lastEdited: integer('last_edited', { mode: 'timestamp' }),
		startTime: integer('start_time', { mode: 'timestamp' }),
		endTime: integer('end_time', { mode: 'timestamp' })
	},
	(table) => [unique().on(table.employee, table.datum)]
);

export const zeitkontenSnapshots = sqliteTable(
	'zeitkonten_snapshots',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		employee: text('employee_id')
			.notNull()
			.references(() => employee.id, { onDelete: 'cascade' }),
		snapshotDate: text('snapshot_date').notNull(),
		capturedAt: integer('captured_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date()),
		sapLeaveTypeId: text('sap_leave_type_id').notNull(),
		zeitsaldoBeschreibung: text('zeitsaldo_beschreibung').notNull(),
		anzahl: text('anzahl').notNull()
	},
	(table) => [unique().on(table.employee, table.snapshotDate, table.sapLeaveTypeId)]
);

export type SBBUtilityEmployeeFerienanspruch = typeof employeeFerienanspruch.$inferInsert;

export const employeeFerienanspruch = sqliteTable(
	'employee_ferienanspruch',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		employee: text('employee_id')
			.notNull()
			.references(() => employee.id, { onDelete: 'cascade' }),
		jahr: integer('jahr').notNull(),
		ferienAnspruchInTagen: integer('ferien_anspruch_in_tagen').notNull()
	},
	(table) => [unique().on(table.employee, table.jahr)]
);

export type SBBUtilityEmployeeArbeitsverhaeltnis = typeof employeeArbeitsverhaeltnis.$inferInsert;

export const employeeArbeitsverhaeltnis = sqliteTable('employee_arbeitsverhaeltnis', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	employee: text('employee_id')
		.notNull()
		.references(() => employee.id, { onDelete: 'cascade' }),
	von: integer('von', { mode: 'timestamp' }).notNull(),
	bis: integer('bis', { mode: 'timestamp' }),
	pensumProzent: integer('pensum_prozent').notNull()
});

export const arbeitszeitManualKuerzungen = sqliteTable(
	'arbeitszeit_manual_kuerzungen',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		employee: text('employee_id')
			.notNull()
			.references(() => employee.id, { onDelete: 'cascade' }),
		accountId: text('account_id').notNull(),
		kuerzungHundredths: integer('kuerzung_hundredths').notNull().default(0),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [unique().on(table.employee, table.accountId)]
);

/** Woher die Linien-Zuweisung stammt. MANUAL wird vom Sync nie ueberschrieben. */
export type LinienZuweisungQuelle = 'AUTO' | 'MANUAL';

export type SBBUtilityJahrestourenplan = typeof jahrestourenplan.$inferInsert;

/**
 * Ein Jahrestourenplan pro Depot, Gruppe und Jahr. Die "Wochenfolge"-Tabelle
 * des Plans (Linie x Kalenderwoche) wird nicht gespeichert: sie ist eine reine
 * zyklische Verschiebung und ergibt sich aus zyklusLaenge und gueltigVon.
 */
export const jahrestourenplan = sqliteTable(
	'jahrestourenplan',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		depot: text('depot').$type<SopreDepot>().notNull(),
		gruppe: text('gruppe').notNull(),
		wochenschema: text('wochenschema').notNull(),
		jahr: integer('jahr').notNull(),
		gueltigVon: integer('gueltig_von', { mode: 'timestamp' }).notNull(),
		gueltigBis: integer('gueltig_bis', { mode: 'timestamp' }).notNull(),
		zyklusLaenge: integer('zyklus_laenge').notNull()
	},
	(table) => [unique().on(table.depot, table.gruppe, table.jahr)]
);

export type SBBUtilityJahrestourenplanWoche = typeof jahrestourenplanWoche.$inferInsert;

/** Das Wochenschema-Raster: pro Wochenfolge ein Eintrag je Wochentag. */
export const jahrestourenplanWoche = sqliteTable(
	'jahrestourenplan_woche',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		plan: text('plan_id')
			.notNull()
			.references(() => jahrestourenplan.id, { onDelete: 'cascade' }),
		wochenfolge: integer('wochenfolge').notNull(),
		/** 0 = Sonntag .. 6 = Samstag, wie Date#getUTCDay. */
		wochentag: integer('wochentag').notNull(),
		/** Rohwert aus dem Plan: eine Tournummer oder "RT" / "CT" / "RES". */
		eintrag: text('eintrag').notNull(),
		abkuerzung: text('abkuerzung').$type<SopreTourType>(),
		tourNumber: integer('tour_number')
	},
	(table) => [unique().on(table.plan, table.wochenfolge, table.wochentag)]
);

export type SBBUtilityEmployeeLinie = typeof employeeLinie.$inferInsert;

/** Zuweisung eines Mitarbeiters auf eine Linie, pro Kalenderjahr. */
export const employeeLinie = sqliteTable(
	'employee_linie',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		employee: text('employee_id')
			.notNull()
			.references(() => employee.id, { onDelete: 'cascade' }),
		jahr: integer('jahr').notNull(),
		plan: text('plan_id')
			.notNull()
			.references(() => jahrestourenplan.id, { onDelete: 'cascade' }),
		linie: integer('linie').notNull(),
		quelle: text('quelle').$type<LinienZuweisungQuelle>().notNull().default('AUTO'),
		/** Trefferquote der Erkennung in Prozent; nur bei quelle = AUTO gesetzt. */
		trefferquote: integer('trefferquote'),
		erkanntAm: integer('erkannt_am', { mode: 'timestamp' })
	},
	(table) => [unique().on(table.employee, table.jahr)]
);

export type SBBUtilityHochrechnungTour = typeof hochrechnungTouren.$inferInsert;

/**
 * Hochgerechnete Tage fuer den Zeitraum, den die SBB noch nicht publiziert hat.
 * Abgeleitete Daten: werden nach jedem Sync und nach jeder Aenderung der
 * Zuweisung fuer (employee, jahr) komplett neu erzeugt.
 */
export const hochrechnungTouren = sqliteTable(
	'hochrechnung_touren',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		employee: text('employee_id')
			.notNull()
			.references(() => employee.id, { onDelete: 'cascade' }),
		jahr: integer('jahr').notNull(),
		datum: integer('datum', { mode: 'timestamp' }).notNull(),
		abkuerzung: text('abkuerzung').$type<SopreTourType>(),
		tourNumber: integer('tour_number'),
		linie: integer('linie').notNull(),
		wochenfolge: integer('wochenfolge').notNull(),
		wochentag: integer('wochentag').notNull(),
		generiertAm: integer('generiert_am', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(table) => [unique().on(table.employee, table.datum)]
);
