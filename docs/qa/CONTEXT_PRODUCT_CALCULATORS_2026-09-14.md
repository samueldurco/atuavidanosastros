# WU-036 — partial pair and date calculation bases

RUN_ID: ATV-20260902-170644Z-01A0630F. Synthetic local evidence only; no model, motor or product homologation.

## Delivered

Two portable adapters extend calculation coverage to Amor & Relações and Ciclos & Tempo. Together with the earlier eight adapters, ten product IDs now have experimental/recorded calculation bases across six universes. This does NOT mean ten finished products or six complete verticals.

- `pair-preview`: separate Moon, Venus and Mars positions for A and B, with exact provenance and neutral roles. No inter-chart aspects, score, inferred feelings, gender, fate or bilateral sharing authorization. Both birth records and storage consent are validated before provider work.
- `date-reading`: ten natal positions and ten positions sampled once at 12:00 UTC on the requested date. This explicitly technical, partial basis is not local noon, coverage of a local day, event search, transit window or final editorial product policy. Current place/timezone is not inferred from birth. No houses or angles are projected.

The shared chart boundary now returns a detached copy, so a provider reusing its output object cannot overwrite the first person's calculation. Every chart independently retains the existing experimental engine contract and civil/UTC validation. No cross-chart aspect implementation or orb policy was introduced.

## Verification

- Eight new unit tests: factor selection, explicit sample, input sensitivity and reported context, pre-provider validation/consent, calendar bounds/leap day, malformed second output, abort fences and provider-object isolation. Worker: 30 tests PASS. Full monorepo: 119 unit tests PASS.
- Full check: zero errors/warnings; lint PASS. No dependency, UI, schema, hosted transport or release change.
- PostgreSQL: 21 tests PASS. The suite exercises both real adapters through private durable calculation and AWAITING_EDITORIAL, owner Library metadata, hidden unreleased facts, cross-owner refusal and immutable-parent reprocessing. Unlike Tarot's frozen draw, astrology reprocessing deliberately recalculates from the saved input into a new run under the existing SQL contract. A first test wrongly assumed all kinds reuse snapshots; that expectation was corrected, not the production policy.
- Invalid second-person civil/UTC correspondence becomes durable `input_invalid`, never a one-person fallback. Promotion registry remains empty. Logs: `test-results/wu036-{worker-unit,unit,check,lint,db}.log`.
- Prior WU-035 SHA `f40f7a83a24f07954ff76b94f23d630015352bcc`: quality 104156774222, secrets 104156773984 and Pages 104157213926 completed/success via GitHub API.

## Outstanding boundaries

Full synastry, couple dossier, week/calendar, horoscope and solar return remain unsupported. Input UX, human-reviewed product policy, independent motor validation, approved interpretation and full delivery are still required. PGlite tests use synthetic auth/storage stubs; they do not certify hosted JWT, PostgREST or concurrent consumers. All 25 releases remain disabled in migrations. No provider call, spend, production write or model promotion. Rollback: code revert, without deleting stored runs/history.
