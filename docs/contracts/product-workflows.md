# Product workflows — atv-workflow/1.0.0

Status: implementation contract, **not a production release**. All 25 product definitions across the six universes are disabled; the editorial promotion registry remains empty. This work does not deliver 25 finished readings.

## Ownership and durability

`WorkflowInput` discriminates product families, bounds free text, requires storage-policy consent and explicitly separates partner consent and optional longitudinal consent. The worker must also validate civil time/UTC/coordinates with the deterministic engine before calculation; database acceptance alone does not validate astronomical input. Third-party names are not required.

`request_product_run` atomically creates a run, its first event and its Library reference. A UUID idempotency key belongs to one owner and exact original request. An owner-scoped advisory transaction lock serializes quota checks: at most 50 new versions/day and 15 pending versions. Paid definitions additionally require an active entitlement within its validity window; the RPC cannot grant access. Definitions and promotions have no client/service-role write grants.

State progression is QUEUED → CALCULATED → AWAITING_EDITORIAL → READY. Pending states may fail or cancel. READY/FAILED/CANCELLED are terminal. Service transitions use fenced calculation/publication RPCs, expected revision and row locking; every accepted transition appends an event. A calculation snapshot is immutable. READY requires an enabled definition, a current product/contract promotion and a reviewed editorial output. Astrological products also require engine approval, regardless of a caller-supplied calculation status. WU-045 adds a local/versioned publication RPC behind an independent false policy and private authority-owned receipts; no hosted publication service is active.

## Natal product calculations — WU-033

`createNatalCalculators()` registers birth-chart, three-pillars, ascendant and midheaven with the existing experimental engine. Product projections preserve exact selected positions and copied provenance, validate civil/UTC correspondence and label contextual statements as reported. Tropical signs use half-open 30-degree sectors, without rounding display into the next sign. No aspect policy or interpretation is inferred. Outside the conservative house/angle contract, ASC and cusps are withheld rather than substituted; MC remains separately computed and experimental when requested. The original engine contract and all publication gates still apply. See `docs/qa/NATAL_PRODUCT_CALCULATORS_2026-09-14.md`.

## Partial contextual calculations — WU-036

`createContextCalculators()` adds `pair-preview` and `date-reading` only. Pair projects separate Moon/Venus/Mars positions for A and B; storage consent is not sharing authorization. Date projects natal positions plus one explicitly labelled 12:00 UTC sample, not a local-day window or event search. Both inputs are validated before computation; both chart outputs independently satisfy the experimental contract and are copied before another provider call. No aspects, compatibility, inferred role or interpretation is produced. These are partial bases, not completed verticals. Astrology reprocessing uses the original input for a new calculation/run; only Tarot has frozen-draw reuse under the existing SQL policy. See `docs/qa/CONTEXT_PRODUCT_CALCULATORS_2026-09-14.md`.

## Symbolic calculations — WU-032

`createSymbolicCalculators()` registers daily-card, three-questions, dream-reading and dream-journal with the portable processor. This is not hosted runtime wiring or a release flag. Tarot snapshots identify the candidate deck, algorithm and spread versions. A server-created UUID seeds SHA-256 counter words; rejection sampling and partial Fisher–Yates draw unique cards, independent of question text. One upright card per question is a candidate policy requiring editorial review. Only new requests draw; reprocessing preserves the saved snapshot.

Dream snapshots keep reported narrative, emotions, associations and context distinct from interpretations. No universal symbol meaning, inferred emotion, clinical diagnosis or recurrence is generated. Continuity consent is recorded, but historyLoaded and recurrenceAssessed remain false. All four adapters stop before editorial publication and retain the empty promotion registry. See `docs/qa/SYMBOLIC_CALCULATORS_2026-09-14.md` for local verification and limits.

## Recovery and privacy

### Lost submission acknowledgement — WU-053

`POST /api/workflows/recover` accepts only `{requestKey}` in a bounded, same-origin authenticated body; the key must never be placed in a URL. The read-only owner-scoped `recover_product_request` RPC returns only `runId`, `productId` and a nullable unarchived `libraryItemId`. It never returns input, calculation, editorial content or a release decision. The original authenticated owner may recover identifiers after a release is revoked; opening the result still uses the existing gated reader. Anonymous/service-role execution and raw client reads remain forbidden. Soft-deleted profiles and missing/deleted runs return null; archived Library references are not resurrected.

