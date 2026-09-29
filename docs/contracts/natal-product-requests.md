# Natal profile to product — atv-natal-request/1–/4

Local implementation only. Seven profile-backed partial bases: birth-chart, three-pillars, ascendant, midheaven, career-compass, purpose-career and life-atlas. All existing release, engine, editorial and artifact gates remain disabled. This does not homologate a product or model.

## Command and atomic snapshot

`POST /api/workflows/natal` accepts exactly `{requestKey,input}`. `input` has a supported version, one product ID allowed by that version, positive integer `expectedRevision` below 2147483647 and explicit product consent `{storage:true,policyVersion:atv-input-consent/1,partner:false,continuity:false}`. No owner, birth coordinates, time precision or profile version can be injected by the caller. Optional context is accepted only by versions 2–4 under their explicit bounds. Consent to save the profile does not substitute for this product consent.

Claims, same origin, JSON size (8192 bytes, including escaped Unicode) and structural validation precede the RPC. Responses are private/no-store/no-referrer/noindex. A 202 contains only `runId`, not a delivered result. Errors expose only fixed codes, never raw SQL, birth data or professional context.

`request_natal_product_run` independently validates the command, acquires the same owner advisory lock as the existing request RPC and then locks the active account profile. It checks the expected onboarding revision and reads only the current profile with a valid storage receipt. Missing/forgotten/legacy-unconsented profiles are rejected. Only `EXACT` is accepted; `APPROXIMATE` and unknown time cannot become an exact input by projection. The six BirthInput fields are copied explicitly; location labels/country/precision are not silently cast into that contract. The deterministic worker still independently validates calendar, civil/UTC correspondence, coordinates and its experimental engine contract.

The existing request RPC enforces release, entitlement and quota and atomically creates the immutable input, run, event and Library item. A private `natal_product_requests` receipt binds the run to the exact command and natal version. It contains no duplicate birth data, but is account-associated information, not anonymous telemetry. All client/service direct receipt access is revoked; only authenticated callers may execute the scoped RPC. No service issuer, scheduler or model call is introduced.

## Idempotency, retention and rollback

The same owner/key/command returns the original run even after a profile edit/forget or release revocation. It never takes a new snapshot. A changed command or collision with a generic request key is an idempotency conflict. Inactive account profiles cannot submit or retry. New keys must validate the current profile and all gates afresh. The client must retain the correlation UUID before submitting and use the existing read-only recovery endpoint after an uncertain acknowledgement; backend idempotency is not permission to automatically replay a mutation.

Forgetting natal onboarding does not delete an existing product snapshot or its provenance receipt. Deleting the product run cascades its receipt. The UI must explain these independent scopes. Quota refusal or any transactional failure leaves no partial receipt. `supabase/forward-fixes/disable_natal_product_requests.sql` revokes this RPC without deleting runs, receipts, Library or read-only recovery. It does not restore bypass writes or alter the previous generic request contract.

Migration `20260925160000_natal_product_requests.sql` and forward-fix were tested only with synthetic local PostgreSQL. Independent connection concurrency, real hosted JWT/PostgREST, retention review and hosted migration remain pending. Lock ordering is implemented, not a certified hosted concurrency test.

## Authenticated intake and read-only recovery

`/biblioteca/nova/{birth-chart,three-pillars,ascendant,midheaven,career-compass,purpose-career,life-atlas}` authenticates before reading the minimal release/access projection. It does not preload natal data into page data. The user explicitly reads `/api/onboarding`, reviews the saved exact profile and separately consents to the product snapshot. A reported exact time is not engine certification. Missing, approximate, malformed or unavailable profiles cannot enable creation. No geocoder, time correction or inference of unknown birth time is added.

The browser sends only the strict command above. It stores only a correlation UUID in `sessionStorage` under the same owner/product slot used by generic creation. Natal data, consent and commands are not stored there. Controls remain disabled until recovery initialization. A pending UUID permits read-only recovery, never automatic resubmission; recovery remains available after profile removal or release/access revocation. A 202 must be verified through the existing recovery and root-run reader before a Library link appears.

Every attempted creation clears the displayed profile and checkbox. Another attempt requires an explicit fresh profile read and fresh consent. Only recognized pre-write refusals may clear a fresh pending key; an idempotency conflict, malformed acknowledgement or uncertain network failure preserves it. A profile revision conflict cannot silently use changed data. Preparing another request is available only after the original request has been located and verified.

The shared Library links expose availability consultation, not a release promise. PDF/audio/download delivery and ATV+ continuity are not implied by saving a request. Intake E2E uses loopback-only synthetic API fixtures; it does not certify hosted persistence or end-to-end editorial delivery.

## Career compass expansion (WU099)

Migration `20260928170000_career_compass_requests.sql` expands only the product allowlist of the existing function; the v1 command shape, exact-profile requirement, locks, quotas, owner isolation and grants are unchanged. It does not enable any release or engine. Professional context is not accepted in v1. The experimental MC calculation is described in `career-compass-calculation.md`. Public direction, work environments, tensions and practical questions still require approved interpretation and are not produced by this intake.

