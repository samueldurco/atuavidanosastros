# Week bounded temporal-calculation evidence

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU189; product `week-reading`, E1/E3. Synthetic/local data, R$0, release flags unchanged.

## Delivered

Independent operator-owned `experimentalWeekTemporalPolicy` registers the 1.2.0 experimental Week calculator. It captures workflow/policy, validates birth/range before provider work, obtains one natal chart and validated request-local transit charts, performs the 169-hour-grid nominal search and persists a bounded snapshot with shared source provenance and final observed event endpoints. Default coverage remains thirteen, the three Week modes are mutually exclusive, and legacy editorial deliberately refuses 1.2.0. The facts make no favorable-time or accuracy claim.

## Local proof

- Synthetic Caelus calculation: 635 chart calls including natal, 634 search evaluations, 169 grid rows, 336 retained rows, 86 nominal events, 34 candidates, **126,875 UTF-8 bytes**. `test-results/wu189-engine-projection.json` and `test-results/wu189-projection-smoke.mjs` retain the local evidence. The 373,085-byte full search and 2,878,197-byte source observation audit remain in WU188 files; the persisted projection drops only intermediate refinement observations, without rounding or event truncation.
- The focused integration suite checks calculator/projection equivalence, mutated policy capture, local source counts, generic and strict guards, legacy editorial rejection, default-off/exclusive runtime, invalid inputs before provider work and cancellation. It rejects missing rows, invalid longitude/time/ΔT, changed event/window/natal/provenance/policy/fact values and hidden metadata.
- Worker **332/332** `test-results/wu189-worker-tests.log`; TypeScript `test-results/wu189-check-final.log` and lint `test-results/wu189-lint.log` pass. Formatter, staged diff and secret scan are checked at closure.
- WU188 GitHub CI **SUCCESS**, SHA `2f35bbe2cba813299ebe6e21d6c4039008323c0b`, run `36598314225`, MCP proof `test-results/wu189-ci188.json`.

## Acceptance limits

E1/E3/E4 remain **EM_EXECUCAO** and E2/E5 **PENDENTE**. The projection is locally calculated and locally validated, not an approved reading or hosted release. Hourly search does not establish continuous event completeness; provider output is checked at the worker boundary but the stored snapshot has no cryptographic attestation. The synthetic smoke does not certify engine precision. Policy/engine homologation, complete Week interpretation, version-aware reader/PDF, legitimate approval, hosted validation and gates remain open. Supabase pause and Cloudflare 403 retain their previously recorded owner/actions. No UI changed.