Null means **not found at this read**, not proof that a submission failed: the original transaction may still be in flight. A client must retain the original correlation key and must not automatically resubmit input, rotate the key or claim delivery after an uncertain acknowledgement. Backend/auth/projection failures remain errors, never not-found. Recovery does not create a run/event/reference or process a pending run. Forward-fix revokes this RPC without deleting history or disabling the prior owner reader. Local PostgreSQL + HTTP evidence: `docs/qa/PRODUCT_REQUEST_RECOVERY_2026-09-24.md`. No hosted migration or real JWT/PostgREST certification is implied.

### Library reprocessing recovery — WU-054

The Library client persists only a correlation UUID under `atv-reprocess:<source-run-id>` in sessionStorage before submitting a new reprocess request. Existing keys, including legacy keys, allow read-only recovery only. A lost acknowledgement, timeout, null lookup, malformed response or backend error never rotates the key or retries the mutation. Only exact, known pre-write refusals for a freshly generated key permit clearing it. Storage denial, invalid keys or observed replacement/removal fail closed. No personal input or interpretation is stored in the browser.

Recovery checks the returned product and, through the existing authenticated reader, the child ID, source parent ID and active Library reference before navigating. A 202 acknowledgement alone does not prove delivery. A revoked release can still be consulted without permitting a new reprocess. Pending actions lock other reader mutations; feedback is focusable and announced. Local tests mock browser transport and do not certify hosted authentication.

This is session-scoped protection, not a distributed duplicate-prevention guarantee: closing the tab, clearing storage before a new page load, using another device or independent concurrent tabs can lose coordination. The owner must check the Library before starting elsewhere. The server's existing request-key idempotency and quota checks remain authoritative. No first-submission form, model release, hosted migration or scheduler is introduced. Evidence: `docs/qa/PRODUCT_REPROCESS_RECOVERY_2026-09-25.md`.

### First-submission recovery controller — WU-055

The shared controller validates the exact domain input and the 20,000-byte UTF-8 HTTP body before writing a root request. Only its correlation UUID is stored under `atv-create:<owner-id>:<product-id>`; no input draft is persisted. Existing keys permit recovery only, even if input or release eligibility changed. Recovery checks the product, root lineage (null parent), run and active Library reference through the owner reader. A verified lookup permits an explicit `startAnother` action, never automatic key rotation. Uncertain, missing, archived or malformed lookups cannot authorize another request. Late refusals cannot erase a replaced storage key. The Library reprocessing wrapper retains its legacy key and interface.

The session-only limitations above still apply. This is infrastructure for the first-input UI, not a released product or completed intake form. BirthInput precision is unchanged; approximate profile data must not be silently converted into exact birth data. Local HTTP/PostgreSQL tests cover an acknowledged transaction whose response is lost, recovery after release revocation, a real pre-write refusal and a separate intentional root request. Evidence: `docs/qa/PRODUCT_FIRST_REQUEST_RECOVERY_2026-09-25.md`.

### Calculation to Editorial Director evidence — WU-034

`prepareProductFacts` maps a validated persisted snapshot to the six Lab capabilities without changing facts or carrying raw data/history. Current scope is always partial; facts exceeding the tighter Lab bounds are explicitly blocked. `evaluateProductDraft` reuses schema and mechanical review, binds review to a SHA-256 of run/revision/product/tier/calculation/provenance/facts/reading/version labels, and requires server-owned reviewer/calibration authority. An otherwise passing review is only a reviewed candidate: publication remains blocked pending independently verified promotion and engine gates. It performs no provider call or persistence transition. See `docs/qa/PRODUCT_EDITORIAL_EVIDENCE_2026-09-14.md` for evidence and remaining boundaries.

Reprocessing creates a new run linked to the owned prior version. It copies the original input, never overwrites a result, and reuses a persisted Tarot draw. An interrupted calculation without a persisted snapshot is still QUEUED, not a delivered reading. A new draw is a new request, not reinterpretation.

## Durable calculation processing — WU-031

### Internal composition — WU-037

`createProductProcessor(rpc, options)` composes ten partial calculation bases behind an empty-by-default server-owned allowlist. It rejects invalid/unsupported/duplicate product IDs and deadlines, captures configuration against later mutation, and exposes one bounded `step()` with existing aggregate-only telemetry. The full catalog coverage report distinguishes partial bases from unavailable calculations and always states publication blocked. No scheduler or hosted transport is supplied. Database release/contract gates remain independently authoritative. See `docs/qa/PRODUCT_RUNTIME_2026-09-14.md` for the ten-product/six-universe local SQL integration proof.

