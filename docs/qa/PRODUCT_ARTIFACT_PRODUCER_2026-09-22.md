# WU-043 — Trusted artifact production composition

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Local-only composition, not activation.

## Delivery

`createArtifactProducer` composes a fresh owner-scoped reading, the existing fixed web/PDF/SVG/card renderer and the private artifact writer. Configuration is captured and disabled by default. Each explicit job pins owner, run, revision, review digest, format and section; arbitrary bytes, URLs, renderer callbacks and additional job fields are refused. No public write route, credential, provider, scheduler or hosted transport is introduced.

One call processes at most one file, with a maximum 15-second total deadline and at most ten seconds for persistence within the remaining budget. Caller cancellation and late read/render/write results fail closed. CPU rendering deadlines remain cooperative; an in-flight database commit can be uncertain and is never reported as successful after cancellation. There are no automatic retries. Explicit identical retries use deterministic renderer output and SQL idempotency.

Telemetry contains only outcome, format, elapsed milliseconds and confirmed byte count, never owner/run IDs, prompts, content, provider errors or URLs. Observer failure cannot change delivery. SQL remains authoritative for ownership, current release/promotion, capacity and integrity at the write itself; validation of an owner projection is not authentication.

## Evidence

- Ten focal tests pass, including the actual local database integration (`test-results/wu043-tests.log`). Four real renderers produce exact expected bytes and identical retry receipts. Rejected envelopes, revoked/stale/ineligible readings, cancellation, uncooperative callbacks, late completion, uncertain receipts and observer failure are covered.
- Existing integration now invokes the producer against actual owner/service SQL roles: reading → rendering → writer → database → owner HTTP recovery. It proves exact web bytes, idempotency, cross-owner denial, revocation between reading and persistence, later recovery revocation, disabled policy and deletion. PDF/SVG/card composition tests use validated stub receipts; they do not claim corresponding SQL round-trip evidence.
- Full working-tree suite: 184 passed, of which 179 belong to the scoped baseline plus this work and five belong to unrelated preserved work (`wu043-all-tests.log`). Type check: zero errors/warnings. Scoped lint/format and build pass (`wu043-check.log`, `wu043-lint.log`, `wu043-format.log`, `wu043-build.log`). No new visual output or renderer design change; WU-042's 15 E2E are not claimed as rerun here.
- WU-042 commit `b69c2e0`: quality `106983433118`, secrets `106983433356`, Pages `106983662093` completed/success via GitHub API.

## Boundaries

No hosted migration or activation. All 25 product releases and artifact policy remain false; no model is homologated. SQL policy does not prevent local rendering cost if a privileged host deliberately enables the producer: hosted CPU/memory/global capacity, authenticated transport, scheduling, persistent queue/retry ownership, JWT and concurrency certification remain prerequisites in ADR 0005. This factory is not registered in production and does not save existing on-demand downloads automatically. Remove its wiring if later introduced, or revert this composition, without deleting stored files.
