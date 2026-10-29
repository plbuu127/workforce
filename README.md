# Workforce

Workforce is an independent preparation workspace for foreign employees already in Korea who are changing employers, and their assigned HR reviewers. Its first focused journey is an E-7-1 employee changing jobs. Employees upload actual PDF, JPEG or PNG documents, receive specific preparation findings, replace documents and resubmit. Reviewers compare the cited source pages, request changes or approve a preparation message. Both participants see the same version and audit history.

## Independent service

This repository is a new standalone extraction of the HR document workflow previously developed inside SettleK Navigator. It is not the Build With AI SettleK entry. The Workforce Site has its own source history, hosting identity, D1 database, R2 files, authentication identities and runtime configuration. It does not call either SettleK Site. No prior account records or documents were migrated. The Build With AI application and its submitted repository were not modified by this extraction.

Site: https://workforce.sally127506.chatgpt.site

The owner authorized public visitor access on 2026-10-29. Anyone can open the entry page or the no-sign-in judging demo. Signed-in users may submit a company application; real operations remain locked until the designated operator verifies the company and the authenticated applicant’s authority. Existing companies and employee cases still require server-checked membership or assignment; signing in alone grants no access to them. Employee and team invitations remain single-use. Previous Site invitations do not apply here. The judging demo has separate synthetic session storage and creates no real company, member or intake-case records. Legacy companyless/self-test cases remain stored but are quarantined from the operational workflow.

## Core journey

1. A company applicant provides an official website, contact email and authority explanation. The server records their authenticated account email. The operator independently confirms both the company and that exact applicant’s authority, then records an evidence note and decision. After approval, the owner invites administrators or reviewers using email-bound, single-use team links. Each active colleague can create a case in that company as its assigned reviewer. The reviewer enters the employee’s sign-in email and shares a separate 48-hour invitation. A wrong or missing email cannot claim it. Renewing a link also requires a recipient.
2. The employee signs in and confirms location, employment change, reported status, intended job and whether duties change. The focused E-7-1 path also asks about foreigner registration and how the previous job ended; consent preparation changes to transition evidence only for reported exception circumstances. The shared plan separates employee documents from company checks; unknown answers remain questions. The employee uploads a contract and stay document. The reviewer uploads company joining details. Residence evidence is optional.
3. With explicit consent, rendered document pages are sent to the NVIDIA vision model on Nebius. Findings include missing documents or fields, readability, signature observations and differences in start dates, employer names and job titles across contract and company pages.
4. Each finding includes an action owner and relevant page evidence. AI-assisted English guidance is a draft for review. Official references are curated links, not a live legal search.
5. The reviewer compares originals side by side, records employer/transition/procedure checks and edits the message, or requests a replacement. Re-submission creates a new version and compares resolved, remaining and unconfirmed findings.
6. Role-owned preparation records track identity-document readiness, the transition, company registry, employment necessity and exact occupation/procedure confirmation. Required records cannot be skipped. A deferred external step requires a reviewer resolution and remains visible after review. Review completion requires explicit original, findings and guidance checks. The audit log records the current version and changes. The employee can download a readable preparation summary with next steps plus a JSON audit record. No immigration filing or external message is sent.

## Actual AI and setup

- Vision: `nvidia/Nemotron-3.5-Super-VL`.
- Guidance: `nvidia/nemotron-3-super-120b-a12b`.
- Endpoint: `https://api.tokenfactory.nebius.com/v1/chat/completions`.
- In this Site's runtime environment, configure `NEBIUS_API_KEY` as a **secret** and `NEBIUS_AI_ENABLED=true`, then deploy a version to apply the configuration. Never put keys in the repository, browser code or chat.
- Set `WORKFORCE_OPERATOR_USER_ID` to the stable Sites-authenticated account ID of the explicitly designated operator as a server secret. There is no first-user bootstrap or client-side operator switch. The operator page is `/operator`; company owners cannot self-approve. Never set this value from an incoming application.
- Live inference on this independent Site was verified on 2026-10-28. Its server secret uses an existing authorized provider credential: the provider account and quota are shared, while application data and hosting remain separate. The credential is excluded from source and browser code. An unconfigured installation reports AI unavailable and rejects analysis. There is no fake successful AI fallback.
- If AI wording fails validation, the UI presents the existing checked actions by owner with a clear rule-based label. It retains the failure and never pretends that model generation succeeded.
- Model response IDs, model names, latency and token usage are shown for successful actual calls. When there are no findings, the ready-for-review message is generated by workflow code and labeled accordingly; no guidance model call is claimed.
- Hosting and storage use Sites/Cloudflare; Nebius is used for inference, not compute hosting.