Migration `20260914140000_product_run_processing.sql` enqueues work in the run-creation transaction and backfills pending calculations. The private work table has no client or service-role direct access. Three service-only RPCs claim, complete and fail one step. Claims filter enabled, matching-contract products supported by the caller; row locks with `SKIP LOCKED` keep an already claimed row out of another consumer's selection ([PostgreSQL SELECT documentation](https://www.postgresql.org/docs/current/sql-select.html)). Local tests cover sequential fencing, not simultaneous independent connections.

A random token fences a 60-second lease (SQL accepts 30–120 seconds). Completion requires the live token and expected revision. Token-keyed receipts make lost-response retries idempotent without changing the calculation. Five claims per run are the hard bound; safe transient failures defer the next claim by exponential backoff starting at five seconds. Expired leases can be reclaimed, exhausted work fails, invalid input/calculation fails permanently. Owner deletion cascades through work and prevents late completion.

The portable TypeScript processor takes an injected service RPC transport and product calculators. One invocation advances QUEUED → CALCULATED or validates the persisted snapshot and advances CALCULATED → AWAITING_EDITORIAL. It revalidates the full input and bounded JSON calculation, rejects non-finite numbers and self-approved astrology, and never redraws a stored Tarot snapshot. Deadline: 20 seconds by default, at most 25, plus a bounded three-second cleanup; adapters must respect AbortSignal. Telemetry contains only outcome, attempt and duration, never identifiers, inputs, results or raw exceptions. There is no model call, publication, price or entitlement decision.

The old unfenced `advance_product_run` service grant is revoked. This calculation processor intentionally stops at AWAITING_EDITORIAL. The separate WU-045 publication boundary below does not call a generator. A production RPC transport and scheduling are separate steps, not implied by the injectable implementation.

### Authority-owned editorial publication — WU-045

Migration `20260923110000_product_editorial_publication.sql` adds a private, false-by-default policy, review receipts and fenced work. Receipts bind the exact run/revision, full calculation, complete delivery snapshot, review/basis digests, promotion ID and promotion evidence digest. Approval validity is bounded to 24 hours. Only the database release authority can insert receipts: no issuer endpoint, application grant or service issuance RPC exists. Digests and an authority reference are integrity/audit data, **not authentication or proof of eval quality**. A future authenticated issuer must independently verify the WU-034 assessment, the exact final delivery representation, actual provider/model/prompt provenance and evidence-backed Lab promotion. That issuer remains a release blocker; synthetic test receipts never qualify.

The service-only `claim_product_editorial` returns only run/revision/receipt/token/deadline. Claims have 60-second random-token leases and a hard five-attempt bound. `complete_product_editorial` accepts no output, scores, owner, model, promotion or approval flag. It commits exclusively the authority-owned snapshot and appends one READY event, checking live policy, lease, revision, unchanged calculation, receipt validity/revocation, product contract, promotion evidence and engine approval in the transaction. Same-token completion retries return the original revision only while gates are still current. Abandoned/exhausted editorial work leaves the run AWAITING_EDITORIAL for operator investigation/reprocessing, never invented output or silent redraw. There is no automatic model invocation or retry loop.

Published runs retain a receipt FK. Receipt revocation, evidence replacement or snapshot mismatch closes the owner reader and private artifact read/list/write gates. Receipt expiry limits the publishing window, not future owner access to a valid delivered result. Owner deletion cascades through receipts/work; a receipt cannot be deleted to remove the published run's safety binding. Existing rows with no receipt retain prior read semantics; the sole service publisher always sets the binding atomically and the old unfenced writer remains revoked. The migration preserves existing reader/helper ACLs, including emergency revocations. Forward-fix `20260923110000_disable_product_editorial.sql` disables new publication without erasing owned history; withdrawing existing content additionally requires receipt/promotion/workflow revocation.

The authority transport, human-review authentication, pinned-model provenance verification, scheduler and hosted JWT/independent-connection tests remain pending. All 25 workflow releases, the artifact and editorial policies remain false in migrations; the model registry is empty. See `docs/adr/0006-reviewed-editorial-publication.md` and `docs/qa/PRODUCT_EDITORIAL_PUBLICATION_2026-09-23.md`.

