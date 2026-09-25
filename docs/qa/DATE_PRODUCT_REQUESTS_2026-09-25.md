# Leitura de Data bridge — local QA

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-061. 2026-09-25.

Sixteen integration scenarios exercise real PostgreSQL/RLS and HTTP handlers with synthetic claims on one PGlite connection. Four accepted date cases include both limits and leap years; negative matrices independently exercise HTTP and SQL date/calendar validation, unknown fields, consent and revision. Coverage includes exact-profile requirements, profile changes/removal, immutable idempotency, natal/generic key collisions, ownership, anonymous/service denial, quota/entitlement/release refusal, fixed error redaction, cascade deletion and the write-revoking forward-fix.

- Focal: **16 PASS** (`test-results/wu061-focal.log`).
- Full web: **431 tests / 31 files PASS** (`test-results/wu061-web.log`).
- Svelte check: **0 errors, 0 warnings** (`test-results/wu061-check.log`).
- Scoped ESLint and Prettier: PASS after removing an unused fixture variable.
- Production build: exit 0 (`test-results/wu061-build.log`); existing `_routes.json` exclusion warning remains.

WU-060 remote checks on `7eb1e7b3461c892e24cb5030bf41643d8f2e1c9b`: quality `108115533463`, secrets `108115533789`, Pages `108115978410`, all completed/success.

No UI changes, hosted migration, concurrent-connection certification, model homologation, release activation or approved output. This bridge ends at QUEUED. Date intake/controller and runtime-to-Library integration follow separately, without representing the 12:00 UTC sample as a local-day forecast.
