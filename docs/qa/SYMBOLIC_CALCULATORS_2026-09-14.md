# WU-032 — deterministic symbolic adapters

RUN_ID: ATV-20260902-170644Z-01A0630F. Local synthetic evidence, not product or editorial homologation.

## Delivered

Four registered portable calculators: daily-card, three-questions, dream-reading and dream-journal. Tarot uses a versioned 78-card candidate catalog and SHA-256 counter stream, rejection sampling and partial Fisher–Yates selection without replacement. The server-created run UUID fixes the draw; question text and client idempotency keys do not influence it. Reprocessing reuses the persisted snapshot. The candidate spread assigns one upright card per question; this is explicit product policy awaiting editorial review, not a claimed approved tradition.

Dream adapters preserve the report, date, declared emotions, personal associations and context as reported facts. Long narratives are split without losing characters or splitting surrogate pairs. Optional continuity consent does not imply history was loaded: recurrence remains unassessed and symbolic hypotheses are empty.

## Verification

- 91 monorepo unit tests PASS, including seven new domain tests: catalog invariants, fixed regression vector, retry/question independence, 128 synthetic runs, invalid/aborted requests, report separation, Unicode boundaries and absence of inferred history.
- 16 PostgreSQL/PGlite tests PASS. The real four adapters run through the durable processor and SQL to CALCULATED then AWAITING_EDITORIAL; Library metadata is retrievable, unpublished facts remain hidden. Reprocessing daily-card preserves its stored draw.
- Type check: zero errors/warnings. Lint and build PASS. Logs: `test-results/wu032-{all-unit,db,check,lint,build}.log`.
- WU-031 SHA `20d219bdf90ebd4be38ab4005acebb735d6d7709`: quality, secrets and Cloudflare Pages observed completed/success through the GitHub check-runs API on 2026-09-14.

## Limits and recovery

The fixed draw vector is an implementation regression vector, not an independent randomness certification. Deck names, spread and reversal policy are candidate content. Neither dream interpretation nor historical recurrence is implemented by these calculators. Other Tarot/Dream products remain unsupported by this registry. Hosted transport/scheduling, complete input UI, approved interpretation and delivery remain separate work. All 25 versioned releases remain disabled, promotion registry empty, external calls/spend zero. No migration or release flag was changed; rollback is code revert, preserving existing immutable snapshots and owner history. No new UI: prior visual/E2E baseline is unchanged.
