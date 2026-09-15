# Product workflows — atv-workflow/1.0.0

Status: implementation contract, **not a production release**. All 25 product definitions across the six universes are disabled; the editorial promotion registry remains empty. This work does not deliver 25 finished readings.

## Ownership and durability

`WorkflowInput` discriminates product families, bounds free text, requires storage-policy consent and explicitly separates partner consent and optional longitudinal consent. The worker must also validate civil time/UTC/coordinates with the deterministic engine before calculation; database acceptance alone does not validate astronomical input. Third-party names are not required.

`request_product_run` atomically creates a run, its first event and its Library reference. A UUID idempotency key belongs to one owner and exact original request. An owner-scoped advisory transaction lock serializes quota checks: at most 50 new versions/day and 15 pending versions. Paid definitions additionally require an active entitlement within its validity window; the RPC cannot grant access. Definitions and promotions have no client/service-role write grants.

State progression is QUEUED → CALCULATED → AWAITING_EDITORIAL → READY. Pending states may fail or cancel. READY/FAILED/CANCELLED are terminal. Service transitions use the fenced calculation RPCs described below, expected revision and row locking; every accepted transition appends an event. A calculation snapshot is immutable. READY requires an enabled definition, a current product/contract promotion and a reviewed editorial output. Astrological products also require engine approval, regardless of a caller-supplied calculation status. No service publication RPC is currently exposed.

## Natal product calculations — WU-033

`createNatalCalculators()` registers birth-chart, three-pillars, ascendant and midheaven with the existing experimental engine. Product projections preserve exact selected positions and copied provenance, validate civil/UTC correspondence and label contextual statements as reported. Tropical signs use half-open 30-degree sectors, without rounding display into the next sign. No aspect policy or interpretation is inferred. Outside the conservative house/angle contract, ASC and cusps are withheld rather than substituted; MC remains separately computed and experimental when requested. The original engine contract and all publication gates still apply. See `docs/qa/NATAL_PRODUCT_CALCULATORS_2026-09-14.md`.

## Partial contextual calculations — WU-036

`createContextCalculators()` adds `pair-preview` and `date-reading` only. Pair projects separate Moon/Venus/Mars positions for A and B; storage consent is not sharing authorization. Date projects natal positions plus one explicitly labelled 12:00 UTC sample, not a local-day window or event search. Both inputs are validated before computation; both chart outputs independently satisfy the experimental contract and are copied before another provider call. No aspects, compatibility, inferred role or interpretation is produced. These are partial bases, not completed verticals. Astrology reprocessing uses the original input for a new calculation/run; only Tarot has frozen-draw reuse under the existing SQL policy. See `docs/qa/CONTEXT_PRODUCT_CALCULATORS_2026-09-14.md`.

## Symbolic calculations — WU-032

`createSymbolicCalculators()` registers daily-card, three-questions, dream-reading and dream-journal with the portable processor. This is not hosted runtime wiring or a release flag. Tarot snapshots identify the candidate deck, algorithm and spread versions. A server-created UUID seeds SHA-256 counter words; rejection sampling and partial Fisher–Yates draw unique cards, independent of question text. One upright card per question is a candidate policy requiring editorial review. Only new requests draw; reprocessing preserves the saved snapshot.

Dream snapshots keep reported narrative, emotions, associations and context distinct from interpretations. No universal symbol meaning, inferred emotion, clinical diagnosis or recurrence is generated. Continuity consent is recorded, but historyLoaded and recurrenceAssessed remain false. All four adapters stop before editorial publication and retain the empty promotion registry. See `docs/qa/SYMBOLIC_CALCULATORS_2026-09-14.md` for local verification and limits.

## Recovery and privacy

### Calculation to Editorial Director evidence — WU-034

`prepareProductFacts` maps a validated persisted snapshot to the six Lab capabilities without changing facts or carrying raw data/history. Current scope is always partial; facts exceeding the tighter Lab bounds are explicitly blocked. `evaluateProductDraft` reuses schema and mechanical review, binds review to a SHA-256 of run/revision/product/tier/calculation/provenance/facts/reading/version labels, and requires server-owned reviewer/calibration authority. An otherwise passing review is only a reviewed candidate: publication remains blocked pending independently verified promotion and engine gates. It performs no provider call or persistence transition. See `docs/qa/PRODUCT_EDITORIAL_EVIDENCE_2026-09-14.md` for evidence and remaining boundaries.

Reprocessing creates a new run linked to the owned prior version. It copies the original input, never overwrites a result, and reuses a persisted Tarot draw. An interrupted calculation without a persisted snapshot is still QUEUED, not a delivered reading. A new draw is a new request, not reinterpretation.

## Durable calculation processing — WU-031

### Internal composition — WU-037

`createProductProcessor(rpc, options)` composes ten partial calculation bases behind an empty-by-default server-owned allowlist. It rejects invalid/unsupported/duplicate product IDs and deadlines, captures configuration against later mutation, and exposes one bounded `step()` with existing aggregate-only telemetry. The full catalog coverage report distinguishes partial bases from unavailable calculations and always states publication blocked. No scheduler or hosted transport is supplied. Database release/contract gates remain independently authoritative. See `docs/qa/PRODUCT_RUNTIME_2026-09-14.md` for the ten-product/six-universe local SQL integration proof.

Migration `20260914140000_product_run_processing.sql` enqueues work in the run-creation transaction and backfills pending calculations. The private work table has no client or service-role direct access. Three service-only RPCs claim, complete and fail one step. Claims filter enabled, matching-contract products supported by the caller; row locks with `SKIP LOCKED` keep an already claimed row out of another consumer's selection ([PostgreSQL SELECT documentation](https://www.postgresql.org/docs/current/sql-select.html)). Local tests cover sequential fencing, not simultaneous independent connections.

A random token fences a 60-second lease (SQL accepts 30–120 seconds). Completion requires the live token and expected revision. Token-keyed receipts make lost-response retries idempotent without changing the calculation. Five claims per run are the hard bound; safe transient failures defer the next claim by exponential backoff starting at five seconds. Expired leases can be reclaimed, exhausted work fails, invalid input/calculation fails permanently. Owner deletion cascades through work and prevents late completion.

The portable TypeScript processor takes an injected service RPC transport and product calculators. One invocation advances QUEUED → CALCULATED or validates the persisted snapshot and advances CALCULATED → AWAITING_EDITORIAL. It revalidates the full input and bounded JSON calculation, rejects non-finite numbers and self-approved astrology, and never redraws a stored Tarot snapshot. Deadline: 20 seconds by default, at most 25, plus a bounded three-second cleanup; adapters must respect AbortSignal. Telemetry contains only outcome, attempt and duration, never identifiers, inputs, results or raw exceptions. There is no model call, publication, price or entitlement decision.

The old unfenced `advance_product_run` service grant is revoked. Editorial processing needs its own reviewed and fenced path; this processor intentionally stops at AWAITING_EDITORIAL. A production RPC transport, actual product calculator registration and scheduling are separate steps, not implied by the injectable implementation.

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

## WU-029 evidence — 2026-09-09

Domain: four tests cover all 25 product input contracts and guarded transitions. PostgreSQL: eight tests (including the parent suite) pass. Full monorepo unit suite: 66 tests pass; type check passes without errors/warnings, lint and build pass. Detailed logs: `test-results/wu029-*.log`. No external model call, hosted migration, feature activation or spend occurred.
