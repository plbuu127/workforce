CREATE TABLE `workforce_ai_usage` (
	`scope` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`calls` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workforce_intake_audit` (
	`case_id` text NOT NULL,
	`revision` integer NOT NULL,
	`event_json` text NOT NULL,
	`previous_hash` text NOT NULL,
	`event_hash` text NOT NULL,
	PRIMARY KEY(`case_id`, `revision`)
);
--> statement-breakpoint
CREATE TABLE `workforce_intake_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`reviewer_id` text NOT NULL,
	`employee_id` text,
	`invite_hash` text,
	`invite_expires` text,
	`revision` integer NOT NULL,
	`state_json` text NOT NULL,
	`event_json` text NOT NULL,
	`previous_hash` text NOT NULL,
	`event_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workforce_intake_reviewer` ON `workforce_intake_cases` (`reviewer_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `workforce_intake_employee` ON `workforce_intake_cases` (`employee_id`,`updated_at`);
--> statement-breakpoint
CREATE TRIGGER workforce_intake_insert AFTER INSERT ON workforce_intake_cases BEGIN
 INSERT INTO workforce_intake_audit VALUES (NEW.id,NEW.revision,NEW.event_json,NEW.previous_hash,NEW.event_hash);
END;
--> statement-breakpoint
CREATE TRIGGER workforce_intake_update AFTER UPDATE ON workforce_intake_cases BEGIN
 INSERT INTO workforce_intake_audit VALUES (NEW.id,NEW.revision,NEW.event_json,NEW.previous_hash,NEW.event_hash);
END;
--> statement-breakpoint
CREATE TRIGGER workforce_intake_audit_no_update BEFORE UPDATE ON workforce_intake_audit BEGIN SELECT RAISE(ABORT,'audit_append_only'); END;
--> statement-breakpoint
CREATE TRIGGER workforce_intake_audit_no_delete BEFORE DELETE ON workforce_intake_audit BEGIN SELECT RAISE(ABORT,'audit_append_only'); END;
