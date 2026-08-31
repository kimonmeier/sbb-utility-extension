CREATE TABLE `employee_linie` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`jahr` integer NOT NULL,
	`plan_id` text NOT NULL,
	`linie` integer NOT NULL,
	`quelle` text DEFAULT 'AUTO' NOT NULL,
	`trefferquote` integer,
	`erkannt_am` integer,
	FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `jahrestourenplan`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employee_linie_employee_id_jahr_unique` ON `employee_linie` (`employee_id`,`jahr`);--> statement-breakpoint
CREATE TABLE `hochrechnung_touren` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`jahr` integer NOT NULL,
	`datum` integer NOT NULL,
	`abkuerzung` text,
	`tour_number` integer,
	`linie` integer NOT NULL,
	`wochenfolge` integer NOT NULL,
	`wochentag` integer NOT NULL,
	`generiert_am` integer NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hochrechnung_touren_employee_id_datum_unique` ON `hochrechnung_touren` (`employee_id`,`datum`);--> statement-breakpoint
CREATE TABLE `jahrestourenplan` (
	`id` text PRIMARY KEY NOT NULL,
	`depot` text NOT NULL,
	`gruppe` text NOT NULL,
	`wochenschema` text NOT NULL,
	`jahr` integer NOT NULL,
	`gueltig_von` integer NOT NULL,
	`gueltig_bis` integer NOT NULL,
	`zyklus_laenge` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jahrestourenplan_depot_gruppe_jahr_unique` ON `jahrestourenplan` (`depot`,`gruppe`,`jahr`);--> statement-breakpoint
CREATE TABLE `jahrestourenplan_woche` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`wochenfolge` integer NOT NULL,
	`wochentag` integer NOT NULL,
	`eintrag` text NOT NULL,
	`abkuerzung` text,
	`tour_number` integer,
	FOREIGN KEY (`plan_id`) REFERENCES `jahrestourenplan`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jahrestourenplan_woche_plan_id_wochenfolge_wochentag_unique` ON `jahrestourenplan_woche` (`plan_id`,`wochenfolge`,`wochentag`);