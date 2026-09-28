# WU-095 — private email composition

RUN_ID: ATV-20260902-170644Z-01A0630F

## Scope

Pure server-only `atv-email-message/1.0.0`: fixed Portuguese plain-text account Library link, exact version/request basis and local SHA-256 integrity metadata. No recipient address or reading content. Configuration absent by default; no request-derived origin. Prepared is not sent, delivered or authorized. No runtime route calls the composer yet.

## Local evidence

- `test-results/wu095-focal.log`: 24 tests passed, including three local PostgreSQL integration cases.
- `test-results/wu095-web.log`: 1,011 tests / 52 files passed; includes unrelated concurrent test files, not included in the commit.
- `test-results/wu095-check.log`: generated bindings current; Svelte check zero errors and warnings. Wrangler 4.128.0, existing check only, no configuration change.
- Focused ESLint and Prettier check passed for all three source/test files. No global lint or new visual Gate B claimed.
- Unit coverage: absent/invalid origins, no fetch, hostile private text excluded, no identifiers/headers in customer message, exact digests, snapshot capture, malformed/stale/cancelled receipts and withheld/unlinked readings.
- SQL coverage: real owner-scoped reader/receipt projections; other owner gets neither; preparation leaves receipts unchanged; cancellation, release revocation and cascade deletion prevent subsequent preparation. Receipt recovery remains available after revocation.

Tests use synthetic local releases/promotions exclusively. They do not certify hosted JWT/PostgREST, concurrency, verified email identity, actual recipient consent freshness, provider transport or inbox delivery. Hashes are not signatures or authorization. A prepared snapshot cannot bypass fresh dispatch checks.

No migration, UI change, hosted call, scheduler, email send, model call/promotion, paid feature or release activation. Production acceptance and AI remain default-off. Concurrent integration/admin changes were preserved and are excluded from this work unit.
