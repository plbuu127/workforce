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

## Validation status

Before deployment, the 362 existing workflow assertions plus isolation suite passed against the libSQL adapter. The new runtime suite covers guest isolation, forged gateway headers, durable account login/logout, cross-origin rejection, a file larger than 4.5 MiB, chunk ownership, private download access, and audit continuity. These tests use synthetic data and mock AI transport; they do not establish live model accuracy.

Deployment completion requires all of the following:

- Confirm the final owner's Vercel account and team.
- Connect production database, private Blob, and Nebius secrets.
- Verify public production access without Vercel deployment protection.
- Run a fresh judge session through company creation, employee submission, live AI, reviewer changes, resubmission, and completed review.
- Verify files and records after reloading, and deny a second visitor access.
- Record the final Vercel URL and live test evidence in the submission documentation.

Production entry: https://workforce-pied-iota.vercel.app/login

Anonymous checks confirmed HTTP 200 for the homepage and login page, durable database/file configuration present, and HTTP 401 for private case APIs without a session. Live AI is not connected yet; completing the remaining checklist is still required.
