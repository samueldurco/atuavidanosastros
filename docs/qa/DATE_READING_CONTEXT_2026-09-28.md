# Leitura da Data — optional reported context

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-102. 2026-09-28.

Date intake accepts optional context through `atv-date-request/2`, preserving v1 commands and receipts. A present report must contain non-whitespace text, valid Unicode, no disallowed controls and at most 1,200 UTF-16 units. Text is preserved exactly. HTTP/SQL envelopes are bounded at 8,192 bytes, including escaped Unicode boundary tests. Career and date intake share the same text validator without changing career contracts.

## Local evidence

- Full web suite: **1,124 tests / 56 files PASS**, `test-results/wu102-unit.log`. PostgreSQL-compatible PGlite tests exercise exact immutable persistence, owner isolation, idempotency, recovery after profile changes/revocation, reprocessing, forward-fix and reapplication.
- **57 browser tests PASS**, `test-results/wu102-e2e-retry.log`, covering date, natal/career and pair intake. Optional omission, whitespace rejection, Unicode bounds, exact submitted report, renewed consent after edits, uncertain acknowledgement, UUID-only storage and reload/read-only recovery are covered with synthetic loopback transport.
- Svelte/TypeScript check **0 errors / 0 warnings**, `wu102-check-retry.log`; scoped ESLint PASS, `wu102-lint.log`; changed TS/Svelte files formatted; production build PASS in isolated E2E setup. Initial E2E setup timed out while concurrent full tests ran (`wu102-e2e.log`); isolated retry passed. Initial assertions used an incorrect date fact ID and were corrected to `personal-context` before the full passing suite.
- Screenshots inspected at **1440 / 820 / 390 / 320**, `apps/web/test-results/tests-date-intake.e2e.ts-*/date-intake-*.png`: responsive reflow, readable report/help/count, explicit consent and limitations, visible keyboard focus, no horizontal overflow. Existing ID-02 + CMP-02 + SH-02 composition preserved.
- WU101 SHA `3828ec0c139405fb00c1c641991e26fe0876e994`: quality `109040376313`, secrets `109040376610`, Pages `109040888119`, all completed/success.

## Boundaries and recovery

The report belongs only to this request, not to the natal profile, browser storage or ATV+ memory. Editing requires renewed consent; local drafts clear after an attempt. Private input and receipt retain the exact text; pending Library reads and metrics do not expose it.

The tested vertical remains input → immutable command/run → experimental calculation → AWAITING_EDITORIAL → owner-scoped Library/recovery → independent reprocess. Context becomes `personal-context`, a `reported` fact from `input.context`, never a calculated measurement. With and without the same report, identical natal/date inputs produce identical calculated facts. The date calculation remains one geocentric sample at 12:00 UTC, not a whole local day, event, favorable time or forecast.

Migration `20260928190000_date_reading_context.sql` and `supabase/forward-fixes/disable_date_reading_context.sql` were tested locally: disabling new v2 writes preserves history/read recovery and v1; reapplication restores idempotent v2 retry even with release flags closed.

**INTAKE_LOCAL_QA_PASS / NOT_FULL_VISUAL_PASS**. Not hosted JWT/PostgREST verification, full Gate B or motor/model homologation. No hosted migration, paid call, release activation, scheduler, email dispatch, production READY interpretation or automatic ATV+ continuity. No model is homologated; publication remains blocked.
