# Extraction correction and situation guidance · 2026-10-29

## Automated verification

40 new assertions using mocked model transport cover separate identities, outsider denial, source category validation, invalid dates, quote/value consistency, mandatory original check/reason/quote, optimistic revisions, per-page/aggregate consistency, retaining original AI output, recomputing findings, restoring an AI value with an appended record, employee visibility, statement/evidence separation, contextual task routing (including waiting for a company-issued contract), explicit AI consent, context clearing with history, invalidating old wording and review, an approved snapshot surviving a subsequent correction, exports/audit integrity, and provider failure.

The existing 45 intake, 55 preparation and 18 long-packet assertions plus the isolation suite remain applicable. These are software correctness tests, not live AI accuracy measurements.

## Product scope

Reviewer corrections do not alter original files. A changed agreement needs a new document. Human corrections have their own provenance. Reports from employees are unverified until a reviewer checks evidence; they are inputs to preparation guidance, never replacements for document facts or automatic permission to work.

The AI wording uses the saved explanation, employee/reviewer responsibilities, current checked findings and prior finding identifiers. A deterministic task remains visible if AI wording fails. Current context categories focus on changed or uncertain start dates, with a general explanation field for other circumstances; this is not comprehensive interpretation of every employment or immigration situation.

## B2B fit and remaining idea limitations

The buyer/use pattern is B2B: a company reviewer invites an employee and manages evidence, corrections, resubmissions and decisions in one case. The employee benefits from clear next steps and visibility into corrections. Case-level access is implemented; company-level tenancy, team membership, reassignment, organization policy, enterprise authentication and bulk workflow are not implemented. Installation does not create those capabilities.

The strongest implemented value is preserving responsibility and evidence as the two parties correct conflicting records. General document extraction plus approval is not by itself a novel model architecture. The new context guidance deepens a focused use case but is not proof of exclusive functionality. Independent customer adoption, willingness to pay, broader document reliability and measured staff time saved remain unverified. No participant or user study has been invented.

## Deployed browser and actual model verification

The final workflow was tested with fictional records and a single account switching roles. The first new vision request timed out after the configured 60 seconds. One explicit retry succeeded: NVIDIA vision took 46.9 seconds, HTTP 200, response `chatcmpl-b32eb2e9cf13116e`; the first English update took 1.2 seconds, response `chatcmpl-a357f41e60e74376`. This was not an automatic retry or a replay.

Three situation branches were exercised in the deployed UI: uncertain agreement, awaiting a replacement contract, and a current contract with an older company joining record. Employee-reported dates never replaced document dates. AI wording for the waiting case initially failed validation, and another accepted draft still requested a document the employee was awaiting. The generation input was revised to omit stale contract-upload instructions from immediate actions while retaining all document findings. The final waiting-case draft directed the company to provide the replacement. The third draft remained general about reviewer tasks, while the specific company-record action stayed visible in the deterministic card. Wording quality remains a limitation, not a perfect-context claim.

The production correction round trip normalized only the capitalization of a fictional job title, then restored it. This tests storage, UI and provenance; it does not claim a genuine OCR error in that file. Both events were visible to the employee, and the audit hash chain verified all 18 events. Wrong-date OCR correction and approval invalidation were tested with controlled mocked readings in the automated suite. A no-change correction was rejected in the deployed browser, and the input type, value and quote remained intact after the failed save.

Local browser routing did not show the current preview build; production browser checks supplied the UI verification. New features were not retested with two independently logged-in browser accounts in this run. Separate-identity server tests passed. No real employee or customer study was performed.