RLS isolates runs/events by owner. Migration `20260914120000_product_run_reader.sql` additionally revokes client SELECT on raw runs. Retrieval is exclusively through the authenticated, owner-checking `read_product_run` projection: no raw input, calculation data blob, provider error or unpublished interpretation. The RPC returns history and state for pending/failed/revoked runs, but facts and editorial content only when READY and the current release, engine and exact promotion gates remain valid. Expired entitlement does not erase a previously delivered reading; reprocessing requires current access. Client direct inserts, updates and deletes are revoked; deletion is an owner-checking RPC that removes the selected version's Library reference and events. Other reprocessed versions remain separate records (parent becomes null); deletion of one version is not deletion of all copies. No raw input, reading or provider error may appear in observability logs.

The web boundary `/api/workflows` authenticates the session, checks same-origin mutations, bounds JSON input, preserves request idempotency and uses only owner RPCs. Reprocessing sends no new input and retries the original key. `/biblioteca/[id]` resolves an owned Library reference and verifies both run and Library IDs; the result is validated and escaped before rendering. Unreleased content is never shown as a finished reading. No download, audio or email is advertised as delivered without an actual artifact.

## Private web export — WU-035

`GET /api/workflows/[id]/download?format=web` authenticates and reads the current owner projection on every request. Only released, valid projections with catalog web eligibility render. No service-role read, cached authorization or public storage URL is accepted. Same-origin checks, strict query parameters, escaped content, restrictive CSP, attachment disposition and private/no-store headers protect the boundary. The response includes the export version and SHA-256 of its exact bytes, neither of which is a promotion credential.

The self-contained HTML preserves the authorized reading, facts, provenance, limits and revision history. It is generated on demand, not a persisted artifact manifest. An offline copy does not update and cannot be revoked after download; deletion/revocation blocks subsequent requests. Additional formats require their independently implemented boundaries below; audio remains unavailable. The reader keeps failures recoverable on the page. Detailed scope and evidence: `docs/qa/PRODUCT_WEB_EXPORT_2026-09-14.md`.

## Private PDF export — WU-038

`GET /api/workflows/[id]/download?format=pdf` uses the same fresh authenticated owner projection and private attachment boundary. It additionally requires catalog PDF eligibility. `atv-pdf-export/1.0.0` embeds local static subsets of Bodoni Moda, Newsreader and Onest; font derivation and OFL licenses are versioned. It never fetches a URL, embeds HTML or reads raw input. The complete reading, evidence references, facts, provenance, method limits and revision history are paginated, not summarized. Stable metadata and byte hashing identify a generated version without authorizing publication.

Limits are 120,000 projected JSON characters, 40 pages, 8 MB and a cooperative five-second elapsed-work check. Unsupported glyphs or exceeded limits fail closed without a partial file. The deadline is not preemptive CPU isolation; hosted resource-budget verification remains a rollout gate. PDF is generated on demand, not stored or registered in an artifact manifest. Offline copies have the same irrevocability warning as HTML. The reader offers PDF only for an eligible released run, with recoverable failures; synthetic fixtures cannot download. No PDF/A, PDF/UA, encryption, digital-signature, full chart/cartography or hosted JWT certification is claimed. Evidence: `docs/qa/PRODUCT_PDF_EXPORT_2026-09-15.md`.

## Rollout and forward-fix

Migration `20260909230000_product_runs.sql` is expand-only and has not been applied to hosted Supabase. `supabase/forward-fixes/20260909230000_disable_product_runs.sql` disables definitions and revokes creation/advancement without destroying history; authenticated retrieval/deletion remain available. Re-enable only through a reviewed release, never by seeding synthetic promotion records.

The WU-030 reader migration also remains local/versioned. Its forward-fix, `20260914120000_disable_product_run_reader.sql`, revokes the read RPC without restoring raw-table access or preventing owner deletion. Apply both migrations in staging and verify JWT/PostgREST before any hosted rollout.

The WU-031 migration likewise remains local/versioned. `20260914140000_disable_product_run_processing.sql` revokes the three processing RPCs, keeps the old writer revoked and preserves owned retrieval/deletion. No hosted migration or scheduler was activated.

