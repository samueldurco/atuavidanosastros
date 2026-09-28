# Owner-requested reading email — atv-email-request/1

This contract records an explicit transactional-delivery request, not an email delivery. No transport, sender, provider, credential, scheduler, marketing enrollment or product release is enabled. Resend remains subject to the external-systems contract and production approval. The independent `product_email_policy` starts disabled and only controls accepting new requests; it never authorizes sending.

## Request and ownership

`request_product_email(p_request_key, p_command)` accepts exactly `version`, `runId`, `expectedRevision`, `reviewDigest`, and `consent`. Version is `atv-email-request/1`. Consent is exactly `{transactional:true,policyVersion:"atv-email-delivery/1",recipient:"account-owner"}`. Request key and run ID are UUIDs, revision is 1–8, and review digest is lowercase SHA-256. No address, subject, URL, HTML, attachment, provider, birth input or free text is accepted. Owner is derived only from authenticated SQL identity. Direct table access is revoked for clients and service role.

Creation requires an active account profile and a freshly released owner reading through `read_product_run`, with matching revision/review and an active Library item. Release, engine, contract and editorial promotion revocation close new requests. Existing reading access after commercial entitlement expiry follows the reader contract; requesting email does not grant entitlement. Profile, run and relevant policies are locked within the transaction.

The receipt stores the minimal command and owner/run/version linkage, with `REQUESTED` or `CANCELLED`, never `SENT` or `DELIVERED`. It stores no destination address or result content. A future dispatcher must resolve and verify the current owner's account email using a trusted identity channel, obtain any required confirmation after an address change, and check consent, gates, current version and cancellation immediately before sending. A receipt alone is not dispatch permission.

## Recovery, cancellation and bounds

Same owner/key/identical command returns the original receipt, including cancellation, after release/policy revocation; it never creates another request. An inactive account cannot create or replay a mutation, but can recover or cancel its existing receipt. Changed commands conflict. One request is permitted per run/revision, including cancelled requests; new keys cannot silently resend or re-enroll. A reprocessed run requires its own explicit request. Limits are 20 requests per owner per rolling 24 hours and 100 retained receipts, including cancelled requests. Exact-key recovery remains valid at capacity.

`read_product_email_request(p_request_key)` is read-only, owner-scoped and remains available after gate revocation. `cancel_product_email_request(p_id)` is idempotent and owner-scoped; cancellation is final for this contract, even when acceptance is disabled. Both return only receipt ID, run ID, revision, review digest, state and creation/cancellation timestamps. Deleting a run cascades its receipt. Neither deletion nor cancellation can recall a future email already accepted by a provider; no provider acceptance currently exists.

The forward-fix disables acceptance and revokes only request execution, preserving recovery/cancellation and all records. No hosted migration has been applied. Synthetic single-connection PostgreSQL tests are not certification of hosted JWT/PostgREST or concurrent independent connections.

## HTTP boundary

Three fixed POST paths under `/api/product-email/`: `request` accepts `{requestKey,command}`, `recover` accepts `{requestKey}` and `cancel` accepts `{receiptId}`. UUIDs never appear in URL parameters or query strings. Every operation requires same-origin headers, rejects cross-site fetches and queries, validates server session claims, bounds JSON to 3072 actual UTF-8 bytes, and permits no extra fields. SQL derives ownership; no service credential is used. Each RPC has a 10-second abort signal; unknown failures are redacted and never automatically retried.

Success is `{receipt}`: acceptance returns 202, recovery/cancellation return 200 and may return null for an absent or unowned key/ID. Exact receipt fields, version linkage, state and timestamps are validated before return. REQUESTED and CANCELLED never mean sent or delivered. Private/no-store, no-referrer and noindex headers apply to success and error responses. A 503 may represent a committed request whose acknowledgement was lost: recover the original key before any new submission. The HTTP boundary does not enable acceptance or implement browser controls/transport.

## Browser request controller

`createProductEmailRequest` requires explicit availability and fresh transactional consent for a new request. Availability is a UX hint, never authorization: SQL still rechecks every gate. The controller stores only the recovery UUID in tab storage, scoped to canonical owner/run/revision; it stores no address, consent, reading, digest or receipt. Storage must succeed and read back before POST. Missing, corrupt or replaced remembered keys fail closed.

Existing keys always recover through the read-only endpoint, including after reload, expired sessions, disabled acceptance and changed editorial review. Recovery validates run/revision and receipt identity, not current review eligibility; cancelling an older review must remain possible. Only a new acceptance must match the pinned review digest. A recovered receipt is not proof of current release or delivery permission. One in-flight action is allowed per controller; database uniqueness remains authoritative across tabs/devices.

Timeouts, invalid responses, conflicts and lost acknowledgements retain the key. They never generate another key or automatically retry. Only an exact allowlisted pre-write refusal to a freshly generated key permits removing it. Missing recovery results also retain the key. Cancellation requires an acknowledged receipt, clears that acknowledgement while pending, and requires read-only recovery on uncertainty. Confirmed cancellation is final and cannot be regressed by a later stale response. No reset/resend action exists in this controller.

## Library controls

The authenticated workflow reader supplies the verified owner ID, not an address, to a keyed controller. The email section and index remain present even if the reading is withheld. A null editorial digest permits existing-key recovery/cancellation with strict owner/run/revision validation; it never permits a new request. Non-null malformed digests remain rejected. Production controls default to `allowNew=false`, without consulting or enabling acceptance policy. Synthetic reader fixtures cannot issue mutations. The localhost-only email fixture enables consent controls solely for synthetic intercepted tests; the actual endpoints still demand an authenticated owner and SQL authorization.

No automatic POST occurs on mount. Consultation and cancellation are explicit, with one pending action, disabled conflicting reader actions, live feedback and keyboard focus after completion. Consent starts unchecked and is cleared after each completed action; it is never restored from storage. A receipt is described only as registered or cancelled, never delivered. Controls retain an uncertain key through reload and cannot resend or reset it.

Recovery is currently limited to this tab's retained UUID for the same owner/run/revision. Losing the tab key, another device or an advanced run revision is not receipt discovery. The UI discloses this limitation; a future owner-scoped durable lookup is required for cross-session recovery. Cancelling does not disclose the withheld reading or restore its release. No transport or hosted migration is introduced by the reader.

## Remaining delivery requirements

A future email should contain a minimal account Library link, not reading content, public result tokens or attachments by default. Origin/sender must be fixed trusted configuration, not request input. The provider integration needs recipient verification, secrets rotation, approved spend/rate/latency caps, deduplication and uncertain-ack reconciliation, bounce/complaint handling and privacy-safe observability. Provider acceptance must never be called inbox delivery. Actual dispatch remains separate work; until implemented this receipt is not an advertised delivered email.
