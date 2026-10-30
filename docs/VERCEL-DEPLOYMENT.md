# Workforce on Vercel

This target runs the entire application on Vercel: pages, account sessions, company/case APIs, document transport, and NVIDIA requests to Nebius. It does not proxy authentication or case operations to ChatGPT Sites. The existing Sites deployment and the separate SettleK BuildAI project are unchanged.

## Services and configuration

- Vercel Node.js 24 Functions, Tokyo (`hnd1`), 300-second maximum duration.
- Turso/libSQL for durable records, sessions, transactional company mutations, append-only audit triggers, and temporary upload transport.
- Private Vercel Blob for original files and rendered page images. Download authorization stays in the existing case API.
- Nebius Token Factory: NVIDIA Nemotron vision extraction and NVIDIA Nemotron reasoning/guidance. Keep the existing global and account usage limits.

Set these **server-only** production environment variables:

```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
BLOB_READ_WRITE_TOKEN=
NEBIUS_API_KEY=
NEBIUS_AI_ENABLED=true
```

Connect the free Turso Starter database and a private Blob store to the Vercel project. Do not choose a paid plan or enable overage billing without the owner's approval. Store credentials through Vercel environment settings or CLI standard input; never commit them.

```
npm ci
npm run build:vercel
npm run test:vercel
WORKFORCE_TEST_LIBSQL=1 npm test
vercel link
vercel --prod
```

`vercel.json` supplies the build command, static assets, server function, and routes. Database migrations run transactionally when the server connects. Existing Sites records are not copied into the new database. First deployment starts with empty data; sample assets are fictional.

## Judge entry and accounts

Open `/login` or `/demo`, then **Start a judging workspace**. A browser session receives a distinct reviewer and employee identity. It starts with no company or case. Create the company and case, choose **Accept invitation as test employee**, upload files in **My work**, and return to **Company** to review. Optional fictional sample buttons use the same PDF/image processing and upload API as user-selected files.

This guest role switch is limited to the two identities owned by that session. It is not identity verification, access to other visitors' workspaces, or a bypass of tenant/case authorization. Both roles' actions are recorded by the existing audit system. Cookie loss or sign-out loses guest access. The session expires after 30 days.

A separate Workforce email/password account supports repeat login. Passwords are salted and hashed with scrypt (N=32768, r=8, p=1). Session tokens are random, stored as SHA-256 hashes, and sent only in HttpOnly, Secure, SameSite cookies in production. Incoming ChatGPT/Sites identity headers are discarded; only the server's verified session supplies identity to the case API.

**MVP limitation:** account email ownership and company identity are not verified; password reset and email delivery are not implemented. Invitations are private, expiring links bound to the entered account email. Do not describe this as verified enterprise onboarding. No real employee/HR usability study has been conducted.

## Files larger than the Function request limit

The browser prepares the PDF/images normally, then transmits the multipart body in bounded 512 KiB requests. Temporary chunks are owned by the authenticated identity, restricted to an accessible case, and valid for 15 minutes. Completing an upload reconstructs the request on the server and invokes the original upload validation/authorization. Private Blob holds the retained document bytes. Completed chunks are removed; expired abandoned chunks are removed on subsequent upload starts.

The existing 10 MiB original-file, 12-page/file, 16-page/case, and 17 MiB multipart limits remain. Live deployment must verify original-file streaming and persistence, not only local transport.

## Validation status — completed October 30, 2026

Production: https://workforce-pied-iota.vercel.app — judge entry: `/login` or `/demo`.

The production deployment uses the owner's selected Vercel account/team. Turso, private Blob and dedicated server-only Nebius credentials are connected. Anonymous requests to the stable production homepage/login return 200 without a Vercel login; private APIs require an application session. Preview deployment protection may differ from this public production alias.

The 362 workflow assertions plus isolation suite passed against the libSQL adapter; 36 Vercel runtime assertions also passed. Those suites use synthetic data and mock AI transport.

A separate production run passed 28 checks with actual NVIDIA/Nebius inference: a fresh guest created a company and case, submitted a PDF larger than 5 MiB and photo/company files, requested changes, replaced and resubmitted documents, completed review with explicit follow-ups, and verified the audit. Findings changed 4 → 3 → 0 across three live vision calls; the first two also have live guidance receipts. Zero-finding guidance is labelled workflow status. All 19 audit events verified, file hashes matched after private downloads, prior versions and approval persisted after fresh fetch, and another visitor could not read the case.

See [the sanitized production evidence](vercel-production-verification.json). The test is synthetic engineering evidence, not a real employee study. `node scripts/verify-vercel-live.mjs` reproduces the sequence and consumes real model quota; it is not part of automated CI.

## Remaining operational limitations

Email ownership/company identity verification, password reset and email sending are not implemented. Guest access is isolated but depends on its browser cookie. Existing Sites data is not migrated. The optional operator account uses `WORKFORCE_OPERATOR_USER_ID`; it is not required for ordinary workspace creation.

Keep inference credits and expiry valid throughout judging. Billing transactions confirmed a separate AI Builder Program promotional balance on the already connected provider account. The header shows only trial credit; its countdown must not be treated as the promotional balance expiry. Confirm the promotional-credit terms for judging-period availability. No paid top-up or plan upgrade was made. The final video and competition submission are separate remaining tasks.
