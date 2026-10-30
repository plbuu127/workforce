# Company workspaces — 2026-10-29

The original case-based workflow did not implement companies. This update adds separate company spaces while preserving the existing submission, correction, review, resubmission and approval flow. It changes only the independent Workforce service.

## Permissions

| Role | Company administration | Full case content |
|---|---|---|
| Company owner | Invite administrators/reviewers, revoke invitations, remove eligible members, reassign cases | Assigned cases, or own employee cases |
| Administrator | Invite reviewers, revoke reviewer invitations, remove eligible reviewers, reassign cases | Assigned cases, or own employee cases |
| Reviewer | Create company cases assigned to themselves | Assigned cases, or own employee cases |
| Employee | No staff membership or company enumeration | Their own cases, including cases with multiple companies |

Administrators see case labels, status, version, reviewer and whether the employee joined. They do not receive case state, originals, AI readings, employee notes or case exports simply because they are administrators. They can explicitly take assignment of a case; the handoff is recorded. Owners cannot be removed. Before a colleague is removed, all their retained cases must be handed over. Self-test cases cannot be reassigned and must have their files deleted before their creator can be removed.

Team invitation tokens are hashed at rest, single-use, email-bound and valid for 48 hours. Only the owner may grant administrator membership. Employee case invitations remain separate. Neither invitation sends an email or changes the hosting visitor allowlist.

## Data and concurrency

Migrations 0001 and 0002 append company, membership, invitation and activity tables and a nullable company association to cases. Existing rows remain private. No original migration was modified. A unique membership index prevents duplicate membership. Database triggers make company activity append-only and prevent moving an existing case to a different company.

Every case read, file download, audit/export and write checks its employee or its assigned active reviewer. Company administration checks current membership on the server. Staff removal and assignment changes use a company revision and a fresh operation id inside a D1 batch transaction. The case revision is also checked for a handoff; a failed compare-and-swap must not record a successful assignment. Case history and hash-chain audit survive the handoff. An in-flight old reviewer write cannot overwrite a newer assignment.

## Verification

- 72 company assertions use separate synthetic owner, administrator, reviewer, employee and outsider identities for two companies.
- Covered: company enumeration and creation restrictions; administrator scope; exact-email, used, expired and revoked invitations; one employee with cases at both companies; unassigned administrator access denial; cross-company read/write/download/audit/export denial; handoff; former reviewer revocation; historical originals; removal safeguards; immutable company association; append-only logs; CSRF protection and stale revisions.
- The integrated company case uploads image fixtures, receives mocked AI findings, requests changes, changes reviewers, resubmits, receives approval and exports a valid audit. This is integration evidence, **not** new live-model accuracy evidence or a user study.
- Existing 158 workflow/preparation/long-packet/correction assertions and the service-isolation suite also pass.
- Local browser QA: two company workspaces created; company A's case did not appear in company B; company creation, case creation and case overview refresh were exercised through the UI.
- Production deployment/browser checks are recorded in the release evidence after publication.

## Limits

The original company-workspace release preserved the restricted visitor policy. The owner subsequently approved public entry on 2026-10-29: outsiders can sign in and create their own company, while application records still require company/case authorization. Company creation does not verify a business identity. Limits remain 10 owned companies/account, 40 cases/assigned reviewer and existing 20 calls/user/day and 100 calls/Site/day. There is no enterprise SSO, billing, automated mail, SLA, external audit notarization or company ownership-transfer UI. No claim of production enterprise readiness or actual customer usage is made.

## Company entry update

The sidebar now has a dedicated **Company workspaces** route at `/companies`. It opens an available membership by default and shows the setup sequence before the case form. The unauthenticated page explains company and employee entry, without rendering private account data. Known employee/team invitation fragments survive the local sign-in URL construction; the platform authentication round trip must be checked when external sign-in access is enabled. Twenty-four additional onboarding assertions pass.

## Public entry verification

The owner explicitly approved public visitor access on 2026-10-29. Sites returned `access_mode: public`, access revision 2. Anonymous production requests to the app list, company details, an existing case, its audit/export/file routes and company creation are rejected with 401. Supplying invented identity headers also returns 401. The public HTML contains onboarding code and no private demo company names. The existing signed-in owner can still open their company workspace. These checks are targeted access-boundary evidence, not a complete penetration test or security certification.

## Self-service entry — October 30

At the owner's request, no prior company approval is required. A signed-in user enters a company name and team display name, then immediately creates cases and invitations. Previously pending workspaces are usable without any manual status mutation. Company identity is still unverified unless an operator separately verifies it. Creating a same-named company never grants membership in an existing company. Real case files remain limited to the case employee and assigned active reviewer; suspension, rejected-workspace restrictions, recipient-bound invitations, audit records and usage limits remain. The company integration suite now runs its entire two-company submission/review/resubmission flow without operator approval. Its AI responses are explicit mocks, not live-model evidence.
