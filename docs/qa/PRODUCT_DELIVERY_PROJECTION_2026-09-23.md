# WU-048 — complete Lab-to-reader delivery projection

RUN_ID: ATV-20260902-170644Z-01A0630F. Offline, synthetic QA only.

`prepareProductDelivery` reconstructs a fixed reader representation from a strict Lab Reading and a validated calculation/run/revision/tier. It reuses mechanical checks and never calls a provider. Each factual claim, interpretation and hypothesis retains its label, ID, exact text and evidence. Ordered relations retain their type and claim references; their factual references are resolved without inventing evidence. All synthesis passages and exploratory questions are preserved. Questions are explicitly distinguished from factual claims. Scope and original limits remain visible; calculation facts/limits remain separately available in the reader and bound in the basis digest.

Adjacent relations are grouped within the existing forty-section reader contract. Content is never shortened to fit. Unrepresentable limits, section lengths or a 90,000-byte UTF-8 content budget fail closed. This reserves space below the SQL editorial receipt bound, which remains independently enforced.

The delivery SHA-256 binds the exact representation, adapter version, original basis and output digests. It is an integrity binding, not reviewer authentication or approval. Returned content deliberately omits promotion/review credentials. Every result has publication blocked. An independent reviewer must assess the exact delivery; authenticated issuance, real model provenance, eval/promotion validation and production gates remain unimplemented boundaries.

## Evidence

- Seven projection unit tests cover lossless composition, semantic labels/references, strict/unsafe input refusal, representability, maximum premium counts, UTF-8 budget, digest sensitivity and mutation isolation.
- Full worker suite: 55 tests PASS (`test-results/wu048-worker-full.log`); worker typecheck PASS (`test-results/wu048-check.log`).
- Six-universe integration PASS (`test-results/wu048-vertical.log`): actual calculated snapshots now pass through Lab facts/schema/projection before the existing owner-only fixture receipt. Recovered web output contains the synthesis, question and scope. The fixture's digest is not a real reviewer approval.
- Full web suite: 17 files / 90 tests PASS (`test-results/wu048-web-full.log`). Web typecheck: zero errors/warnings (`test-results/wu048-web-check.log`); focused ESLint/Prettier and diff-check PASS (`test-results/wu048-lint.log`, `test-results/wu048-format.log`).
- Prior WU-047 commit `c8108dd9f61254394d60866caaa9ffdfdae2258e`: quality 107155049151, secrets 107155049537 and Cloudflare Pages 107155640469 completed/success.

No renderer/UI change, new visual/E2E claim, hosted migration, receipt issuer, scheduler, paid invocation, model promotion or release activation. All current calculation bases remain partial; this does not certify 25 finished products.
