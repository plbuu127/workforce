# Paired workflow measurement — 2026-10-29

This is an instrumented **AI-agent-operated synthetic check**, not a human usability study or a claim about HR productivity. One familiar fictional case was used in its initial and corrected states. The same nine fact fields, six candidate findings and three source images appeared in both conditions.

- Manual: the operator visually reads sources and enters nine fields and applicable findings.
- Assisted: the actual NVIDIA/Nebius pipeline pre-fills the same fields/findings; the operator visually checks all three sources and can correct them.
- Order: manual initial → assisted corrected → assisted initial → manual corrected. This partially varies order but is not randomized or independent.
- The browser records monotonic elapsed review time and input/page events. Separate measured inference pipeline time is added to the assisted condition. Upload, authentication, official research, preparation attestations and final approval are excluded in both conditions.

| Document state | Manual review | Assisted review | Actual AI pipeline | Assisted combined | Result |
|---|---:|---:|---:|---:|---|
| Initial | 34.885 s | 20.628 s | 9.481 s | 30.109 s | Both: 9/9 fields; 4 expected findings; no extras |
| Corrected | 20.713 s | 17.773 s | 4.563 s | 22.336 s | Both: 9/9 fields; no findings |
| Total | 55.598 s | 38.401 s | 14.044 s | 52.445 s | Both: 18/18 fields |

Manual entry required **18 fact-field input events**; assisted verification required **0 corrections/retyping** across the two states. Each arm still checked all three sources. Both identified the same four initial issues and grouped them into one correction batch; neither missed an expected finding. **No reduction in correction rounds or omissions was demonstrated.** A correction batch is a grouping of findings, not a real email or measured employee turnaround.

The combined timing difference is only about 3.2 seconds in this small proxy; the corrected case was slower with AI time included. Do not advertise a percentage time saving from this result. Tool latency, operator reasoning, known expected answers, one synthetic layout and order effects make it unsuitable for human-performance inference. The supported observation is that the model supplied the repeated transcription and comparison output correctly in these two executions, while source verification remained necessary.

## Reproduce

After build, run `WORKFORCE_ENV_FILE=/absolute/ignored/env-file node scripts/workflow-benchmark.mjs --live`. This explicitly makes two vision calls and up to one guidance call, without automatic retries, and starts the loopback-only harness at `http://127.0.0.1:4191`. Use `--replay` only to review already captured outputs; it is not new live inference. Never deploy this harness or load real employee records into it.

Raw events, answers, scoring and limitations: [workflow-measurement.json](workflow-measurement.json). Actual model responses: [initial](workflow-live-02-three-problems.json), [corrected](workflow-live-04-all-document-fixes.json). The initial guidance model response was also successful. The corrected workflow status was rule-based, with no text-generation call.

For future human validation, use unfamiliar authorized/redacted packets, matched output requirements, randomized order, independent ground-truth review and multiple participants. Record errors, field corrections, total handling time including all product steps and actual follow-up exchanges. No such participants are claimed here.
