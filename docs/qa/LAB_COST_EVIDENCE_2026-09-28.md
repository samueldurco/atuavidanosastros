# WU075 — honest cost and usage evidence

RUN_ID: ATV-20260902-170644Z-01A0630F

## Change

The offline benchmark previously assigned zero BRL/free-tier to every sample, including samples without cost metadata. It also treated undefined, negative, fractional and non-finite token values as known. Benchmark policy 1.1.0 now validates each metric independently, normalizes unknown usage/cost to null, records explicit bounded cost references, and checks output-token limits. Unknown tiers fail latency/usage checks rather than throwing. Promotion policy 1.1.0 requires valid cost evidence and still requires zero cost, complete corpus/repetitions, pinned identity, exact-output editorial review, versions, artifacts, privacy and fallback reviews. The registry remains empty.

Cost references are trusted operator records, not cryptographic proof or permission to spend. A free-tier declaration cannot justify positive cost. Valid positive receipts are reported honestly but cannot satisfy promotion. No API, model, prompt, runtime gateway, release flag or external billing setting changed.

## Verification

- `pnpm --filter @atv/ai check`: PASS (`test-results/wu075-check.log`). Initial exact-optional typing errors in deliberately malformed test fixtures were corrected; no runtime type relaxation.
- `pnpm --filter @atv/ai test:unit`: 23/23 PASS (`test-results/wu075-unit.log`). Missing/invalid references, impossible free-tier amounts, legitimate zero/positive receipts, non-finite/unsafe/fractional tokens, missing usage, token ceilings, invalid tiers, latency and promotion refusals are covered. Synthetic reviews prove gate logic, not model quality.
- `pnpm --filter @atv/worker test:unit`: 63/63 PASS (`test-results/wu075-worker.log`).
- Offline historical replay: 12 baseline + 8 focal samples, zero samples with structured known cost or known token usage (`test-results/wu075-benchmark.json`). Raw artifacts and historical decisions unchanged; no external generation.
- Prior WU074 database repair: complete suite 64/64 PASS; independent commit `648f421` fixes only local fixtures.

Official OpenAI evaluation guidance informed scoped edge/adversarial tests and separation of automated metrics from expert editorial judgment: https://developers.openai.com/api/docs/guides/evaluation-best-practices/ . This does not adopt a hosted evaluation service or calibrate any model.

## Remaining

No homologated model. Human/calibrated independent reviews, diverse product-specific datasets, complete repeat runs and operational evidence remain required. No hosted migration, paid call, scheduler or email delivery occurred.
