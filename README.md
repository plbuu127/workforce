# Workforce

Site: https://workforce-pied-iota.vercel.app

[Start a judging workspace](https://workforce-pied-iota.vercel.app/login) · [Deployment guide](docs/VERCEL-DEPLOYMENT.md) · [Live verification evidence](docs/vercel-production-verification.json) · [Submission checklist](docs/hackathon/SUBMISSION-CHECKLIST.md)

Workforce helps foreign employees already in Korea prepare a job change with their hiring company. Its first focused journey is an E-7-1 employee changing employers. The employee supplies documents and situation information; the assigned reviewer checks source pages, requests changes and completes a version-specific preparation review.

The operating deployment is **Vercel**, with Turso records, private Vercel Blob files and real NVIDIA model inference through Nebius. Accounts, company workspaces, uploads, analysis and review all work at the Vercel address. No ChatGPT Sites login or backend is required. The separate SettleK Build With AI entry is unchanged. Existing Sites records were not copied into the new database.

## Try it from the beginning

1. Open the [entry page](https://workforce-pied-iota.vercel.app/login) and click **Start a judging workspace**. No Vercel or ChatGPT account, company approval or payment is required. A private browser session gets its own reviewer and employee test identities, starting with no company or case.
2. Enter a company name and your team display name; select **Create company workspace**. Choose **New employee case**, enter a fictional case label and click **Create case**.
3. Select **Accept invitation as test employee →**. In **My work · Employee**, complete the situation form and upload a contract and stay document in **Documents**. **Use a fictional sample (optional)** supplies real sample PDFs/photos through the same rendering and upload flow. Own PDF/JPEG/PNG uploads are also supported.
4. Switch to **Company · Reviewer**, open the case and add the company joining details in **Documents**. Return to **My work · Employee**, inspect the originals, give processing consent and select **Submit & run AI**.
5. Review actual findings and cited pages. In the reviewer screen, request changes. Replace only the unsigned contract first and analyze again; unrelated date findings should remain. Then correct the remaining fictional stay/company records and reanalyze.
6. Record employee readiness and company checks. Complete the reviewer confirmations and resolve or explicitly record external follow-ups. Complete preparation review, then inspect **History**, prior versions, exports and the audit trail.

The guest switch accesses only the two identities in that session, never another visitor's company. Cookies preserve access for up to 30 days; sign-out or cookie loss loses guest access. Normal Workforce email/password accounts support repeat sign-in and separate users. Invitations are recipient-bound, single-use and expire after 48 hours; this MVP does not send invitation emails automatically.

## What the product does

- **Situation-specific preparation:** location, reported stay status, new job and previous employment circumstances determine employee tasks, company checks and unresolved questions. The checklist is deterministic and has curated official references.
- **Actual document intake:** PDF/JPEG/PNG originals, browser-rendered page previews and private downloads. The employee contributes their documents; the assigned reviewer contributes company joining details.
- **Source-linked AI extraction:** stay expiry, contract/company start dates, employer names, job titles and signature observations. Code validates observations, compares dates and withholds unsupported or conflicting values.
- **Actionable findings:** missing or unreadable information, absent signatures and conflicting dates/wording have an action owner and relevant page evidence. Signature observation does not establish authenticity.
- **Corrections and context:** reviewers can correct a reading against a cited original with a quote and reason. The original model reading remains; findings recalculate and prior confirmations invalidate. Employee notes remain unverified context, never document facts. An explicit action can request updated English guidance.
- **Changes and resubmission:** each analysis creates a version. Resolved, remaining, new and unconfirmed findings stay distinct; a partial fix cannot erase unrelated findings. Checklist-only updates can also return to review.
- **Review and shared records:** a combined reviewer form saves evidence, follow-ups and a draft or decision. Approval is version-bound preparation review, not immigration approval. Both sides can inspect history and export a preparation summary/audit record.
- **Multiple companies:** owners invite administrators/reviewers and assign cases. An employee can join cases across companies without granting those companies access to each other's documents. Reassignment is recorded and removes the former reviewer's case access. Administrators manage team/assignment metadata without automatically reading unassigned files.

Company workspaces open immediately. Registering a company name never joins an existing workspace. Company identity and account email ownership are **not verified** in this MVP; password reset, enterprise SSO, billing and automatic email delivery are not implemented. Optional operator verification exists, but no operator is required for judge entry.

## NVIDIA and Nebius

- Vision: `nvidia/Nemotron-3.5-Super-VL`.
- English guidance: `nvidia/nemotron-3-super-120b-a12b`.
- Endpoint: `https://api.tokenfactory.nebius.com/v1/chat/completions`.
- Credentials stay in Vercel server environment variables. No provider key is in the browser or repository.
- Successful calls retain provider/model, response ID, latency and token usage. Missing credentials or provider failures do not produce a fake successful AI result.
- Situation routing, date comparisons and validation are application logic. When no findings remain, the ready-for-review text is explicitly a **workflow status**, without a guidance model call.
- If model wording fails validation, checked rule-based actions remain clearly labelled; the failure is retained.

## Verified on the Vercel deployment

On October 30, 2026, a synthetic production acceptance run passed **28 checks**: an anonymous judging session created a company/case; the employee submitted real PDF/photo bytes; actual NVIDIA/Nebius inference found **4 → 3 → 0** issues across original, signed-only and corrected packets; the reviewer requested changes and completed review with explicit follow-ups. **19 audit events** verified. A fresh API fetch retained the decision and previous versions. A PDF larger than 5 MiB downloaded with the same SHA-256 digest, and a separate visitor could not read the case.

[Machine-readable evidence](docs/vercel-production-verification.json) records three live vision receipts and two live guidance receipts. The final zero-finding message is deterministic workflow status. This is engineering verification with fictional documents, **not a real employee/HR study or a general accuracy estimate**.

Local suites passed **362 workflow assertions plus service isolation**, and **36 Vercel runtime assertions**. They cover roles, corrections, companies, invitations, persistence, large chunked uploads, forged identity headers, cross-origin rejection, private downloads and audit integrity. AI transport is mocked in these automated suites.

Earlier evidence remains available with its original deployment context: [two-account verification](docs/verification.md), [12-packet evaluation](docs/preparation-evaluation.md), [eight robustness cases](docs/robustness-evaluation.md), [paired agent-operated measurement](docs/workflow-measurement.md), and [official source map](docs/e7-source-map.md). Historical results are not relabelled as new Vercel runs.

## Run and deploy

Requires Node.js 24. Use npm and the committed lockfile.

```sh
npm ci
npm run build:vercel
npm run test:vercel
WORKFORCE_TEST_LIBSQL=1 npm test
node scripts/preview-vercel.mjs
```

The Vercel preview listens at `http://127.0.0.1:4192`, with local synthetic storage and AI disconnected by default. For production, connect a Turso database and private Blob store and configure these server-only variables:

```text
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
BLOB_READ_WRITE_TOKEN
NEBIUS_API_KEY
NEBIUS_AI_ENABLED=true
```

Then deploy with the official Vercel CLI: `vercel --prod`. See [configuration, migration and validation details](docs/VERCEL-DEPLOYMENT.md). `node scripts/verify-vercel-live.mjs` creates synthetic production records and consumes real model quota; run deliberately, not as routine CI. It writes ignored `.eval-results/` evidence and makes no automatic retries.

The domain workflow lives in `worker/`, `shared/` and `public/`; `vercel-runtime/` supplies verified local accounts, libSQL adaptation, private Blob access and bounded upload transport. `scripts/build-vercel.mjs` packages the existing workflow for Vercel. The earlier Sites build remains in source for provenance and tests, but Vercel is the current operating target.

## Limits and submission status

- PDF/JPEG/PNG only; 10 MiB per original, 12 pages/file, 16 pages/case, four document categories and ten versions. Vision processes groups of four pages.
- Existing model budgets: 20 calls per user and 100 globally per Korea calendar day, plus a Vercel IP limit on analysis/guidance requests. Multi-page runs may consume multiple calls. Provider balances/expiry can impose lower limits; request caps are not a monetary spending guarantee.
- Live AI was connected and verified. **Credit coverage through judging is still pending**; no paid top-up has been authorized or made. Recheck the provider balance/expiry before submission and judging.
- Browser-rendered pages are not independently proven to correspond cryptographically to the original PDF. Model transcriptions are not independent OCR verification.
- This is a focused preparation checklist with curated links, not a complete statutory checklist or live legal research. Workforce does not authenticate signatures, decide work authorization, or file with government agencies.
- The audit hash chain is verified inside the database, not externally notarized. File deletion removes retained document versions/analysis while minimal audit events and review messages remain.
- Broader device/accessibility testing, real-user validation, verified company onboarding and enterprise operations remain future work.
- The [under-three-minute video plan](docs/hackathon/DEMO-PLAN.md) and English submission draft are prepared; **final video and Devpost submission are not yet complete**.

## Provenance and license

The HR workflow originated inside SettleK Navigator and was extracted into an independent Workforce service, then moved to Vercel with separate accounts, database and file storage. A new repository does not mean every line was written from scratch. The separately submitted SettleK BuildAI app/repository was not modified by this migration. Original historical execution evidence identifies the deployment actually tested.

Project code is MIT licensed. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency and model-license information.
