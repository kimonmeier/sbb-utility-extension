import type { SopreDepot, SopreTourType } from "../api/types/sopretypes";
import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const employee = sqliteTable("employee", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  employeeId: text("employeeId").notNull(),
});

export type SBBUtilityTouren = typeof touren.$inferInsert;

export type SBBUtilityZeitkontoSnapshot =
  typeof zeitkontenSnapshots.$inferInsert;

export const touren = sqliteTable(
  "assigned_touren",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    datum: integer("datum").notNull(),
    employee: text("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "cascade" }),
    abkuerzung: text("abkuerzung").$type<SopreTourType>(),
    tourNumber: integer("tour_number"),
    tourSuffix: text("tour_suffix"),
    aenderungKommentar: text("aenderung_kommentar"),
    schichtdauer: integer("schichtdauer"),
    arbeitszeit: integer("arbeitszeit"),
    bezahlteZeit: integer("bezahlte_zeit"),
    bezahltePause: integer("bezahlte_pause"),
    depot: text("depot").$type<SopreDepot>(),
    lastEdited: integer("last_edited", { mode: "timestamp" }),
    startTime: integer("start_time", { mode: "timestamp" }),
    endTime: integer("end_time", { mode: "timestamp" }),
  },
  (table) => [unique().on(table.employee, table.datum)],
);

export const zeitkontenSnapshots = sqliteTable(
  "zeitkonten_snapshots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    employee: text("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "cascade" }),
    snapshotDate: text("snapshot_date").notNull(),
    capturedAt: integer("captured_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    sapLeaveTypeId: text("sap_leave_type_id").notNull(),
    zeitsaldoBeschreibung: text("zeitsaldo_beschreibung").notNull(),
    anzahl: text("anzahl").notNull(),
  },
  (table) => [
    unique().on(table.employee, table.snapshotDate, table.sapLeaveTypeId),
  ],
);

export const arbeitszeitManualKuerzungen = sqliteTable(
  "arbeitszeit_manual_kuerzungen",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    employee: text("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    kuerzungHundredths: integer("kuerzung_hundredths").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [unique().on(table.employee, table.accountId)],
);