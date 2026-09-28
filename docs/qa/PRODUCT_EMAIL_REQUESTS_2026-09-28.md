# Product email acceptance receipts — WU068

RUN_ID: ATV-20260902-170644Z-01A0630F.

## Implemented

Private owner-scoped SQL receipts for explicit transactional email requests, pinned to a released reading revision/review and active Library membership. Strict minimal command, UUID idempotency, final cancellation, read-only recovery, 20/24h and 100-retained limits, deletion cascade and emergency forward-fix. Acceptance defaults disabled; no sender, recipient address, provider, content, dispatch or hosted migration exists.

## Evidence

- `pnpm test:db`: 58 tests passed, zero failures; full local evidence `test-results/wu068-db.log`.
- Nine email scenarios cover ACL/RLS, anonymous/service refusal, authentication, injected payloads, consent, ownership, current engine/release/promotion/Library gates, inactive profiles, lost acknowledgement, conflicting retries, cancelled receipts, capacity, deletion and forward-fix.
- Initial retained-cap fixture hit the separate product-run quota. Corrected the synthetic setup to seed historical revisions across bounded runs, with guaranteed cleanup; production quotas unchanged.
- The projection helper is STABLE, not IMMUTABLE: JSON timestamp rendering depends on session timezone.
- Email suite included in root `test:db`, and therefore existing quality CI.
- No web runtime/UI changes; prior WU067 web/check evidence remains applicable. No claim of browser delivery or inbox receipt.

## Limits

PGlite synthetic single-connection checks do not certify hosted JWT/PostgREST or multi-connection races. Hosted migration, recipient verification, opt-in UI, HTTP boundary and provider transport are separate work. No model is homologated and no release, engine, editorial or artifact gate was opened. Concurrent unrelated work remains untouched.
