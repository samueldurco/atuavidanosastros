# Product RPC deadlines — 2026-09-28

RUN_ID: ATV-20260902-170644Z-01A0630F. WU-097-PRODUCT-RPC-DEADLINES.

The existing email deadline is extracted into `withRpcDeadline` and reused by all six continuity API actions, intake access, request recovery and the three independent dashboard readers. Asynchronous waiting ends at 10 seconds even if a transport ignores abort. Each timer is cleaned up; timeout never implies SQL rollback, a missing request, eligibility or permission to retry a write. Authentication, body reads and synchronous work are outside this bound.

Local evidence:

- 179 focal tests / eight files passed (`test-results/wu097-focal.log`). New cases exercise all six continuity actions, intake, recovery, lazy PromiseLike execution and independent dashboard failures, including all three reads stalled in parallel.
- A real PostgreSQL integration commits a continuity note but never returns its acknowledgement. The handler returns redacted 503; a subsequent read after policy disablement recovers exactly one revision under the original owner, while another owner sees none. No second mutation occurs.
- Full web regression: 1,037 tests / 54 files passed (`test-results/wu097-web.log`), including concurrent tests excluded from this commit. After correcting static-type assertions and an unused test parameter, the affected two files passed again: 21 tests (`test-results/wu097-recheck.log`).
- Web check: zero errors/warnings (`test-results/wu097-check.log`). Focal ESLint and Prettier passed. Existing email deadline tests continue to cover late success/failure, synchronous abort listeners and timer cleanup.

No UI, new visual gate, hosted migration, provider call, model promotion, retry, scheduler or production activation. Abort remains best effort; uncooperative transport may outlive the response. No model is homologated; AI and acceptance policies remain default-off.
