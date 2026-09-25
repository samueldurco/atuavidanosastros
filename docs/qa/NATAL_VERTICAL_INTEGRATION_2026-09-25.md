# Natal intake — local vertical integration

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-060. 2026-09-25.

The four natal products (`birth-chart`, `three-pillars`, `ascendant`, `midheaven`) now have 24 integration scenarios connecting the browser request controller, real HTTP handlers, onboarding revision bridge, PostgreSQL/RLS, deterministic calculators, persisted workflow events and Library projections. The database uses PGlite with one connection and synthetic authenticated claims; it is not a hosted JWT/PostgREST certification.

Each product verifies the saved COMPLETE/EXACT birth snapshot, calculation persistence, history and AWAITING_EDITORIAL state. Editing or forgetting the onboarding profile cannot change an existing run. Lost acknowledgements recover the original request read-only after profile removal and release revocation, without replay; browser persistence contains only the UUID. Reprocessing creates a child with the original input, not the updated profile. Another account cannot recover, read or download the result. Stale revisions, approximate time, disabled releases and missing entitlement refuse before workflow writes.

No editorial approval, READY result or promotion is seeded. Downloads remain denied; publication remains disabled. Calculation comparisons validate the execution timestamp separately and compare all remaining facts/data/provenance, since independent calculations and reprocessing naturally have different execution times. This is not engine homologation.

## Verification

- New focal suite: **24 PASS** (`test-results/wu060-focal.log`).
- Full web suite: **415 tests / 30 files PASS** (`test-results/wu060-web.log`).
- Svelte check: **0 errors, 0 warnings** (`test-results/wu060-check.log`).
- Scoped ESLint and Prettier passed. Only tests and this evidence document changed; WU-059 build/browser evidence remains applicable to unchanged runtime/UI.

WU-059 remote checks on `97848e596237cf59c2413b7fcd2dc0542fde60dd` were observed completed/success: quality `108111810696`, secrets `108111810572`, Pages `108112207816`.

No hosted migration, scheduler, transport, paid call, model homologation or gate/policy change. Full result designs, editorial interpretation, approved artifacts, audio and email remain outside this local evidence.
