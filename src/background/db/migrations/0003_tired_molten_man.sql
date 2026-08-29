CREATE TABLE `employee_arbeitsverhaeltnis` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`von` integer NOT NULL,
	`bis` integer,
	`pensum_prozent` integer NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `employee_ferienanspruch` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`jahr` integer NOT NULL,
	`ferien_anspruch_in_tagen` integer NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employee_ferienanspruch_employee_id_jahr_unique` ON `employee_ferienanspruch` (`employee_id`,`jahr`);