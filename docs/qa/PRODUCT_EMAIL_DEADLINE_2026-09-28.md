# Product email RPC deadline — 2026-09-28

RUN_ID: ATV-20260902-170644Z-01A0630F. WU-096-PRODUCT-EMAIL-DEADLINE.

The four existing POST operations now race their RPC against a 10-second deadline, then signal abort. This bounds asynchronous waiting even if the transport ignores abort; it cannot interrupt synchronous blocking or bound preceding claims/body reads. Deadline rejection precedes abort to prevent a synchronous abort listener from replacing timeout with success. Every path cleans its timer; late failures are consumed, with no automatic retry.

Local evidence:

- 84 focal tests across API validation, deadline and real PostgreSQL integration passed (`test-results/wu096-focal.log`). Eleven new isolated cases cover all four operations, late success/failure, synchronous abort resolution and cleanup after success/invalid/error/throw.
- New PostgreSQL integration commits a request and deliberately never acknowledges it. HTTP returns redacted 503 at deadline; read-only recovery finds exactly one original receipt after acceptance, workflow release and profile revocation. Abort is not a rollback guarantee.
- Full web regression: 1,023 tests / 53 files passed (`test-results/wu096-web.log`), including unrelated concurrent tests not staged in this WU.
- Existing web check: zero errors/warnings (`test-results/wu096-check.log`); focal ESLint and Prettier passed. Initial isolated fixtures omitted JSON content type; corrected before final passing run.

No UI, migration, provider call, dispatch, model promotion or new acceptance policy. Email remains default-off; receipts do not claim sent/delivered. Shared workspace changes are excluded from the commit. No new visual gate is claimed.
