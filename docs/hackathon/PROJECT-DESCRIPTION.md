# Workforce — project description draft

Workforce helps foreign employees already in Korea prepare a job change together with their hiring company. Its first focused journey is an E-7-1 employee moving to a new employer. Employees see what they need to provide and what the company must confirm, instead of receiving an unexplained request for more paperwork.

The employee describes the change and uploads a real PDF or photograph of a contract and stay information. The company contributes its joining details. NVIDIA Nemotron vision, called through Nebius Token Factory, reads the actual pages and extracts source-linked dates, employer names, roles and signature observations. The application checks the observations, compares documents and assigns each finding to the appropriate person. A second NVIDIA model drafts English next steps when findings require action.

A reviewer can compare cited originals side by side. If only a signature is corrected, unrelated date conflicts remain visible after fresh inference. Missing or unreadable replacement evidence is marked unconfirmed instead of resolved. Company checks record the employer, previous-employment transition and the applicable procedure with its source and next step. Approval applies only to the reviewed version. The employee can download a readable preparation summary and a JSON audit record.

The focused preparation checklist changes when the employee reports completing the previous contract, reaching a mutually agreed last day, workplace closure, or an early departure. Each item links to its official basis and has a responsible person and evidence/follow-up note. The app distinguishes preparation completeness from unresolved external procedural checks, including after review. A combined reviewer form reuses the extracted facts and the employee’s transition record. The company records its evidence and procedure once, then saves a version-bound draft or decision without automatically attesting to verification.

## Demonstrated results

The earlier independent deployment completed a real two-account technical acceptance test: upload, live analysis, correction request, replacement, reanalysis, approval and employee export. All 11 audit events verified. This used fictional documents, not a foreign-user study.

The new situation-specific extension is covered by 55 preparation assertions with mocked transport and a browser self-test with real inference. A separate live vision evaluation uses twelve authored synthetic document packets: missing and unreadable pages, Korean information, a two-page contract, date conflicts, employer/role mismatches, and partial corrections. The first run passed 11/12 and revealed an aggregate-date grounding issue. After a contract-page validation fix, the release regression run passed 12/12, with 36/36 target fields and all 16 expected findings without extras. Both runs are retained. This small development evaluation is not a universal accuracy claim.

A local paired check compared manual entry and AI-assisted verification for the same initial/corrected synthetic packet. Both recorded 18/18 fact fields, found all four initial issues and grouped them in one batch. Manual entry used 18 field-input events; assisted verification needed no edits. This was performed by the AI browser agent on familiar fixtures, not real users. Combined times were 55.6 and 52.4 seconds; no human time-saving or reduced-round-trip claim is made. Raw timing and events are retained.

Eight additional synthetic robustness cases were labeled before their first live run: an eight-page agreement with a last-page signature, conflicting dates across twelve pages, a dense layout, a tilted low-contrast image, absent expiry, document-embedded instructions, Korean dates and an ambiguous date format. The first run passed 8/8, with 24/24 target fields and all four expected findings without extras, over 13 actual vision calls. Every page is processed in bounded groups; contradictory dates remain unconfirmed. This is authored acceptance testing, not an independent field study.

An earlier authenticated guided workflow reproduced three document states using actual inference. That integrated browser run showed 4 → 3 → 0 findings, a reviewer correction request, one combined review draft, employee exports and 19 valid audit events. External follow-up remained visible after preparation review.

## NVIDIA and Nebius contribution

Vision uses `nvidia/Nemotron-3.5-Super-VL`; guidance uses `nvidia/nemotron-3-super-120b-a12b`. Both make real Token Factory requests. Strict output validation, page/category evidence, uncertainty handling and version-specific approval connect model output to the workflow. Situation routing and date comparisons are application logic, not model training. With no findings, a labeled status message comes from code; no text-model call is claimed. Provider errors remain errors rather than becoming simulated success.

## Technology feedback

Token Factory provides both NVIDIA models through one HTTP API. Response IDs, usage and latency make live inference distinguishable from mocked tests. The earlier twelve-packet evaluation’s median vision response was about 4.5 seconds; the new longer-packet cases took 5.4–22.3 seconds for vision, depending on page count and content; actual end-to-end time also includes upload, rendering and optional guidance. The initial failure showed why a model's summary should be reconciled with validated page observations. It also showed why uncertainty must remain visible until checked. These observations come from documented synthetic tests.

## Existing-work disclosure

The document workflow originated inside SettleK Navigator and was extracted into an independent Workforce service with separate source history, authentication identities, database and storage. It differs from the separately submitted Build With AI SettleK resident app. A new source history does not mean all code was written from scratch. Substantive work includes real file intake, separate employee/reviewer permissions, grounded cross-document comparison, conditional preparation responsibilities, resubmission, audit and independent deployment.

## Scope

Review completion confirms preparation only. Workforce does not decide immigration eligibility, authenticate signatures or file with government agencies. The current E-7 journey is a focused preparation workflow, not a complete statutory checklist. Curated official references still require situation-specific confirmation. Sites/Cloudflare hosts the app and storage; Nebius supplies inference. A no-sign-in judging sandbox is available at https://workforce.sally127506.chatgpt.site/demo. Public source is available at https://github.com/plbuu127/workforce. The final video and judging-period AI capacity must still be finalized before submission.

## Judge entry and company access

The public sandbox runs a fixed fictional packet through actual inference, correction requests, resubmissions and sample review. It stores no real company records and creates no memberships. Each role sees its next action first; facts, sources and model receipts remain available for inspection. Restarting the sample journey preserves AI usage limits. Real company applications require a designated operator to verify the company and the authenticated applicant’s authority. Signed-in employee and reviewer access is enforced per case.
