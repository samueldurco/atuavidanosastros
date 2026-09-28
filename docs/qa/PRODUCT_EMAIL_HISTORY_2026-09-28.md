# Durable email receipt discovery — WU072

RUN_ID: ATV-20260902-170644Z-01A0630F.

## Scope

Read-only authenticated owner/run receipt history without a browser key. At most eight descending revisions, minimal receipt fields, no address, consent, command, recovery key or reading content. Unknown and unowned runs produce identical empty lists. Profile/release revocation does not prevent discovery and cancellation. Acceptance and dispatch remain disabled; no hosted migration.

## Evidence

- 71 focal HTTP/parser/PostgreSQL integration tests PASS (`test-results/wu072-focal.log`). Includes actual handler → local PostgreSQL lost acknowledgement, lost key, advanced revision, revoked gates/profile, owner isolation, cancellation and run deletion.
- 16 SQL tests PASS (`test-results/wu072-db.log`): original acceptance suite plus discovery privileges, no mutation, eight-revision ordering/constraints and independent forward-fixes. Synthetic retained-revision seeds test bounds, not acceptance of all revisions.
- 717 web tests / 39 files PASS (`test-results/wu072-web.log`).
- Type check: zero errors/warnings (`test-results/wu072-check-final.log`). Initial check caught unknown JSON destructuring in the new integration test; replaced with strict history parsing. Scoped ESLint PASS (`test-results/wu072-lint.log`).
- Local build PASS (`test-results/wu072-build.log`), Wrangler 4.128.0. Existing warning about 24 excluded routing rules remains; no configuration or release gate changed.

## Limits

Backend-only change; browser history controls are the next WU. Existing exact-key UI remains unchanged. Local single-connection PGlite tests do not certify hosted JWT/PostgREST or independent concurrent transactions. No model/prompt promotion, email transport, paid call, scheduler or product release. No model is homologated. Unrelated concurrent work is preserved.
