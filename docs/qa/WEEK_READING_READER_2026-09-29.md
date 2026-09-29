# Semana — partial private reader, 2026-09-29

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU183 delivers the independent private transport and seven-sample timeline requirement within E3/E4. All content and identities in tests are synthetic. No editorial approval, engine homologation, hosted release, provider work or spend is represented.

## Delivered behavior

Delivery 1.17.0 selects the trusted Week profile before parsing eight hypotheses. It preserves 88/89 facts, 18/19 sections, shared natal evidence, seven separate dated samples, original hypothesis text/references, synthesis, three questions and literal limits. A missing optional context remains explicit.

The private web reader labels every fact and displays seven dates only when the saved range, dates, provenance and per-sample editorial references agree. Each card links to its hypothesis, including by keyboard. Invalid projection falls back to the preserved reading/base. Pending, failed and revoked states withhold private content. Existing export gates remain unchanged.

## Evidence

- Worker delivery: 3/3; `test-results/wu183-delivery-tests.log`. Covers both context states and rejection of forged/missing facts, exchanged date references, missing/extra hypotheses, relations and omitted limits.
- Web reader unit: 5/5; `test-results/wu183-reader-unit.log`. Full-content recovery, 300-character source boundary, projection corruption and redaction.
- PostgreSQL/WASM: 2/2; `test-results/wu183-week-sql.log`. Original calculation through the processor, full delivery through the private receipt publisher, exact read-back, owned history, one Library item, other-owner denial, policy off and receipt revocation. Database-owner receipts/flags affect the isolated test only.
- Shared worker/SQL regressions: 60/60; `test-results/wu183-shared-regression.log`.
- Full worker unit: 301/301; `test-results/wu183-worker-unit.log`.
- Full web unit: 1423/1423 across 70 files; `test-results/wu183-full-web-unit-final.log`. The first run exposed a stale 1.16.0 assertion; it now checks delivery 1.17.0.
- Full database regression: 101/101; `test-results/wu183-full-db.log`.
- Web/worker types: zero errors/warnings; `test-results/wu183-web-check.log` and `wu183-worker-check.log`.
- Local Chromium: final 6/6 in 1.6 minutes at 1440/820/390/320, both context states, keyboard/date navigation, no horizontal overflow, reload preservation and unauthenticated route; `test-results/wu183-e2e-isolated.log`. The preceding run had 5/6 passes and a 60-second reload timeout at 320 while full web/database suites ran simultaneously. The isolated repeat passed at 320 in 12.2 seconds without changing contracts or timeouts.
- ESLint eight web files, format check nine web files, staged diff and secrets scan: PASS; `test-results/wu183-*.log`.

Screenshots for timeline, hypothesis, provenance and history at each width are captured by `tests/week-reading-reader.e2e.ts`. Final retained copies are in `test-results/wu183-visual/`. Visual inspection includes desktop and mobile timeline/hypothesis; all widths have automated keyboard/reflow assertions.

CI182 `36581382150` succeeded for `5b8fe179e1ed49308fb2d0678df8a49a91488f5d`; proof `test-results/wu183-ci182-success.json`. The CI of this WU must be recorded after its own push.

## Remaining acceptance

E1 remains partial for the experimental seven-noon-UTC base and outstanding homologation/full temporal scope. E2 needs legitimate complete editorial approval. E3/E4 have local implementation and synthetic validation, with release authority and hosted authentication unproved. Area summary and PDF remain original product requirements. E5 is pending. Gates stay off; R$0. The separate admin/TikTok/media/social changes are preserved.
