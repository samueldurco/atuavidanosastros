# Bússola de Carreira — profile-backed intake

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-099. 2026-09-28.

`career-compass` now uses the authenticated profile-backed intake, strict revision command and existing Library recovery. The browser sends no birth snapshot. It stores only a correlation UUID, requires an exact saved profile and separate consent, and never automatically replays an uncertain write. The header identifies Propósito & Prosperidade without occupational or income promises. Optional professional context is not collected in this WU.

Migration `20260928170000_career_compass_requests.sql` expands the existing function allowlist only. The forward-fix restores the original four products without deleting career records, receipts or Library history. No release, engine or interpretation is enabled.

## Evidence

- 135 focal tests / 5 files PASS (`test-results/wu099-focal.log`): SQL request/rollback/reapply, controller-to-PostgreSQL vertical, generic runtime/publication fixture and existing client/access regressions.
- Full web unit/integration suite: 1,048 tests / 54 files PASS (`wu099-web-unit.log`). The WU098 CI failure (quality job 109021584577, commit 91716fdd) was an outdated explicit coverage list missing career-compass. This WU adds the actual thirteenth vertical to that list; it does not weaken the assertion. WU098 secrets 109021584905 and Pages 109021956170 passed.
- 26 browser tests PASS (`wu099-e2e-final.log`), including five profile-backed entries, career route authentication, uncertain acknowledgement, revision conflict, failed recovery storage, keyboard and four viewport sizes per birth-chart/career-compass.
- Svelte/TypeScript check: 0 errors, 0 warnings; scoped ESLint and Prettier pass. Local production build passes (`wu099-build.log`).
- Career screenshots at 1440, 820, 390 and 320 inspected in `apps/web/test-results/tests-natal-intake.e2e.ts--*/career-compass-intake-*.png`: readable reflow, no horizontal overflow, keyboard focus and explicit editorial limitations.

The first browser attempt was interrupted after hydration failed while the concurrent web suite regenerated SvelteKit outputs (`Cannot read properties of undefined (reading 'data')`). A clean build and isolated browser execution passed all 26 tests. Do not run SvelteKit-generating suites against a live build under test.

## Boundaries

Local SQL proves saved profile → immutable input → experimental MC calculation → AWAITING_EDITORIAL, owner isolation, read-only recovery after profile removal and independent reprocessing. The generic publication test uses explicitly synthetic review authority; it is not an approved interpretation or model promotion. Browser API transport is synthetic and loopback-only, not hosted JWT/PostgREST certification.

Stitch composition: ID-02 `133f01c9992f4ebc9ad46dbabd1746ec` and SH-02 `7d41b4e1322349109a91363bb7c2df2b`. **INTAKE_LOCAL_QA_PASS / NOT_FULL_VISUAL_PASS**; no full Gate B or premium result parity claim. No hosted migration, provider call, spend, email dispatch, scheduler, READY production result or ATV+ activation. No model is homologated.
