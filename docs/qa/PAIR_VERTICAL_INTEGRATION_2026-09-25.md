# Preview do Par — integração vertical local

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-066. Synthetic data only.

The saved-profile suite now covers six products: four natal products, date-reading and pair-preview. **49 scenarios** preserve the previous 34 and add 15 pair cases. The controller calls actual HTTP handlers, the onboarding/revision bridge, local PostgreSQL/RLS, deterministic calculators and Library reader. Synthetic claims on one PGlite connection are not hosted JWT/PostgREST or independent-connection concurrency evidence.

Pair checks cover:

- Exact, consented owner revision plus separately declared partner data become immutable six-field birth copies. Precision and the submitter's declaration stay in the private receipt; no partner profile is created.
- QUEUED → CALCULATED → AWAITING_EDITORIAL history persists. Library reads withhold calculation/editorial content and downloads. No READY output, approval or promotion is seeded.
- Lost acknowledgement recovers read-only after profile editing, forgetting and release revocation. Session storage retains only the request UUID, not either birth or an automatic replay.
- Another account cannot read/recover the run, Library or artifacts. Stale revision, approximate owner precision, closed release and absent entitlement refuse before persistence.
- Explicit reprocessing retains both original birth copies after editing/forgetting the owner's profile; it creates a child without mutating its parent or copying an approval.
- Leap-day/fractional time and both explicit UTC occurrences of a New York DST overlap produce separate A/B Moon/Venus/Mars projections. Positions match separately invoked provider calculations; roles, canonical body order and temporal provenance are checked. This verifies plumbing, not independent astronomical accuracy.
- Only the selected positions/provenance/roles and six calculated facts are projected. No houses, inter-chart aspects, events, compatibility score or sharing authorization appear. Limitations explicitly reject claims about feelings, gender, destiny and verified bilateral consent.
- An explicit second partner request creates a separate snapshot/receipt. Invalid partner calendar, DST gap, approximate precision, absent permission declaration or attempted sharing leave no run, event, receipt or Library item.

## Verification

- Focal: **49 tests PASS**, `test-results/wu066-focal.log`.
- Full web: **546 tests / 35 files PASS**, `test-results/wu066-web.log`.
- Svelte check: **0 errors, 0 warnings**, `test-results/wu066-check.log`; scoped ESLint/Prettier PASS.
- Tests/documentation only: WU-065 build, 64 browser tests and four-resolution visual QA remain applicable to unchanged runtime/UI.
- WU-065 commit `d185ef24a108a978cd7af9534ee876bce70b9423`: quality `108139487424`, secrets `108139487594`, Pages `108140096827` observed completed/success.

All production releases, engine/editorial/artifact policies and runtime defaults remain disabled. No hosted migration, external call, scheduler, spend, model homologation or release approval. Retention/legal review and hosted verification remain open; this is a local path to the editorial gate, not a finished reading, approved audio/email or complete six-universe delivery.
