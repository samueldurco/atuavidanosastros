# WU-047 — six-universe local vertical integration

RUN_ID: ATV-20260902-170644Z-01A0630F. Synthetic local fixtures only; no product/model approval.

`apps/web/src/lib/server/product-vertical.integration.spec.ts` composes the real input/reprocessing/deletion HTTP handlers, deterministic calculators, fenced SQL processor and publisher, owner reader, trusted web renderer, private artifact persistence and download handler. Six representatives cover Meu Céu (`birth-chart`), Ciclos & Tempo (`date-reading`), Amor & Relações (`pair-preview`), Tarot (`daily-card`), Propósito & Prosperidade (`midheaven`) and Sonhos (`dream-reading`). These are existing partial calculation bases, not proof of 25 finished products.

Each case verifies:

- Owner-scoped, idempotent creation and calculation → awaiting review → private fixture approval → READY, with Library reference and four-event history.
- Policy activation alone cannot publish an unapproved run. Fixture receipts are inserted by the local DB owner, never issued by the publisher/service.
- Persisted web bytes match the actual renderer; repeated writes return the same artifact. Recovery is private/no-store, escapes input markup and rejects another owner or a mismatched run/artifact.
- Reprocessing creates a separate version and approval boundary. Inputs are preserved; Tarot reuses the exact draw while the other five bases recalculate. Approval/editorial payloads are not inherited.
- Revoking the original receipt blocks its reading/download while the independently approved child remains accessible. Deleting the parent retains the child and nulls its parent link; deleting both removes runs, receipts, work and artifacts.

## Verification

- Six focused integration tests PASS: `test-results/wu047-vertical.log`.
- Full web suite: 17 files / 90 tests PASS: `test-results/wu047-web-unit.log`.
- Web `svelte-check`: zero errors and warnings: `test-results/wu047-web-check.log`; focused ESLint PASS: `test-results/wu047-lint.log`.
- WU-046 remote checks for `09465538ff28343a51269dadde907435f4472e0b`: quality 107148683738, secrets 107148683415 and Cloudflare Pages 107148942908 completed/success.

Authentication claims are supplied by a test adapter; SQL ownership/RLS are real local checks. This does not certify hosted JWT, independent concurrent sessions, provider quality, human-review authentication or deployed runtime limits. No UI/renderer changes, new visual QA or browser E2E claim. No hosted migration, paid provider, scheduler, model promotion or release/policy activation. The empty model registry and production blockers remain intact. Unrelated working-tree changes are excluded.
