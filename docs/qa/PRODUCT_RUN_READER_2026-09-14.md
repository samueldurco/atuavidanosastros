# WU-030 — private workflow API and Library reader

Status: local implementation verified; **not product release or model approval**.

## Scope

- Authenticated create/read/reprocess/delete boundary with same-origin mutation checks, bounded JSON, owner RPCs, idempotency and sanitized failures.
- Owned Library reference resolves only its exact run and Library ID. Raw run SELECT is revoked for clients. Pending/revoked projections omit input, calculation data and editorial content; malformed results fail closed.
- Reader shows state, immutable revision history, approved facts/provenance/limits, refresh, explicit deletion and retry-safe reprocessing. Reprocessing copies input server-side and retains an existing Tarot draw.
- All six canonical universe labels work in the Library. Counts say records, because a saved request is not necessarily a finished reading.

## Design and checks

Reuses the established MEM-03 reader (`58afdd10c4b7484d8167ea5c62b29ee3`) and SH-03 shell (`157daa1e0776415982d5ab65d092248f`) from canonical Stitch project `2141801333950500965`, without introducing a new visual system. Local synthetic fixture explicitly labels its content as non-approved and disables mutations.

- Type check: zero errors/warnings; formatting and lint pass.
- Monorepo unit tests: 75 pass (25 web, including nine new boundary/projection tests).
- PostgreSQL/PGlite: eight tests pass, including grants/RLS, revocation hiding, exact release gates and the forward-fix retaining owner deletion.
- Reader browser checks: 11 pass across the new workflow and existing Compass readers. Widths 1440, 820, 390 and 320 px; no horizontal overflow, one main landmark, history and honest pending/failed/revoked states. Desktop and mobile screenshots visually inspected.
- Evidence: `test-results/wu030-{check,lint,all-unit,db,e2e-final}.log`; screenshots under `apps/web/test-results/tests-product-run-reader*`.

## Release boundaries

All 25 definitions remain disabled and the promotion registry empty. Both workflow migrations remain unapplied to hosted Supabase. Hosted JWT/PostgREST/Storage and independent-connection concurrency still need staging checks. No production provider calls, costs, credentials, real personal data or synthetic promotions were introduced. PDF/SVG/audio/email and worker orchestration are not delivered by this WU; no fake buttons or completion claims stand in for them.

Forward-fix: `supabase/forward-fixes/20260914120000_disable_product_run_reader.sql` disables the RPC without reopening raw access or deleting history. Web rollback is a reviewed revert.
