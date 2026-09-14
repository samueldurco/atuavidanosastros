# WU-033 — experimental natal product projections

RUN_ID: ATV-20260902-170644Z-01A0630F. No product/model/engine homologation.

## Implemented

The portable worker now registers birth-chart, three-pillars, ascendant and midheaven against the existing Caelus adapter. A workspace dependency connects the worker to the existing pinned engine; offline installation added no external package versions. Each product stores only its selected factors, exact numeric positions and copied provenance. Sign sectors are half-open and display degrees are truncated to six decimals; display resolution is not a precision guarantee. Personal context is a separate reported fact.

Calendar, timezone and UTC correspondence are validated before the provider runs. Returned positions, houses, provenance status and echoed input are checked. Invalid input becomes the durable input_invalid failure; malformed or self-approved output cannot become a calculation snapshot. Cancellation fences returned work, but does not preempt the engine's synchronous CPU calculation.

Outside the conservative house/angle contract, Ascendant is explicitly unavailable, with no substitute cusps or house system. MC can remain separately calculated and experimental. No aspects, interpretation, career list or prosperity promise is generated.

## Evidence

- 97 monorepo unit tests PASS, including six new worker tests and 15 total worker tests. Cases include four real projections, sign boundaries, latitudes ±66/±90, invalid civil time/UTC, malformed positions/provenance, snapshot isolation and cancellation.
- 18 PostgreSQL/PGlite tests PASS. All four real projections persist then reach AWAITING_EDITORIAL with owned Library/history metadata; facts stay unpublished. Another owner's read returns null. Invalid civil/UTC correspondence fails durably without a chart.
- Worker type check, full lint and full build PASS. No web source/configuration change; WU-032 full check and WU-030 UI/E2E remain prior baselines, not rerun evidence for new UI.
- Logs: `test-results/wu033-worker-unit.log`, `wu033-all-unit.log`, `wu033-db.log`, `wu033-lint.log`, `wu033-build.log`, `wu033-install.log`.
- WU-032 SHA `660d9b30d5f4a409f295ac2116ef316fce88be28`: quality, secrets, Cloudflare Pages completed/success observed via GitHub check-runs API on 2026-09-14.

## Gates and rollback

Eight products now have calculation adapters across four universes; this is not eight completed vertical products. Other natal/purpose products and cycles/relationship calculations remain outside these registries. All 25 versioned releases are disabled, promotions empty, no hosted migration or paid call occurred. Independent full-range engine certification, approved aspect/content policies, hosted runtime/latency verification, editorial approval and deliverables remain required. Revert these code changes to remove adapter registration; do not delete stored snapshots or owner history.
