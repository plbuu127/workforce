CREATE UNIQUE INDEX `workforce_member_identity` ON `workforce_company_members` (`company_id`,`user_id`);--> statement-breakpoint
CREATE TRIGGER workforce_company_events_no_update BEFORE UPDATE ON workforce_company_events BEGIN SELECT RAISE(ABORT,'company_audit_append_only'); END;
--> statement-breakpoint
CREATE TRIGGER workforce_company_events_no_delete BEFORE DELETE ON workforce_company_events BEGIN SELECT RAISE(ABORT,'company_audit_append_only'); END;
--> statement-breakpoint
CREATE TRIGGER workforce_case_company_immutable BEFORE UPDATE OF company_id ON workforce_intake_cases WHEN OLD.company_id IS NOT NEW.company_id BEGIN SELECT RAISE(ABORT,'case_company_immutable'); END;
