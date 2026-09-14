# WU-031 — durable calculation processing

RUN_ID: ATV-20260902-170644Z-01A0630F. Synthetic local evidence only; no model homologated, all 25 product releases disabled and no production promotion inserted.

## Implemented

- Private transactional work queue, supported-product claim, expiring token lease, revision CAS, idempotent completion/failure receipts, bounded retry/backoff and terminal exhaustion.
- Portable processor validates input and finite, bounded calculation JSON, preserves saved Tarot draws, aborts late work and stops at editorial review. Injected adapters only; no hosted transport/scheduler or actual product calculators registered.
- Owner deletion during processing removes work and rejects late writes. Release revocation stops calculation completion. Forward-fix disables processing without restoring the unfenced writer or losing owned history.
- Domain package exports now resolve real TypeScript sources under native Node tests as well as bundlers.

## Verification

- Full monorepo: 84 unit tests PASS; type check (zero errors/warnings), lint and build PASS.
- 9 worker unit tests: input/output validation, duplicate prevention, saved draw reuse, idle/exhaustion, cancellation/deadline, late claim, safe telemetry/errors, and strict RPC response mapping.
- 15 PostgreSQL tests in PGlite: the 8 existing persistence tests plus 7 new full-migration processing tests. Real processor → SQL → Library/history is exercised with a synthetic calculator; it reaches AWAITING_EDITORIAL, not READY.
- Evidence: `test-results/wu031-worker-unit.log`, `wu031-db.log`, `wu031-all-unit.log`, `wu031-check.log`, `wu031-lint.log`, `wu031-build.log`.
- Previous WU-030 SHA `93379cceeaa7743984a07d2674166e0fc223ac1c`: quality, secrets and Cloudflare Pages observed completed/success through GitHub check-runs API on 2026-09-14.

## Remaining gates

PGlite does not certify simultaneous independent PostgreSQL connections or hosted JWT/PostgREST behavior. Staging migration, two-consumer concurrency, real adapter/runtime wiring, product-specific calculation coverage, Editorial Director and evaluation-approved publication remain required. No new UI was introduced; WU-030 visual/E2E evidence remains the UI baseline.
