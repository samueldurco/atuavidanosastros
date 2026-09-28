# Owner email request controller — WU070

RUN_ID: ATV-20260902-170644Z-01A0630F.

## Evidence

- UUID-only tab storage, owner/run/revision isolation, explicit new-request consent, pinned acceptance, read-only recovery and final cancellation. No address, message content, transport or dispatch.
- 98 focused tests pass: 48 controller cases, 40 HTTP/parser cases, ten real PostgreSQL scenarios (four now connect browser controller → route handlers → SQL).
- Integration covers disabled policy despite browser availability, lost commit acknowledgement followed by remount, recovery/cancellation after profile and release revocation, lost cancellation acknowledgement and session/owner isolation. One stored UUID and one database receipt survive uncertainty; no automatic mutation replay.
- 689 web tests / 39 files pass. Svelte check reports zero errors/warnings. Scoped ESLint and Prettier pass. Build evidence in `test-results/wu070-build.log`; existing adapter excluded-routes warning is not a new release gate approval.
- Local logs: `test-results/wu070-{focal,web,check,lint,format,build}.log`.

## Limits

No visual controls changed yet. HTTP is exercised through an in-process fetch adapter and real single-connection PostgreSQL, not hosted JWT/PostgREST or independent-tab concurrency certification. The controller needs the reading owner/version context from an authenticated reader and sessionStorage from that tab. There is no reset/resend or cross-device receipt discovery in this unit. SQL acceptance remains false, no hosted migration, no delivery provider, no spend or model promotion. Unrelated concurrent changes are preserved.
