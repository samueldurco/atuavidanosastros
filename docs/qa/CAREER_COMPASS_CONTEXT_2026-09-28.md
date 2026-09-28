# Bússola de Carreira — optional professional context

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-100. 2026-09-28.

Career intake now accepts optional reported context through `atv-natal-request/2`. The other four natal products retain v1. Existing career v1 commands remain valid and idempotent. Present context must contain non-whitespace text, valid Unicode, no disallowed controls and at most 1,200 UTF-16 units. Text is preserved exactly, not normalized. HTTP and SQL envelopes are bounded at 8,192 bytes; tests cover escaped Unicode at the field limit and oversized rejection before allocation.

## Verified locally

- Full web suite: **1,095 tests / 55 files PASS**, `test-results/wu100-web-unit.log`. Includes actual PostgreSQL-compatible PGlite tests for validation, exact immutable persistence, owner isolation, idempotency, reprocessing, forward-fix and reapplication. Focal pre-boundary run: 138 tests / 4 files PASS, `wu100-focal.log`.
- **27 browser tests PASS**, `test-results/wu100-e2e.log`: optional omission, exact submitted text, field bounds, consent invalidation on edit, uncertain acknowledgement, UUID-only session storage, reload/read-only recovery and clean subsequent entry. API transport is synthetic and loopback-only.
- Svelte/TypeScript check: **0 errors / 0 warnings**, `wu100-check.log`; scoped ESLint and Prettier PASS. Production build passes as the browser test's isolated web-server setup.
- Inspected career screenshots at **1440 / 820 / 390 / 320** in `apps/web/test-results/tests-natal-intake.e2e.ts--*/career-compass-intake-*.png`: readable field/help, visible keyboard focus, responsive reflow and explicit consent/limitations, no horizontal overflow. Stitch composition remains ID-02 `133f01c9992f4ebc9ad46dbabd1746ec` + SH-02 `7d41b4e1322349109a91363bb7c2df2b`.
- WU099 commit `b05c38f76d4a695c4f51d5d77b10d8317ddf86fd` independently confirmed: secrets `109028066176`, quality `109028065746`, Pages `109029508588`, all completed/success.

## Data boundaries and recovery

Consent applies to this request only. The report is neither saved in browser storage nor copied into the natal profile or ATV+ memory. Editing it requires renewed consent; request drafts are cleared after an attempt. Private run input and command receipt retain the exact report, while pending Library reads and metrics do not expose it.

The vertical test proves input → persisted command/run → experimental MC calculation → AWAITING_EDITORIAL → owner-scoped Library/recovery → independent reprocess. The report becomes a `reported` fact sourced from `input.context`, never an astrological measurement. Identical birth inputs produce identical MC data with or without the report. There is no approved interpretation in this path.

Migration `20260928180000_career_compass_context.sql` is paired with `supabase/forward-fixes/disable_career_compass_context.sql`: disabling new v2 writes preserves existing records and read-only recovery, restores five-product v1 behavior, and reapplication restores idempotent v2 recovery even with release flags closed. Prior WU099 SQL changes only remove redundant final blank lines.

**INTAKE_LOCAL_QA_PASS / NOT_FULL_VISUAL_PASS**. These are local contracts, not hosted JWT/PostgREST, full Gate B, motor or model homologation. No hosted migration, paid call, release activation, scheduler, email dispatch, production READY result or automatic ATV+ continuity. No model is homologated; publication remains blocked.
