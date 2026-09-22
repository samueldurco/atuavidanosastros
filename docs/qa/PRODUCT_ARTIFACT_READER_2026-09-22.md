# WU-042 — Stored artifact recovery in the Library

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Local implementation; not product release or model approval.

## Delivered

- The released workflow reader includes an indexed **Arquivos guardados** section. Consultation is explicit/lazy; saving a reading or downloading an on-demand export never claims that a binary was persisted.
- Only validated manifests for the displayed run, revision and review digest appear. No URLs supplied by a response are followed. File count/size, formats, section eligibility, duplicate IDs and cartography applicability fail closed.
- Recovery uses the existing private owner API, verifies receipt headers, bounded actual bytes and SHA-256 against the selected manifest, and downloads those exact bytes without regenerating the reading. Both requests use no-store and reject redirects.
- Empty, expired-session, revoked-access, unavailable and corrupt-response states retain a safe retry. A failed recovery clears stale manifests. Requests time out after 30 seconds and abort on component destruction; the parent keys the component by run/revision/review so another reading cannot inherit an old list or late download.
- Keyboard focus returns to the triggering button or the consultation action after failure. Status is announced politely. Deletion copy now explicitly includes persisted files and excludes already-downloaded copies.
- Synthetic workflow fixtures remain disabled. A separate localhost-only component fixture permits read-only browser interception for deterministic tests; it does not bypass actual API authorization or enable synthetic releases.

## Evidence

- Six new client unit tests, plus six existing API/integration tests: **12 passed** (`test-results/wu042-tests.log`). The existing SQL integration uses actual migrations, rendering, service persistence and owner recovery; browser responses alone are not evidence of database persistence.
- Full current working-tree suite: **175 passed**, including five tests from pre-existing uncommitted integration/admin work. The scoped baseline plus this WU is 170; unrelated changes were preserved and are not part of this delivery (`wu042-all-tests.log`).
- Type checking: zero errors and warnings (`wu042-check-final.log`). Scoped ESLint and formatting pass (`wu042-lint-final.log`, `wu042-format.log`).
- Local Chromium reader/recovery suite: **15 passed**, with build/preview, at 1440/820/390/320 px (`wu042-e2e-final.log`). Exact downloaded bytes, fresh explicit consultation, safe retry, absent actions when revoked and synthetic guards tested. Screenshots in `apps/web/test-results/tests-product-artifacts*` and `tests-product-run-reader*`.
- Visual QA preserves MEM-03 `58afdd10c4b7484d8167ea5c62b29ee3` and SH-03 `157daa1e0776415982d5ab65d092248f`. Initial review found sub-KB rounding and download focus loss; both corrected and the suite rerun with focus assertions. No horizontal overflow at the four widths.
- Previous commit `40df39b`: GitHub checks quality `104545667497`, secrets `104545667193` and Pages `104546201107` observed completed/success on 2026-09-22.

## Boundaries and rollback

No SQL changes, new producer, scheduler, email/audio, public links, hosted migration, costs, product activation or model promotion. The artifact policy and all 25 workflow releases remain disabled. Staging JWT, concurrency, capacity and trusted producer requirements from ADR 0005 remain open. Existing 37-test database evidence is preserved, not claimed as a new DB run. Revert the scoped UI/client change to remove this section; persisted bytes and existing on-demand downloads remain intact.
