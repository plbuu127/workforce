> Historical Sites verification, October 28. The current operating site is https://workforce-pied-iota.vercel.app; see [Vercel production evidence](vercel-production-verification.json). The original test address below is retained for provenance.

# Standalone Workforce verification

Verified on 2026-10-28 at https://workforce.sally127506.chatgpt.site. All uploaded files were fictional test documents. This is technical acceptance testing, not foreign-employee feedback or an immigration-accuracy study.

## Independent service

- Separate source history, hosting identity, authentication identities, D1 database and private R2 files. No resident records or old documents were migrated.
- Only three Workforce tables: cases, append-only audit and AI usage. Prior resident routes, personal APIs and the old sample lab are absent.
- No application calls to either SettleK Site. The Build With AI application and submitted repository were not changed.
- Restricted Site access: owner and one authorized employee test account. This does not yet provide judge access.
- Environment revision 1 contains a secret NEBIUS_API_KEY and enabled inference. An existing authorized provider credential was reused; this is not a new provider account or separate billing allocation.

## Two actual signed-in accounts on the earlier standalone version

The reviewer and employee had distinct server-authenticated identities. The case had self_test: false.

1. Reviewer created a case and a single-use invitation. Employee signed in separately and claimed it.
2. Employee uploaded contract-unsigned.pdf and stay-clear.jpg through the browser file input. Private persistence and source-page previews worked.
3. Actual NVIDIA vision extracted E-7, expiry 2027-06-30 and proposed start 2026-11-10, and detected a blank signature area. Actual NVIDIA text inference produced English next steps.
4. Reviewer inspected the original page and saved a specific change request. Employee refreshed and saw the same message.
5. Employee replaced the contract with contract-signed.pdf, creating version 2, then consented to and ran a fresh live analysis.
6. The comparison showed one resolved finding and zero remaining, new or unconfirmed findings. With no findings, the status message was explicitly rule-based and no text model call was made.
7. Reviewer compared both source pages, edited the final message, checked the three confirmations and approved version 2. Employee saw the identical approved message.
8. Employee downloaded the reviewed JSON record. Its audit chain verified all 11 events, including distinct reviewer and employee actors.

Browser automation temporarily required Chrome extension file URL access. The user enabled it for this test and confirmed it was disabled after the last upload.

## Live execution evidence

| Version / purpose | NVIDIA model | HTTP | Latency | Total tokens |
| --- | --- | --- | --- | --- |
| v1 page reading | nvidia/Nemotron-3.5-Super-VL | 200 | 3,950 ms | 4,595 |
| v1 English draft | nvidia/nemotron-3-super-120b-a12b | 200 | 1,173 ms | 354 |
| v2 page reading | nvidia/Nemotron-3.5-Super-VL | 200 | 3,704 ms | 4,648 |

[Redacted evidence](live-verification.json) contains timestamps, response IDs, usage and finding comparisons. It excludes account identifiers, emails, invitations, keys and document transcriptions. Latencies describe these requests, not an SLA. Hosting is Sites/Cloudflare; Nebius Token Factory supplies inference.

A separate one-account self-test on this same deployment also completed version 2 approval, three live calls and a valid 10-event audit. It is not counted as the two-account test.

## Offline checks

- 44 workflow and 31 new preparation assertions passed with mocked AI transport: uploads, two logical identities, corrections, approval invalidation, access denial, audit integrity, deletion, evidence validation, provider failure and missing-key behavior.
- Separate isolation suite passed: root branding, removed routes, fresh database, authentication, same-origin protection and PDF assets.
- Build and artifact validation passed. No fake live-inference fallback is used.

## Situation-specific preparation extension

The later extension adds a conditional employee situation plan, company-owned joining evidence, grounded date/employer/role comparison, source-page comparison and readable summary export. The two-account production test above predates this extension. It is not counted as a live two-account test of the new company-upload path. That path is covered by separate-identity API tests with mocked transport, plus a browser self-test using actual NVIDIA calls. The browser test reached version 3: four initial findings, then only the signature resolved, then all three date findings resolved after the remaining fictional documents were updated. Company checks, approval, the readable HTML summary download and the JSON record were verified. All 17 audit events passed. [Browser evidence](preparation-browser-verification.json) preserves each result, including one rejected guidance draft; the rejected draft was not replaced by a later successful call.

The live 12-packet evaluation and its first failed run are documented in [preparation evaluation](preparation-evaluation.md). Tests cover partial correction, unreadable documents, missing company data, Korean, multiple pages and employer/role conflicts.

## Boundaries and remaining work

The live two-account test covers the happy path and one corrected signature finding, not all possible documents. No universal extraction-accuracy claim is made. Original PDF to rendered-page correspondence is not cryptographically verified server-side. Signature presence is not signature authenticity. Approval records preparation review, not eligibility or permission to work.

Before submission: publish the independent source repository, arrange judge access, record a public English demo below three minutes, complete Devpost materials and submit. Before general production use: broader device/accessibility testing, real user feedback and organization-level administration remain necessary.


## October 29: long packets and combined review

The latest suite contains 45 workflow, 55 preparation and 18 long-packet assertions, plus the independent isolation suite. These use mocked provider transport. The new live robustness suite passed all eight authored cases in 13 vision calls, with 24/24 target fields and no missed or extra expected findings. See [robustness evaluation](robustness-evaluation.md).

The guided browser flow used actual PDF rendering/uploads and NVIDIA calls. The three versions had four, three and zero findings. A reviewer correction request was delivered, the combined draft saved, approval without a required follow-up resolution was blocked without losing form data, and completion retained an external follow-up. Both exports succeeded; 19 audit events verified. This was a one-account technical self-test with fictional files, not a real-user test. [Evidence](v6-browser-verification.json).
