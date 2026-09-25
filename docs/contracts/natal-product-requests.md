# Natal profile to product — atv-natal-request/1

Local implementation only. Four partial bases: birth-chart, three-pillars, ascendant and midheaven. All existing release, engine, editorial and artifact gates remain disabled. This does not homologate a product or model.

## Command and atomic snapshot

`POST /api/workflows/natal` accepts exactly `{requestKey,input}`. `input` has `version: atv-natal-request/1`, one supported `productId`, positive integer `expectedRevision` below 2147483647 and explicit product consent `{storage:true,policyVersion:atv-input-consent/1,partner:false,continuity:false}`. No owner, birth coordinates, time precision, context or profile version can be injected by the caller. Consent to save the profile does not substitute for this product consent.

Claims, same origin, JSON size (4096 bytes) and structural validation precede the RPC. Responses are private/no-store/no-referrer/noindex. A 202 contains only `runId`, not a delivered result. Errors expose only fixed codes, never raw SQL or birth data.

`request_natal_product_run` independently validates the command, acquires the same owner advisory lock as the existing request RPC and then locks the active account profile. It checks the expected onboarding revision and reads only the current profile with a valid storage receipt. Missing/forgotten/legacy-unconsented profiles are rejected. Only `EXACT` is accepted; `APPROXIMATE` and unknown time cannot become an exact input by projection. The six BirthInput fields are copied explicitly; location labels/country/precision are not silently cast into that contract. The deterministic worker still independently validates calendar, civil/UTC correspondence, coordinates and its experimental engine contract.

The existing request RPC enforces release, entitlement and quota and atomically creates the immutable input, run, event and Library item. A private `natal_product_requests` receipt binds the run to the exact command and natal version. It contains no duplicate birth data, but is account-associated information, not anonymous telemetry. All client/service direct receipt access is revoked; only authenticated callers may execute the scoped RPC. No service issuer, scheduler or model call is introduced.

## Idempotency, retention and rollback

The same owner/key/command returns the original run even after a profile edit/forget or release revocation. It never takes a new snapshot. A changed command or collision with a generic request key is an idempotency conflict. Inactive account profiles cannot submit or retry. New keys must validate the current profile and all gates afresh. The client must retain the correlation UUID before submitting and use the existing read-only recovery endpoint after an uncertain acknowledgement; backend idempotency is not permission to automatically replay a mutation.

Forgetting natal onboarding does not delete an existing product snapshot or its provenance receipt. Deleting the product run cascades its receipt. The UI must explain these independent scopes. Quota refusal or any transactional failure leaves no partial receipt. `supabase/forward-fixes/disable_natal_product_requests.sql` revokes this RPC without deleting runs, receipts, Library or read-only recovery. It does not restore bypass writes or alter the previous generic request contract.

Migration `20260925160000_natal_product_requests.sql` and forward-fix were tested only with synthetic local PostgreSQL. Independent connection concurrency, real hosted JWT/PostgREST, retention review and hosted migration remain pending. Lock ordering is implemented, not a certified hosted concurrency test.
