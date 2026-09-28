# Product email HTTP boundary — WU069

RUN_ID: ATV-20260902-170644Z-01A0630F.

## Scope and evidence

- Three fixed authenticated POST routes for request, recovery and cancellation. Same-origin/CSRF checks, bounded JSON, strict shared command/receipt parsers, session claims, user RPC identity, 10-second RPC abort signal, private response headers and redacted failures. No address/content/provider or dispatch.
- 46 focused tests passed: 40 boundary/parser cases plus six real PostgreSQL integration scenarios. SQL integration exercises the exported route handlers, default policy refusal, owner isolation, stale versions, inactive profiles, Library state, deletion cascade, final cancellation and lost acknowledgement recovery after revocation without duplicate rows.
- 637 web tests / 38 files passed (`test-results/wu069-web.log`). Focused suite rerun after test typing corrections (`wu069-focal.log`).
- Svelte check: zero errors/warnings. Scoped ESLint and Prettier checks pass. Local `vite build` passes; existing adapter warning remains: 24 excluded routes dropped from `_routes.json`.
- Local evidence files `test-results/wu069-{check,lint,format-check,build}.log`.

## Non-claims

No browser controls or visual surface changed. No hosted JWT/PostgREST or concurrency certification, hosted migration, recipient verification, provider acceptance or inbox delivery. Policy remains false; no scheduler, paid call, model promotion or release gate enabled. Concurrent unrelated work preserved.
