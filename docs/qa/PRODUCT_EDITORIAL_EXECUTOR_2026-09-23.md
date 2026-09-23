# WU-046 — portable editorial publication executor

RUN_ID: ATV-20260902-170644Z-01A0630F. Local implementation only.

`createProductPublisher` is disabled by an empty allowlist by default. Server configuration is validated and copied. One step performs at most one claim and one completion, using only the WU-045 private receipt identifiers, revision and lease. No input, editorial payload, approval, model, issuer, transport or scheduler is accepted/installed. SQL remains the authority for publication and release gates.

The 20-second default deadline is configurable from 1 to 25,000 milliseconds. Caller cancellation and timeout bound the wait, abort the supplied transport signal and prevent late claims from proceeding. A transport must honor cancellation; cancellation cannot roll back an already-dispatched database write. Any exception, malformed acknowledgement or cancellation after completion dispatch reports `publication_uncertain`. There is no automatic retry, cleanup write, failure transition or claim release. A subsequent explicit step asks SQL for eligible work; completed work is not eligible. Uncertain abandoned claims remain subject to the existing 60-second lease/five-attempt bound. This executor does not drain the queue.

Only exact claim/acknowledgement shapes and the expected next revision are accepted. One instance refuses overlapping active steps. Aggregate event/outcome/duration telemetry contains no identities, lease tokens, input, output or errors; sink failure does not change the outcome.

## Evidence

- Eight focused executor tests PASS (`test-results/wu046-unit.log`): default/configuration/mutation, exact RPC payload, malformed/expired claim, bad/lost completion, caller cancellation, hung/late claim, hung/late completion, single-flight and telemetry isolation.
- Full worker suite: 48 PASS (`test-results/wu046-worker.log`). Worker type check PASS (`test-results/wu046-check.log`).
- Editorial database integration: 11 PASS (`test-results/wu046-db.log`), including three new executor tests with real local SQL: persisted calculation → private synthetic receipt → READY → owned history; a committed write with lost response and no duplicate event; approval revocation between claim/completion without self-repair.
- Full database regression: 48 PASS (`test-results/wu046-db-all.log`); `git diff --check` PASS.
- WU-045 remote checks on a22f774: quality 107145822271, secrets 107145822010, Cloudflare Pages 107146109994 completed/success.

Fixtures are deliberately synthetic DB-owner approvals, not model/reviewer authentication or eval evidence. No model is homologated. No hosted JWT, concurrent independent DB sessions, CPU limits or deployed transport are certified. No UI/renderer changes; no new visual/E2E claim. Known unrelated working-tree global-check failure in `fabrica-de-midia` remains outside this WU. All production releases/policies remain false; no migration, credentials, provider call or spend.
