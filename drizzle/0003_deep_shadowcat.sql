CREATE TABLE `workforce_demo_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`state_json` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `workforce_companies` ADD `verification_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `workforce_companies` ADD `application_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `workforce_companies` ADD `verification_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `workforce_intake_cases` ADD `invite_email` text;