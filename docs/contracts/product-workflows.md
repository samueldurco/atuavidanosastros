# Product workflows — atv-workflow/1.0.0

Status: implementation contract, **not a production release**. All 25 product definitions across the six universes are disabled; the editorial promotion registry remains empty. This work does not deliver 25 finished readings.

## Ownership and durability

`WorkflowInput` discriminates product families, bounds free text, requires storage-policy consent and explicitly separates partner consent and optional longitudinal consent. The worker must also validate civil time/UTC/coordinates with the deterministic engine before calculation; database acceptance alone does not validate astronomical input. Third-party names are not required.

`request_product_run` atomically creates a run, its first event and its Library reference. A UUID idempotency key belongs to one owner and exact original request. An owner-scoped advisory transaction lock serializes quota checks: at most 50 new versions/day and 15 pending versions. Paid definitions additionally require an active entitlement within its validity window; the RPC cannot grant access. Definitions and promotions have no client/service-role write grants.

State progression is QUEUED → CALCULATED → AWAITING_EDITORIAL → READY. Pending states may fail or cancel. READY/FAILED/CANCELLED are terminal. Only the service adapter can advance a run, using expected revision and row locking; every accepted transition appends an event. A calculation snapshot is immutable. READY requires an enabled definition, a current product/contract promotion and a reviewed editorial output. Astrological products also require engine approval, regardless of a caller-supplied calculation status.

## Recovery and privacy

Reprocessing creates a new run linked to the owned prior version. It copies the original input, never overwrites a result, and reuses a persisted Tarot draw. An interrupted calculation without a persisted snapshot is still QUEUED, not a delivered reading. A new draw is a new request, not reinterpretation. Worker claiming/retry orchestration remains a separate implementation step.

RLS isolates runs/events by owner. Migration `20260914120000_product_run_reader.sql` additionally revokes client SELECT on raw runs. Retrieval is exclusively through the authenticated, owner-checking `read_product_run` projection: no raw input, calculation data blob, provider error or unpublished interpretation. The RPC returns history and state for pending/failed/revoked runs, but facts and editorial content only when READY and the current release, engine and exact promotion gates remain valid. Expired entitlement does not erase a previously delivered reading; reprocessing requires current access. Client direct inserts, updates and deletes are revoked; deletion is an owner-checking RPC that removes the selected version's Library reference and events. Other reprocessed versions remain separate records (parent becomes null); deletion of one version is not deletion of all copies. No raw input, reading or provider error may appear in observability logs.

The web boundary `/api/workflows` authenticates the session, checks same-origin mutations, bounds JSON input, preserves request idempotency and uses only owner RPCs. Reprocessing sends no new input and retries the original key. `/biblioteca/[id]` resolves an owned Library reference and verifies both run and Library IDs; the result is validated and escaped before rendering. Unreleased content is never shown as a finished reading. No download, audio or email is advertised as delivered without an actual artifact.

## Rollout and forward-fix

Migration `20260909230000_product_runs.sql` is expand-only and has not been applied to hosted Supabase. `supabase/forward-fixes/20260909230000_disable_product_runs.sql` disables definitions and revokes creation/advancement without destroying history; authenticated retrieval/deletion remain available. Re-enable only through a reviewed release, never by seeding synthetic promotion records.

The WU-030 reader migration also remains local/versioned. Its forward-fix, `20260914120000_disable_product_run_reader.sql`, revokes the read RPC without restoring raw-table access or preventing owner deletion. Apply both migrations in staging and verify JWT/PostgREST before any hosted rollout.

`pnpm test:db` applies the real migration chain to [PGlite](https://pglite.dev/), with synthetic auth/storage stubs. It exercises SQL, RLS, grants, atomic rollback, CAS, quotas, gate refusal, reprocessing and the forward-fix. It does not certify hosted JWT/PostgREST/Storage behavior or simultaneous independent connections. A staging Supabase integration gate remains necessary before release.

## WU-029 evidence — 2026-09-09

Domain: four tests cover all 25 product input contracts and guarded transitions. PostgreSQL: eight tests (including the parent suite) pass. Full monorepo unit suite: 66 tests pass; type check passes without errors/warnings, lint and build pass. Detailed logs: `test-results/wu029-*.log`. No external model call, hosted migration, feature activation or spend occurred.
