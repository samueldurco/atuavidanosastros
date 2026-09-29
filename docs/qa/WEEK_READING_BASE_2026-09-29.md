# WU178 — Semana E1 experimental base

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Baseline: `f26459ece8cd1f92eebf616ae2ac78faf3833e2d`. The preceding Horóscopo CI [36571703962](https://github.com/samueldurco/atuavidanosastros/actions/runs/36571703962) completed successfully for that exact commit (quality and secrets). Horóscopo remains partial and parked with its recorded editorial, policy, homologation and hosted-session blockers.

Implemented locally: versioned seven-date noon-UTC projection, shared unchanged natal basis, 88/89 exact facts, input capture, request-local provider cache, cancellation and strict original snapshot coherence. Registration and processor selection are independent explicit internal opt-ins. No production provider operation, database migration, model call or paid feature was used.

Validated locally:

- Focal Week/runtime suite: **25/25 PASS**, `test-results/wu178-focal.log`.
- Full Worker unit suite: **276/276 PASS**, no skips, `test-results/wu178-worker-unit.log`.
- Worker TypeScript: **PASS**, `test-results/wu178-worker-check.log`.
- Formatting and staged diff/secrets results are required by the closing helper and recorded in `test-results/wu178-format-check.log`, `wu178-diff.log` and `wu178-secrets.log` before commit.

Meaningful cases cover leap/month/year boundaries, first/last supported complete range, malformed birth/date/context rejected before provider work, exact maximum context with unchanged geometry, caller mutation after the first await, cancellation before and during the sequence, simultaneous isolated caches, corrupted/mixed provider charts, missing/reordered/repeated dates and mismatched natal provenance. Twenty-eight persisted tampering variants cover original keys, descriptors, symbols, arrays, facts, provenance, ranges, geometry, context, limits and invented events/windows. Runtime fixtures demonstrate one persisted complete calculation and later editorial routing without recalculation; they supply no editorial approval or hosted-session evidence.

The implementation follows the official [Workers best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/): awaited work, request-local state and propagated aborts. Latest downloaded Workers type reference `5.20260929.1` confirms `AbortSignal.throwIfAborted`; dependency versions and configuration remain unchanged. This portable runtime adds no deployment configuration.

Limits: only seven instantaneous samples; no aspects/events/windows, local-day coverage, favorable dates, recurring execution, calendar, reminders or interpretation. Generic calculation limits, free AI budgets, gates off and R$0 are preserved. E1 is partial; E2–E5 are pending. Real intake, approved complete interpretation, homologation, final web/formats contract (including the architecture's PDF requirement) and authenticated hosted acceptance remain requirements. CI for the new commit is tracked separately after push. Seventeen parallel admin/TikTok/media/social paths are preserved.
