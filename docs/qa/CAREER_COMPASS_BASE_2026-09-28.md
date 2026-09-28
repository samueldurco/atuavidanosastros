# WU-098 — Bússola de Carreira: base factual e persistência

RUN_ID: ATV-20260902-170644Z-01A0630F

Implemented the master's explicit MC sign/degree requirement with a separate experimental 1.0.0 contract. Existing natal projections are unchanged. The runtime has 13 partial bases, not 13 finished products; 12 products still lack calculators.

Validation:

- 27 focal tests passed: calculator, registry, real local PostgreSQL processing (`test-results/wu098-focal.log`).
- 77 worker/corpus regression tests passed (`test-results/wu098-regression.log`).
- Worker TypeScript check passed (`test-results/wu098-check.log`).
- SQL proves default-disabled release, idempotent request recovery, persisted MC plus reported context, editorial stop, Library reference, owner isolation and separate reprocessing without altering the original snapshot.
- Unit tests cover invalid civil time/consent/product, polar MC, half-open sign boundaries, forged provenance, abort and independent output copies.
- Corpus 1.2.0: seven new strata, 91 total cases, 90 prepared and one correctly blocked. The previous 84-case request fingerprint is retained. Full request fingerprint: `2bfb070b0b5c7a9a5171ef5040350a9dd68ad4b60085dd6e25afd2600ba3809d`.

No interpretation, model call, new golden editorial result or benchmark promotion is claimed. No UI intake for this product was added in this WU. Hosted workflows remain disabled. Full product readiness still requires interpretation approval and the remaining vertical experience.

Previous WU097 commit `865291b`: quality 109017214133, secrets 109017213948 and Pages 109017808056 observed completed/success.
