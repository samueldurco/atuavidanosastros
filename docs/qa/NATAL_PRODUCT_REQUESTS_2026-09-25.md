# WU-058 — natal profile → product request

RUN_ID: ATV-20260902-170644Z-01A0630F. Synthetic local fixtures only.

## Evidence

- 13 PostgreSQL/HTTP integration tests cover four supported products, exact immutable birth projection, minimal provenance/consent receipt, event and Library transaction.
- Approximate time, legacy/no consent, forgotten profile, stale revision, forged owner/birth/precision, invalid products/versions/consent and extra/oversized HTTP data are refused before persistence.
- Release, entitlement and pending quota stay authoritative. Same-key retry after a committed-but-lost acknowledgement, profile forget and release revocation returns the original snapshot; changed command and generic-key collision fail.
- Different owners cannot share lineage even with the same correlation UUID. Anonymous/service execution and all direct receipt access fail. Inactive profiles cannot retry. Run deletion cascades the receipt; forward-fix preserves read-only recovery and existing snapshots.
- Full web suite: 366 tests / 28 files PASS (`test-results/wu058-web.log`). Focused run: 13 PASS (`wu058-focal.log`). No UI or engine logic changed in this WU.
- Svelte check: zero errors/warnings (`wu058-check.log`). Production build completed (`wu058-build.log`); existing warning about 24 discarded `_routes.json` excludes remains open, not a hosted cost certification.

## Limits

Authentication/HTTP transport is a synthetic adapter around real PGlite SQL on one connection, not hosted JWT/PostgREST or simultaneous connection certification. This unit stops at QUEUED; prior worker/calculation tests do not by themselves certify this new bridge's full runtime/UI integration. UI binding is the next unit. No migration applied to hosted databases. No release/promotion/engine/artifact policy enabled; no model homologated or paid call made.
