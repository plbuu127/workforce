import { integer, sqliteTable, text, index, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";

export const intakeCases = sqliteTable("workforce_intake_cases", {
  id: text("id").primaryKey(), reviewerId: text("reviewer_id").notNull(), employeeId: text("employee_id"),
  companyId: text("company_id"),
  inviteEmail: text("invite_email"), inviteHash: text("invite_hash"), inviteExpires: text("invite_expires"),
  revision: integer("revision").notNull(), state: text("state_json").notNull(),
  event: text("event_json").notNull(), previousHash: text("previous_hash").notNull(), eventHash: text("event_hash").notNull(),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, t => [index("workforce_intake_reviewer").on(t.reviewerId, t.updatedAt), index("workforce_intake_employee").on(t.employeeId, t.updatedAt), index("workforce_intake_company").on(t.companyId, t.updatedAt)]);
export const intakeAudit = sqliteTable("workforce_intake_audit", {
  caseId: text("case_id").notNull(), revision: integer("revision").notNull(),
  event: text("event_json").notNull(), previousHash: text("previous_hash").notNull(), eventHash: text("event_hash").notNull(),
}, t => [primaryKey({columns:[t.caseId,t.revision]})]);

export const aiUsage = sqliteTable("workforce_ai_usage", {
  scope: text("scope").primaryKey(),
  day: text("day").notNull(),
  calls: integer("calls").notNull().default(0),
});


export const companies = sqliteTable("workforce_companies", {
 applicantEmail:text("applicant_email"), verificationStatus: text("verification_status").notNull().default("pending"), application: text("application_json").notNull().default("{}"), verification: text("verification_json").notNull().default("{}"),
 id: text("id").primaryKey(), name: text("name").notNull(), ownerId: text("owner_id").notNull(),
 revision: integer("revision").notNull().default(1), operationId: text("operation_id").notNull(), createdAt: text("created_at").notNull(),
});
export const members = sqliteTable("workforce_company_members", {
 id: text("id").primaryKey(), companyId: text("company_id").notNull(), userId: text("user_id").notNull(),
 name: text("name").notNull(), role: text("role").notNull(), active: integer("active").notNull().default(1), createdAt: text("created_at").notNull(),
}, t => [index("workforce_member_user").on(t.userId, t.active), index("workforce_member_company").on(t.companyId, t.active), uniqueIndex("workforce_member_identity").on(t.companyId, t.userId)]);
export const companyInvites = sqliteTable("workforce_company_invites", {
 id: text("id").primaryKey(), companyId: text("company_id").notNull(), tokenHash: text("token_hash").notNull(),
 email: text("email").notNull(), role: text("role").notNull(), expiresAt: text("expires_at").notNull(),
 usedAt: text("used_at"), revokedAt: text("revoked_at"), createdAt: text("created_at").notNull(),
}, t => [index("workforce_invite_token").on(t.tokenHash), index("workforce_invite_company").on(t.companyId)]);
export const companyEvents = sqliteTable("workforce_company_events", {
 id: text("id").primaryKey(), companyId: text("company_id").notNull(), revision: integer("revision").notNull(),
 action: text("action").notNull(), actor: text("actor").notNull(), detail: text("detail_json").notNull(), at: text("at").notNull(),
}, t => [index("workforce_events_company").on(t.companyId, t.revision)]);

export const demoSessions = sqliteTable("workforce_demo_sessions", {tokenHash:text("token_hash").primaryKey(), revision:integer("revision").notNull(), state:text("state_json").notNull(), expiresAt:text("expires_at").notNull(), createdAt:text("created_at").notNull()});