`supabase/forward-fixes/disable_career_compass_requests.sql` restores the four-product allowlist without deleting existing career snapshots, receipts or Library items. It rejects career writes, including same-key command retries; existing read-only recovery remains available. Original four products retain their normal gates. Reapplying the expansion restores idempotent same-key recovery without enabling releases. Both paths are tested locally with synthetic PostgreSQL; no hosted migration or real identity/concurrency certification is implied.

## Optional professional context (WU100)

Migration `20260928180000_career_compass_context.sql` preserves v1 for all five products and adds `atv-natal-request/2` exclusively for `career-compass`. Its four required fields are unchanged; only this version/product accepts a fifth optional `context` string. Omission is valid. A present value must contain non-whitespace text, have at most 1200 UTF-16 code units, valid Unicode and no C0/C1 controls except tab, LF and CR. Whitespace is preserved exactly, not normalized. SQL and TypeScript independently enforce the same boundaries; malformed Unicode is additionally rejected by PostgreSQL JSON parsing. There is no owner/birth/profile field injection or context alias.

The career intake sends v2, omits an empty field, resets consent when the draft changes and clears the in-memory draft after an attempt. It never stores the report in browser storage. The checkbox explicitly authorizes storing the optional report with this request, not in the natal profile or ATV+ memory. The immutable run input and private command receipt retain it, so both are personal account data; forgetting natal onboarding does not erase them. Existing account/run deletion and retention constraints still apply.

The calculator emits context only as `kind: reported`, source `input.context`; it cannot alter MC geometry or become an astrological finding. Pending Library/recovery responses and metrics do not expose the report. Reprocessing uses the original snapshot, not new profile data or a new report. No model, prompt promotion, provider call or artifact release is added.

`supabase/forward-fixes/disable_career_compass_context.sql` restores the five-product v1 command. It refuses all v2 writes, including idempotent command retries, but preserves runs, receipts and read-only recovery. Reapplying migration 100 restores exact v2 idempotency even after release closure; new keys still fail closed. This is local synthetic evidence, not a hosted migration or concurrency certification.

## Mapa de Propósito & Carreira intake (WU205)

Migration `20260929210000_purpose_career_context.sql` preserves v1 for the five prior products and v2 exclusively for `career-compass`. It adds `atv-natal-request/3` exclusively for `purpose-career`, with the same four required fields and an optional professional `context` under the v2 size, Unicode and control-character boundaries. Purpose cannot use v1 or v2. No caller-supplied birth, owner, profile version or precision is accepted. The private RPC still takes the current exact, consented profile under its lock and delegates release, entitlement and quota to `request_product_run`.

`/biblioteca/nova/purpose-career` uses the existing authenticated natal intake. It shows the saved profile, collects separate product consent and an optional first-person professional report, then sends v3. The report is retained exactly in the immutable run input and private command receipt; it is not added to the natal profile or ATV+ memory. The displayed calculation remains a partial experimental base, not a reading or career prescription. A local synthetic test may temporarily set a free access policy to prove the transport; the paid entitlement gate is separately tested and no live release is enabled.

`supabase/forward-fixes/disable_purpose_career_context.sql` restores the v2 function, refusing v3 writes and same-key mutation retries while leaving old runs, receipts and read-only recovery intact. Reapplying the v3 migration restores exact idempotent retries, including after release closure; new keys still fail closed. Local PGlite and web vertical tests cover this behavior. Hosted migration, identity, concurrency, retention review and release remain pending.

## Atlas da Vida 360 priorities (WU211)

Migration `20260929220000_life_atlas_priorities.sql` preserves v1–v3 and adds `atv-natal-request/4` exclusively for `life-atlas`. The command requires `atlas.priorities`: four ordered, nonempty, distinct first-person labels of at most 120 UTF-16 code units. Unicode NFKC, external whitespace and case are used only to detect duplicates; the original text is retained. C0/C1 controls and extra fields are rejected. An optional `context` follows the v2/v3 report boundaries. The client and RPC validate independently; the RPC copies these fields and the current exact natal snapshot into one private immutable run and receipt.

`/biblioteca/nova/life-atlas` asks for the four priorities, optional context and separate consent to retain them with the snapshot. Drafts are cleared after submission; the session stores only the correlation UUID. The values are declared priorities, not inferred astrological facts. No method for connecting the four areas to chart chapters or generating a 30-day path has been approved, so E1 remains partial and downstream reading/delivery gates remain closed.

`supabase/forward-fixes/disable_life_atlas_priorities.sql` disables Atlas release and restores the v3 command function. It refuses v4 writes while retaining old runs, receipts and read-only recovery. Reapplying v4 restores same-key idempotency; new keys remain closed. These paths were tested against synthetic local PostgreSQL. Hosted migration, real identity, independent concurrency, retention review and release remain pending.