## Try the guided workflow

Open [the live judging demo](https://workforce.sally127506.chatgpt.site/demo). No login or company approval is required:

1. Select **Start my demo**, inspect the three fictional PDF/photo originals, check consent and select **Submit samples & run live AI**.
2. Open **Reviewer view**, inspect source evidence and select **Request corrected documents**.
3. Return to **Employee view**, consent and select **Submit signed sample & analyze**. Compare the resolved signature finding with the remaining date conflicts.
4. Request changes again in **Reviewer view**, then use **Submit corrected samples & analyze** in **Employee view**.
5. In **Reviewer view**, compare the corrected originals and findings, check the demo review confirmation and select **Complete sample review**. Open the activity and live execution details.

Each role sees its next action first, followed by its findings and original documents. Extracted facts, official references and execution receipts can be expanded. After review, all status text reflects the completed decision. **Start over** asks for confirmation and restores only the fictional sample packet; it retains the session expiry, analysis attempts, guidance attempts and daily quotas. It cannot interrupt an active analysis.

The sandbox accepts only fixed server-selected fictional samples. It cannot accept arbitrary uploads, company identifiers, external document URLs, invitations or membership changes. Each browser receives a separate six-hour HttpOnly session; expired rows are removed on a later session start. The scenario reminder uses 28 October 2026, clearly labeled. There is no prerecorded successful model fallback. If the guidance provider fails, curated official references and document findings remain visible, and a consented **Retry English draft** makes a separately metered request. The zero-finding message is explicitly a workflow status. Trying both roles in one browser is a demonstration, not a two-user study.

Real document uploads and the full profile/checklist/correction workflow remain in approved companies. Public demo budget: at most 12 model calls per source IP per Korea calendar day, 60 across demo visitors, six analysis attempts per session. Demo calls also consume the existing 100-call Site-wide ceiling. These limits and provider quotas can temporarily prevent new analysis; saved demo results remain readable until the session expires.

On 2026-10-29, the production sandbox completed the original → signed-only → corrected sequence using actual NVIDIA/Nebius calls: four checks, three remaining checks, then zero internal document findings and a sample reviewer completion with 14 activity events. The first guidance request was rejected by the provider; a separately metered guidance retry succeeded. Both vision and guidance HTTP 200 receipts were inspected. This was an agent-operated synthetic acceptance test, not an external user study.

The October 29 update supports 12-page originals and 16-page packets. Vision runs in groups of four, charges the quota for each call, retains every response receipt and withholds conflicting values across groups. Eight new, pre-labeled synthetic robustness cases passed on their first live run: 24/24 target fields, all four expected findings, no extra findings, 13 provider requests. These tests are limited acceptance evidence, not real-document accuracy. [Results and limitations](docs/robustness-evaluation.md).

The reviewer now records three company preparation notes once, confirms the employee’s existing transition record, and saves the complete draft or decision in one action. Extracted facts and the occupation-route note are reused in the summary; they are never automatically attested. A changed document invalidates the draft. A changed employee transition note clears the corresponding reviewer attestation.

## Run locally

Requires Node.js 24 and pnpm 11.25.0.

```sh
pnpm install
pnpm build
pnpm test
pnpm validate
pnpm dev
```

The loopback-only preview runs at `http://127.0.0.1:4190`. Preview identities and storage are separate from production; no real model is called by default. For an explicitly opted-in local live check, place the key in an ignored `.env.nebius.local` and run `WORKFORCE_PREVIEW_AI=1 pnpm dev`. Do not commit that file. Local storage lives in ignored `.preview-data/`.

For a bounded live evaluation, set `WORKFORCE_ENV_FILE` to an ignored server-only env file and run `pnpm eval:live`. It makes at most 16 real vision calls, never automatically retries, and writes an ignored `.eval-results/` report. The test files contain fictional information only. Add `--robustness` to `node scripts/evaluate-preparation.mjs --live` for the eight new robustness cases (13 planned vision requests); no automatic retries.

The schema is in `db/schema.ts`. Generate migrations with `pnpm db:generate` when changing it. The local adapter applies migrations to its own SQLite database; Sites applies the migration bundle to the separate hosted D1 database.

## Verification and current limits

`pnpm test` runs 45 workflow, 55 preparation, 18 long-packet, 40 correction/context and 74 company assertions with a **mocked AI transport**, plus 24 onboarding and 78 approval/demo assertions and a separate service-isolation suite. They cover two logical identities, uploads, corrections, version invalidation, access denial, audit integrity, deletion, evidence validation, provider failure and an unconfigured AI state. They are not live-model accuracy measurements or a foreign-user study.

On 2026-10-28, two distinct signed-in accounts completed this independent production workflow: employee PDF/photo upload, live NVIDIA analysis, reviewer change request, signed-document replacement, live reanalysis, approval and employee export. The signature finding was resolved and all 11 audit events verified. These were fictional documents used in technical acceptance testing, not a real-user study or a legal-accuracy benchmark. See [verification](docs/verification.md) and [redacted execution evidence](docs/live-verification.json).

A separate 12-packet live NVIDIA evaluation covers clean, missing, unreadable, Korean, multipage, mismatched employer/role and partial-correction cases. The first run passed 11/12; it exposed an aggregate-date grounding issue that was fixed using validated contract-page observations. The release rerun passed 12/12, with 36/36 target fields and all 16 expected findings, without extras. These are small, authored synthetic acceptance tests, not an estimate of real-document accuracy. See [evaluation methodology and both runs](docs/preparation-evaluation.md).


The 2026-10-29 improvement adds an action-first employee screen, a condition-dependent E-7-1 preparation checklist, source-backed reviewer facts and explicit verification confirmations, and version-bound external follow-up records. See the [official source map](docs/e7-source-map.md) and [live browser verification](docs/e7-browser-verification.json). This remains preparation assistance; extra checklist evidence is recorded by its owner, not uploaded and automatically verified by the model.

A paired agent-operated measurement used the same initial/corrected synthetic packet. Both arms recorded 18/18 facts with no missed expected findings. Manual transcription required 18 field entries; AI-assisted verification required no field edits. Combined time was 55.6 vs 52.4 seconds including AI processing; this small, tool-dependent difference is **not** human productivity evidence. No reduction in follow-up rounds was demonstrated. [Raw measurement and limitations](docs/workflow-measurement.md).

See the [2:45 English demo plan](docs/hackathon/DEMO-PLAN.md) and [submission checklist](docs/hackathon/SUBMISSION-CHECKLIST.md). The name remains provisional. Public source: https://github.com/plbuu127/workforce. Video and final submission remain pending. Judges can open `/demo` without an account. Company applications and real cases follow the approval workflow.

- PDF/JPEG/PNG only; 10 MB per original, 12 pages per file, 16 pages per case, 4 document categories, 10 versions. Original files and rendered page images are stored privately.
- 20 model calls per user per Korea calendar day and 100 for the Site; provider quotas can be lower.
- The client renders PDF pages. Server-side cryptographic correspondence between submitted originals and their rendered images is not implemented.
- A matching quote in the model's transcription is not independent OCR verification. Signature presence is not signature authenticity. No employer, work authorization or immigration eligibility decision is made.
- The situation plan is deterministic and deliberately limited. It does not provide a complete statutory E-7 checklist. Employer/role wording differences trigger review; document AI does not verify employer identity or semantic equivalence. Company access uses a separate manual verification process.
- Curated official sources require current confirmation for an individual's situation. A completed preparation review is not immigration approval or permission to work.
- One currently assigned reviewer and one employee per case, inside a company workspace. Administrators can hand over a case with its history. Billing, enterprise SSO, automatic email notifications and government filing are not implemented. Company applications begin as self-declared claims. A designated human operator must verify the company and applicant before operational access; no automatic registry or identity-provider verification is implemented.
- File deletion removes document versions and analysis; minimal audit events and recorded review messages remain. The hash chain is checked within the database, not independently notarized.

MIT-licensed project code. See `THIRD_PARTY_NOTICES.md` for dependencies and model licenses.

## Reviewer corrections and employee situation notes

The existing submission → review → changes → resubmission → approval workflow is retained. Reviewers can correct a misread status, expiry, contract start, per-page company start, employer or job title against a cited original page. Each correction records the previous and corrected values, quote, reason, actor hash and time. Original images and the original model reading remain available. Findings are recalculated without a new vision call; previous reviewer confirmations and AI wording are invalidated. Restoring the original AI value appends an event. A correction after approval creates a new version while preserving the approved snapshot.

Employees can save a bounded situation note and indicate whether the agreed start is uncertain, an updated contract is awaited, or an updated contract was submitted. These are labelled unverified reports and never overwrite document fields. Situation-dependent tasks are rule-based. An explicit consent action regenerates an English draft with NVIDIA on Nebius using the report and current findings; provider failures leave labelled checked actions. This is not a chatbot, an automated legal decision, or a messaging service.

`npm test` includes separate-identity correction/context tests. `scripts/seed-correction-preview.mjs` is an optional loopback-only QA fixture that injects a clearly labelled artificial transcription error into a copy of existing fictional preview files. It is not a live model accuracy result. `WORKFORCE_ENV_FILE=/absolute/ignored/env-file node scripts/evaluate-case-updates.mjs --live` optionally makes four text-model requests with fictional situations, no automatic retries, and records the responses.

## Company workspaces

Open **Company** (or `/companies`), enter your display name and submit the company application. Existing unverified companies also require review; none are automatically marked verified. Use **Workspace** to switch between companies and all your cases. Company owners can invite administrators or reviewers; other administrators can invite reviewers. A team invitation can only be accepted by its named sign-in email and expires after 48 hours. No email is sent automatically.

Administrators see company case labels, stages and assignments. They do not automatically receive originals, AI readings or review notes from unassigned cases. An administrator may explicitly assign a case to themselves or another active colleague; this is recorded in both the case hash chain and append-only company activity log. The previous reviewer immediately loses case, file and export access. A colleague must hand over all retained cases before their membership is removed. The company owner cannot be removed. Legacy self-test cases are quarantined; use `/demo` for a sample walkthrough.

An employee can participate in cases for several companies using one account, without becoming a staff member of any company. Each company only sees its own case. Documents are never reused across companies automatically. Earlier companyless cases are preserved but locked and are not silently moved into a company.

The application supports separate company workspaces and public sign-in entry. App membership and visitor access are separate: company records, documents and audit exports are never anonymous endpoints. Existing AI quotas remain Site-wide; this is a multi-company MVP, not a production-scale enterprise service. [Design and verification](docs/company-workspaces.md).

## Company entry and sign-in

`/companies` opens the company workspace directly. **My work** opens the signed-in person's cases across companies. The dashboard shows a next action, a visible **Try live demo** entry and case-status filters. **New employee case** opens the creation form on demand. Administrators use separate **Team** and **Assignments** tabs for invitations and assignments. Visitors without a session see company and employee sign-in options; all company, case, original-file and audit APIs still require identity and authorization. Company and employee invitation fragments are preserved in an allowlisted same-origin sign-in return path. No public company directory is exposed.

24 onboarding assertions verify anonymous access denial, no anonymous writes and invitation return paths. Combined with the 230 existing assertions and the service-isolation suite, all checks pass. Browser QA used local synthetic identity and anonymous modes. The owner separately approved public visitor access on 2026-10-29. Production HTTP checks confirmed that anonymous requests to company/case/file/audit/export APIs are rejected, including a request carrying forged identity headers.

## Task-focused interface

Each case has four sections: **Next steps**, **Documents**, **Findings** (employees) / **Review** (reviewers), and **History**. Action buttons open the right section and form. Switching sections preserves unsaved inputs; switching cases or company workspaces asks before discarding them. AI field details, company checks, and execution records are available on demand. Employee preparation items remain visible when they are the next pending task. The responsive navigation retains both **My work** and **Company**. These presentation changes do not alter server authorization, AI models, consent, quotas, or stored case records.

## Company access operations

At `/operator`, the designated account sees the authenticated applicant email and stable account reference separately from the applicant-provided company contact. Independently locate the company’s official contact and confirm that exact applicant’s authority; do not treat an applicant-provided website or a matching domain alone as proof. Record the sources, method, date and confirmation in the decision note. Do not paste identity documents or secrets. No verification email is sent by this MVP. Approval, rejection and suspension are recorded in company activity history.

Unverified or suspended companies cannot create real cases, issue or accept staff/employee invitations, access case files/history/exports or process changes. Approval is checked at both access and write boundaries. Existing records are retained while locked. Applications missing authenticated applicant email must be resubmitted by their signed-in owner before approval. Existing unbound employee links must be renewed with the recipient email after company approval.

## Source provenance

This public release is a source snapshot of the independent hosted Workforce project at commit `0a297164c8bca23f60c4538ba7109c94c6286741` (deployed version 22), with submission-document updates. Runtime source and synthetic test assets are included; server secrets, local databases, private account records and internal Git history are excluded. This publication date is not the start date of development. The workflow was developed earlier in SettleK Navigator and substantially extended as described above.
