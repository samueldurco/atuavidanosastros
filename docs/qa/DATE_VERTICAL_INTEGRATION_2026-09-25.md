# Leitura de Data — integração vertical local

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-063. Synthetic data only.

The saved-profile vertical suite now covers Leitura de Data alongside the four natal products: **34 scenarios**, preserving the 24 natal scenarios and adding 10 for the date workflow. The browser controller calls real HTTP handlers, onboarding/revision bridge, local PostgreSQL/RLS, actual deterministic calculators, persisted events and Library reader. One PGlite connection with synthetic claims is not a hosted JWT/PostgREST or multi-connection certification.

Date scenarios verify:

- Exact, consented natal revision and explicit date become an immutable workflow input.
- Calculation and history persist through QUEUED → CALCULATED → AWAITING_EDITORIAL. The owner can see pending history but neither calculation nor interpretation/downloads are released.
- Lost acknowledgement recovers read-only after profile edit, deletion and release revocation. Session storage contains only a request UUID; no replay occurs.
- Another account cannot read/recover the run, Library item or artifacts. Stale revision, approximate time, closed release and absent entitlement refuse before writes.
- Explicit reprocessing copies the original birth and target date, not the current or deleted profile; it creates a separate child and leaves its parent unchanged.
- 1900-01-01, leap day 2028-02-29 and 2099-12-31 persist exactly one sample at 12:00 UTC. Sample positions match a separately invoked provider at the explicit UTC/geocentric reference. Only natal/sample positions and the sample-instant fact are projected; no houses, aspects, events, compatibility or local-day coverage is invented.
- An explicit second date gets separate run, receipt and Library reference without changing the first snapshot.

Deterministic comparisons separately validate execution timestamps (both chart projections for date), normalize only those timestamps and retain every other fact/data/provenance field. The boundary checks initially expected ISO seconds without the engine's canonical `.000` milliseconds; the assertions were corrected to the observed canonical serialization, without changing runtime behavior.

## Verification

- Full web suite: **469 tests / 32 files PASS** (`test-results/wu063-web.log`). The focal suite contains 34 cases (`test-results/wu063-focal.log`).
- Svelte check: **0 errors, 0 warnings** (`test-results/wu063-check.log`). Scoped ESLint/Prettier passed.
- Only tests and evidence changed; WU-062 production build and 49 browser tests remain applicable to unchanged runtime/UI.
- WU-062 commit `da67f072af690024f3808c56039c4d8033687754`: quality `108124631352`, secrets `108124630948`, Pages `108124983895` observed completed/success.

No editorial approval, promotion or READY output is seeded. All 25 production definitions, engine/editorial/artifact policies and runtime defaults remain disabled. No hosted migration, scheduler, external calls or model homologation. This proves the local path up to the editorial gate, not a fully delivered reading or scientific validation of the engine. Interpretation, approved deliverables, audio and email remain open.
