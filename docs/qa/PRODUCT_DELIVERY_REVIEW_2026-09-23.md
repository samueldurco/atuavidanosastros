# WU-049 — review bound to the exact final delivery

RUN_ID: ATV-20260902-170644Z-01A0630F. Synthetic local QA, no real model or reviewer approval.

`evaluateProductDelivery` captures the draft, review bundle and server-owned authority before asynchronous hashing. It reconstructs the complete WU-048 candidate instead of trusting caller-supplied rendered content. Both the original Lab Reading and the final reader representation require explicit Director reviews with their respective exact digests. The same reviewer may perform both passes; copying the original review into the delivery pass fails its digest check. Separate draft/delivery allowlists and calibration allowlists default to empty.

Review schema is strict: current versions, all twelve dimensions, finite 0–10 scores, bounded nonempty rationale, known source semantics, exact keys and a 64KiB UTF-8 bundle limit. Both passes enforce existing tier thresholds and perfect responsibility/factual-fidelity floors. Mechanical/schema/representation failures cannot be overridden by scores. Any run, revision, tier, product, calculation/provenance/limits or Reading change invalidates the prior binding.

The canonical review digest includes the basis/output/delivery digests and both complete reviews, including identities, calibration, scores and rationale. Key order alone does not change that audit binding. The result is only `reviewed_delivery_candidate`, always publication blocked; its content has no promotion/review credentials. A digest authenticates nobody. The caller must authenticate review records, and the future issuer must still validate actual model/prompt provenance, independent eval-backed promotion, current gates and expiry/revocation. No issuer or receipt-writing grant is added.

## Verification

- Eight focused tests PASS, including both-stage/all-dimension/tier threshold matrices, stale-review reuse, unauthorized reviewers/calibration, strict malformed/oversized inputs, safety rejection, canonical audit binding and mutation isolation: `test-results/wu049-unit.log`.
- Worker suite: 63 tests PASS; worker typecheck PASS: `test-results/wu049-worker-full.log`, `test-results/wu049-check.log`.
- Six-universe vertical tests PASS: the actual calculation → Lab projection → two-pass fixture review → owner-only synthetic receipt → persisted web recovery/reprocessing chain now uses the audit review digest. Empty authority fails even for fixture scores. SQL approval remains an explicit test-owner action, not review-function publication: `test-results/wu049-vertical.log`.
- Full web suite: 17 files / 90 tests PASS (`test-results/wu049-web-full.log`). Web typecheck has zero errors/warnings (`test-results/wu049-web-check.log`); focused ESLint, Prettier and diff-check PASS (`test-results/wu049-lint.log`, `test-results/wu049-format.log`).

No new UI/renderer or visual/E2E claim. No provider calls, paid spend, hosted migration, scheduler, policy/release activation or homologated model. Unrelated working-tree edits are preserved.
