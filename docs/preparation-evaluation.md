# Preparation AI evaluation — 2026-10-28

## What was measured

Twelve authored synthetic document packets were sent to the real NVIDIA `nvidia/Nemotron-3.5-Super-VL` model through Nebius Token Factory. Inputs included rendered PDFs and JPEG images; no real employee records were used. Each packet has fixed ground truth in `test/fixtures/preparation/cases.json`. The reference date is 2026-10-28 so expiry reminders are reproducible.

An exact pass requires all three target fields (reported stay status, expiry and contract start) and the full expected finding set to match. Employer and role extraction are exercised by mismatch scenarios but are not separately counted in the 36-field metric. The evaluator tests vision plus the deterministic validation/comparison layer. It does not measure legal advice, signature authenticity, user satisfaction or time saved.

| Run | Exact packet pass | Target fields | Expected findings missed | Unexpected findings |
| --- | --- | --- | --- | --- |
| First run | 11/12 | 35/36 | 0 of 16 | 1 |
| Release regression run | 12/12 | 36/36 | 0 of 16 | 0 |

The first run correctly read the contract date in its page observation but did not provide an acceptable aggregate date. The app withheld that field instead of accepting an unsupported summary. The fix derives the aggregate only from unambiguous, validated contract-page observations; it never uses the company offer as the contract date. Conflicting contract dates remain unconfirmed. The original failed result is retained in `preparation-evaluation-first-run.json`, and the subsequent complete run is in `preparation-evaluation-release.json`.

Release vision response latency: median 4.5 seconds, range 3.4–6.9 seconds. Twelve calls used 61,044 total tokens. These observed requests are not an SLA or a spending estimate. No automatic paid retries occurred. This was one scheduled rerun after a specific code correction, not selection of the best result from repeated retries.

## Cases

1. Clean matching packet.
2. Unsigned contract, start after reported expiry, expiry reminder and contradictory company start date.
3. Signature-only correction: only signature is resolved; all three date findings remain.
4. Updated matching packet.
5. Unreadable stay fields: unknown values stay empty and a clearer page is requested.
6. Missing stay document.
7. Missing company joining details.
8. Korean stay information with an English contract.
9. Two-page contract with facts and signature on separate pages.
10. Employer-name mismatch.
11. Job-title mismatch.
12. Alternate layout and English date formats.

Cases 11–12 were designated holdout examples before the first run, but both were authored by the developer. They also appear in the release rerun. They are not an independent external benchmark. No claim of general 100% accuracy is made.

## Reproduction

Build first, configure the provider key in an ignored env file, and run `WORKFORCE_ENV_FILE=/absolute/ignored/file pnpm eval:live`. Each full run makes up to twelve paid-provider requests; the provider's credit policy applies. A single case can be selected with `node scripts/evaluate-preparation.mjs --live --case 08-korean-stay`. The normal test suite mocks inference and makes no provider calls.

Synthetic fixtures and their generation script are included. The report retains model IDs, response IDs, timestamps, usage and comparisons, but no credentials or participant accounts. Grounding validates quoted text against the model transcription and category; it is not independent OCR proof. Real-document, device and real-user evaluations remain future work.

## Guidance wording is a separate component

In the browser self-test, the initial English draft passed, while the partial-correction draft was rejected by validation. Findings and their comparison were preserved. A separate diagnostic request for the same checks returned an accepted draft (HTTP 200, response chatcmpl-9403849026ff43c9, 1,392 ms, 394 tokens). It was not substituted into the earlier run. The UI now exposes the existing checked actions by owner when wording is unavailable, explicitly labeled rule-based. This is not a successful AI-drafting claim. The 12/12 metric above excludes guidance wording.
