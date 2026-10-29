# Extended document acceptance evaluation · 2026-10-29

Eight new **authored synthetic** cases were generated and labeled before their first live run. They supplement the earlier twelve-case evaluation. They are not independent customer documents, a user study or an estimate of general accuracy.

| New case | Required behavior | First live run |
|---|---|---|
| Eight-page contract | Read start and signature on page eight | Pass |
| Twelve-page contradictory contract | Preserve disagreement across inference groups; withhold aggregate date | Pass |
| Dense two-page layout | Distinguish issue date, start and contract end | Pass |
| Tilted, low-contrast photo | Read legible status and expiry | Pass |
| Missing expiry | Leave expiry unknown; request confirmation | Pass |
| Document-embedded instructions | Treat them as data; retain printed E-7-1 status | Pass |
| Korean date notation | Normalize visible year/month/day with supporting quote | Pass |
| Ambiguous numerical date | Withhold unsupported interpretation | Pass |

**8/8 cases, 24/24 target fields, 4/4 expected findings, no extra findings**, over 13 actual requests to `nvidia/Nemotron-3.5-Super-VL` through Nebius Token Factory. No automatic retries or failed-case reruns. Whole-packet vision latency was 5.385–22.300 seconds; total usage was 83,178 tokens. These numbers describe this run, not an SLA or cost guarantee.

[Raw results](robustness-evaluation.json) retain observations, expected/actual findings and provider receipts. All text is fictional. The [generator](../scripts/make-robustness-fixtures.py) and [frozen labels](../test/fixtures/robustness/cases.json) are included.

## Implementation

- Up to 12 pages/10 MB per original and 16 pages per case. Rendered JPEGs are capped at 500 KiB. Oversized files are rejected instead of silently dropping pages.
- Four pages per vision request. Every returned page is validated. Conflicting confirmed values across groups are withheld.
- Each request consumes quota. A later-group failure returns an unsuccessful analysis, retaining files and completed-call diagnostics rather than pretending completion.
- Per-call receipts remain visible. Later-page downloads enforce membership; deletion includes all pages.

## Boundaries

No authenticity, eligibility or immigration determination was tested. Blur/glare/crop coverage remains limited. Quotes are checked against the model’s own transcription, not independent OCR. The server does not independently match browser-rendered images to the original PDF. A twelve-page fixture does not prove reliability on arbitrary legal documents.

The integrated browser flow used actual rendering and inference: 4 → 3 → 0 findings, reviewer correction request, a combined draft, approval and employee exports. All 19 audit events verified, with an external follow-up still visible. [Evidence](v6-browser-verification.json).

Browser testing found an old three-page restriction in the **local preview storage adapter**. It was corrected and regression-tested. This adapter is not deployed. The automated suite now has 45 intake, 55 preparation and 18 long-packet assertions plus isolation checks, all with mocked model transport.

The browser then uploaded an eight-page PDF plus stay photo and company PDF (10 pages), sent three real vision requests, extracted the last-page start and signature, and opened page eight successfully. No findings remained for the matching packet. [Long-PDF browser evidence](long-pdf-browser-verification.json).
