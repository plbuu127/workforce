CREATE TABLE `workforce_companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`operation_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workforce_company_events` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`revision` integer NOT NULL,
	`action` text NOT NULL,
	`actor` text NOT NULL,
	`detail_json` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workforce_events_company` ON `workforce_company_events` (`company_id`,`revision`);--> statement-breakpoint
CREATE TABLE `workforce_company_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`revoked_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workforce_invite_token` ON `workforce_company_invites` (`token_hash`);--> statement-breakpoint
CREATE INDEX `workforce_invite_company` ON `workforce_company_invites` (`company_id`);--> statement-breakpoint
CREATE TABLE `workforce_company_members` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workforce_member_user` ON `workforce_company_members` (`user_id`,`active`);--> statement-breakpoint
CREATE INDEX `workforce_member_company` ON `workforce_company_members` (`company_id`,`active`);--> statement-breakpoint
ALTER TABLE `workforce_intake_cases` ADD `company_id` text;--> statement-breakpoint
CREATE INDEX `workforce_intake_company` ON `workforce_intake_cases` (`company_id`,`updated_at`);