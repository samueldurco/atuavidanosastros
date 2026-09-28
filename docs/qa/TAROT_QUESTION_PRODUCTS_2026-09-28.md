# Question Tarot products — WU074

RUN_ID: ATV-20260902-170644Z-01A0630F.

## Scope and policy

Candidate calculation and existing intake/processing/Library flow for Foco Agora (`tarot-focus`) and Sim/Não responsável (`tarot-yes-no`). Exactly one question, optional context and explicit storage consent. Injected cards, verdicts and extra questions are rejected. The server run UUID fixes one upright card with the existing SHA-256/rejection-sampling draw; question text is not a seed. Reprocessing preserves the snapshot rather than drawing again.

The additive policy `atv-tarot-question-products/1.0.0` records an unevaluated interpretation and a null binary verdict. Existing deck, spread, draw algorithm and old snapshots are unchanged. Golden run `00000000-0000-4000-8000-000000000001`: Foco Agora `cups-14` (Rei de Copas); Sim/Não `pentacles-10` (Dez de Ouros). These are test vectors, not finished readings. No automatic decision advice or yes/no interpretation is emitted.

## Verification

- 18 domain tests PASS (`test-results/wu074-domain.log`): golden draws, deterministic retries, parallel request isolation, strict input and cancellation.
- 63 worker tests PASS (`test-results/wu074-worker.log`): registry, processing and editorial boundary. An initial failure exposed a test fixture that treated the new Tarot products as birth inputs; the fixture was corrected and the full focal worker suite passed.
- 70 focal web tests / 2 files PASS (`test-results/wu074-focal.log`). The existing product-parameterized suite now proves form → controller → HTTP → real local PGlite SQL → deterministic calculation → AWAITING_EDITORIAL → pending Library for all six symbolic products. It covers ownership isolation, disabled releases/entitlement, lost acknowledgements, read-only recovery after revocation and explicit reprocessing retaining the draw.
- 770 web tests / 40 files PASS (`test-results/wu074-web.log`).
- Domain/worker TypeScript PASS; web check zero errors/warnings and scoped ESLint PASS (`wu074-domain-check.log`, `wu074-worker-check.log`, `wu074-check.log`, `wu074-lint.log`).
- 23 serial Chromium E2E PASS (`test-results/wu074-e2e.log`), including closed gates, submission/recovery, real route authentication, keyboard focus, reduced motion and no horizontal overflow. Local build/preview completed as part of Playwright's owned web server.

## Visual verification

Existing symbolic intake composition preserved. Screenshots for both products at 320, 390, 820 and 1440 px: `test-results/wu074-<product>-<width>.png`. Inspected Sim/Não at 320 px and Foco Agora at 1440 px: legible policy warning, wrapped fields/actions, visible keyboard focus and distinct input/next-step sections. This does not certify integral Gate B, human screen-reader use or native zoom.

## Operational limits

Twelve partial bases / twenty-five definitions; thirteen calculations remain unavailable. Production releases, engine/editorial gates and promotion registry remain unchanged and blocked. No model or prompt homologation, external inference, paid call, hosted migration, scheduler, email delivery or production JWT claim.

Cloudflare review guidance informed preservation of request-local state, awaited calculations, AbortSignal propagation and bounded default-deny processing. No runtime API, binding or platform configuration changed. References: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/ and https://developers.cloudflare.com/workers/runtime-apis/web-crypto/ .
