CREATE TABLE `arbeitszeit_manual_kuerzungen` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`account_id` text NOT NULL,
	`kuerzung_hundredths` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `arbeitszeit_manual_kuerzungen_employee_id_account_id_unique` ON `arbeitszeit_manual_kuerzungen` (`employee_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `employee` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`employeeId` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assigned_touren` (
	`id` text PRIMARY KEY NOT NULL,
	`datum` integer NOT NULL,
	`employee_id` text NOT NULL,
	`abkuerzung` text,
	`tour_number` integer,
	`tour_suffix` text,
	`aenderung_kommentar` text,
	`schichtdauer` integer,
	`arbeitszeit` integer,
	`bezahlte_zeit` integer,
	`bezahlte_pause` integer,
	`depot` text,
	`last_edited` integer,
	`start_time` integer,
	`end_time` integer,
	FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assigned_touren_employee_id_datum_unique` ON `assigned_touren` (`employee_id`,`datum`);--> statement-breakpoint
CREATE TABLE `zeitkonten_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`captured_at` integer NOT NULL,
	`sap_leave_type_id` text NOT NULL,
	`zeitsaldo_beschreibung` text NOT NULL,
	`anzahl` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `zeitkonten_snapshots_employee_id_snapshot_date_sap_leave_type_id_unique` ON `zeitkonten_snapshots` (`employee_id`,`snapshot_date`,`sap_leave_type_id`);