`pnpm test:db` applies the real migration chain to [PGlite](https://pglite.dev/), with synthetic auth/storage stubs. It exercises SQL, RLS, grants, atomic rollback, CAS, quotas, gate refusal, reprocessing and the forward-fix. It does not certify hosted JWT/PostgREST/Storage behavior or simultaneous independent connections. A staging Supabase integration gate remains necessary before release.

## Private cartography SVG — WU-039

`GET /api/workflows/[id]/download?format=svg` shares the fresh authenticated owner boundary, additionally requiring catalog SVG eligibility and a validated `atv-cartography/1.0.0` projection from the saved `atv-natal-product-calculation/1.0.0` snapshot. Only birth-chart/ascendant are supported. SQL and application schemas validate and copy canonical longitudes, requested angles and supported cusps without raw input, inferred aspects, display-text parsing or fallback houses. Existing publication gates and RPC revocations are preserved. The forward-fix removes only geometry.

`atv-svg-export/1.0.0` embeds local brand fonts and exact source angles, uses separated radial tracks rather than displaced longitudes, and marks experimental accuracy and unavailable geometry. SVG XML is inert, bounded to 2 MB, private/no-store and hashed. A file already downloaded cannot be revoked; future requests recheck access. No persistent artifact manifest, premium cartography completion or hosted integration claim. Evidence: `docs/qa/PRODUCT_SVG_EXPORT_2026-09-15.md`.

## Private section cards — WU-040

`GET /api/workflows/[id]/download?format=card&section=0` exports one complete selected editorial section, its cited facts and all calculation/editorial limitations. The shared boundary requires a fresh authenticated owner read, released editorial/calculation and catalog web eligibility. Exactly one canonical integer section in 0–39 is accepted; it must exist in the current revision. This is a derivative of the web reading, not a new catalog entitlement, summary, interpretation or public sharing link.

`atv-reading-card/1.0.0` is inert self-contained SVG with embedded local brand fonts, escaped text, minimal revision/review provenance and offline/privacy notices. The 1080-pixel canvas grows to fit full content; limits are 24,000 projected JSON characters, 8192 pixels height, 2 MB and a cooperative five-second elapsed-work check. Unsupported glyphs or exceeded bounds fail closed without omissions. Hosted CPU/memory certification remains pending. Attachment, private/no-store, CSP, MIME verification and SHA-256 reuse the existing download protections. Cards are generated on demand, not persisted artifact manifests. Previously downloaded copies cannot be revoked. Evidence: `docs/qa/PRODUCT_CARD_EXPORT_2026-09-15.md`.

## Private persisted binaries — WU-041

The separate disabled-by-default artifact policy protects a bounded PostgreSQL binary store. `persist_product_artifact` is service-only; it binds immutable bytes and SHA-256 to the owner, run, exact revision/review digest, eligible format/section and trusted renderer version. Same tuple plus identical bytes returns the original receipt; conflicting bytes are refused. All direct table privileges are revoked. Owner quota checks and insertion are transactional, and deletion cascades with the run. This does not change legacy bucket policies or establish a public URL.

`GET /api/workflows/[id]/artifacts` lists validated minimal manifests. `GET /api/workflows/[id]/artifacts/[artifactId]` recovers actual stored bytes with a fresh authenticated owner reading and a second gated SQL read. Both refuse extra parameters/cross-site requests and use private/no-store responses. Recovery validates canonical base64, byte count and SHA-256, then serves an inert attachment with CSP sandbox. Lists never expose bytes, input or service data. Revocation hides stored files without erasing state history; owner deletion removes binaries atomically. Previously downloaded copies cannot be recalled.

The portable worker writer requires an injected trusted service transport and has a ten-second maximum deadline. No browser write, hosted transport, scheduling or automatic persistence of existing on-demand exports is supplied. Renderer safety is a privileged producer responsibility; SQL integrity checks do not sanitize arbitrary documents. Local bounds, forward-fix and rollout prerequisites are recorded in ADR 0005. No hosted migration, model promotion or product activation occurred.

## Library artifact consultation — WU-042

The released reader explicitly queries stored artifacts on request, separately from on-demand exports. The client validates current run/revision/review manifests and bounded response bytes, verifies receipt headers and SHA-256, and rejects redirects or provider-supplied URLs. Empty/unavailable/revoked/expired states never imply stored delivery; failed recovery discards the stale list and offers retry. Requests abort on reader destruction and have a 30-second timeout. Synthetic reader actions remain disabled. No persistence producer or policy is enabled by this UI. Evidence: `docs/qa/PRODUCT_ARTIFACT_READER_2026-09-22.md`.

## Trusted artifact composition — WU-043

The disabled-by-default server producer processes one pinned owner/run/revision/review/format/section job using a fresh owner read and fixed existing renderers. It does not accept document bytes, URLs or custom renderers. The private writer and SQL recheck current gates at persistence. A maximum 15-second overall deadline includes a bounded at-most-ten-second write; CPU cancellation is cooperative and uncertain commits are not reported as stored. Identical explicit retries are idempotent; no automatic retry, credential, route or scheduler is introduced. Minimal outcome/format/duration/byte telemetry excludes content and identities. Hosted runtime and policy activation remain pending. Evidence: `docs/qa/PRODUCT_ARTIFACT_PRODUCER_2026-09-22.md`.

## Native calculation to stored formats — WU-044

Local integration covers actual natal calculation → owner projection → PDF/SVG/card renderer → private SQL bytes → authenticated recovery, with exact bytes, retries, revocation, corruption refusal and polar exclusions. PDF/cards preserve the mandatory ΔT warning using the existing embedded display glyph and matching measurements; other unsupported glyphs remain refused. Previously supported content keeps its layout/version. Synthetic editorial fixtures are not model approvals or a production rollout. Evidence: `docs/qa/PRODUCT_ARTIFACT_FORMATS_2026-09-23.md`.

## Portable editorial executor — WU-046

`createProductPublisher` in the worker is server-configured, default-off and performs at most one claim/completion per explicit step. It accepts only receipt identifiers and validates an exact READY/next-revision acknowledgement. Deadline is 20 seconds by default, at most 25 seconds; external abort and late-response suppression are supported. After completion dispatch, failures/invalid acknowledgements/deadlines produce `publication_uncertain`, never a fabricated success or an automatic retry/cleanup write. SQL controls durable lease, retries and revocation. Telemetry contains only event/outcome/duration; no transport, provider, review issuer or scheduler is installed. Evidence: `docs/qa/PRODUCT_EDITORIAL_EXECUTOR_2026-09-23.md`.

## Six-universe vertical integration — WU-047

Six representative partial bases now have a local integration chain through actual HTTP handlers, calculation/SQL processing, private synthetic receipt publication, persisted web rendering, owner recovery/history and independent reprocessing approval. Parent revocation/deletion does not authorize or erase a separately reviewed child. Tarot preserves the exact draw. Fixture policy/reviewer approval is not production authority, and this does not certify all 25 products or hosted authentication. Evidence: `docs/qa/PRODUCT_VERTICAL_INTEGRATION_2026-09-23.md`.

## Complete Lab-to-reader representation — WU-048

`prepareProductDelivery` mechanically validates a captured draft and deterministically preserves all Lab claim types/IDs/text/evidence, ordered relation types/claim links, synthesis, exploratory questions, scope and limits. Relations may share bounded sections; questions are explicitly not factual assertions. Reader bounds and a 90,000-byte UTF-8 content budget reject unrepresentable output without truncation. A SHA-256 binds exact content/version to the original run/calculation/revision/tier basis and output digests. It is not authentication or approval: content omits promotion/review credentials and publication always remains blocked. Independent review of the final representation and trusted issuance remain required. Evidence: `docs/qa/PRODUCT_DELIVERY_PROJECTION_2026-09-23.md`.

## Independent final-delivery review — WU-049

`evaluateProductDelivery` reconstructs WU-048 from a captured draft and requires two strict, bounded Director reviews: one for the original Reading output digest, another for the final delivery digest. The bundle also pins the original basis, and server-owned stage-specific reviewer/calibration allowlists default to empty. Both reviews enforce the existing tier thresholds and safety/fidelity floors. A canonical audit digest binds both complete reviews to the exact basis/output/delivery; it is not authentication. Passing returns only a publication-blocked reviewed candidate, with no receipt or promotion credentials. Authentication, actual model/prompt provenance, eval-backed promotion and trusted issuance remain separate release blockers. Evidence: `docs/qa/PRODUCT_DELIVERY_REVIEW_2026-09-23.md`.

## WU-029 evidence — 2026-09-09

Domain: four tests cover all 25 product input contracts and guarded transitions. PostgreSQL: eight tests (including the parent suite) pass. Full monorepo unit suite: 66 tests pass; type check passes without errors/warnings, lint and build pass. Detailed logs: `test-results/wu029-*.log`. No external model call, hosted migration, feature activation or spend occurred.
