# WU-064 — Preview do Par request bridge

RUN_ID: ATV-20260902-170644Z-01A0630F. Local-only implementation of `atv-pair-request/1`; see `docs/contracts/pair-product-requests.md`. All production releases, engine/editorial/artifact gates remain unchanged and disabled. No homologated model, hosted migration, paid call or sharing capability.

## Implemented

- Authenticated same-origin bounded HTTP endpoint, strict minimal parser, UUID-only response, fixed redacted errors and private response headers.
- SQL independently validates third-party civil/UTC calendar, registered timezone, coordinates, exact precision and separate storage/permission declaration. No third-party identity/profile, context, marketing or sharing consent.
- Current consented EXACT owner profile copied at the expected revision; separate partner birth snapshot; immutable private command/declaration/version receipt. Existing atomic release, entitlement, quota, run, event and Library writes reused.
- Owner/key idempotency, immutable recovery after profile edits/forget/revocation, collision refusal and forward-fix revoking only bridge calls. Run deletion cascades the private receipt.

## Evidence

- `test-results/wu064-focal.log`: 21 integration cases PASS against local PostgreSQL (PGlite), actual migrations and role switching. Cases include structural adversarial inputs, invalid calendar/normalization/range/timezones, DST gap and both explicit overlap occurrences, independent consent refusal, owner revision/precision, account isolation, forbidden receipt access, atomic gates/quota, retry/recovery/collisions, HTTP guards/redaction, cascading deletion and forward-fix recovery.
- `test-results/wu064-web.log`: 490 web tests, 33 files PASS.
- `test-results/wu064-check.log`: zero errors and warnings. Initial test-only unknown JSON typing was corrected before the final check.
- Scoped ESLint and Prettier PASS. Production build PASS (`test-results/wu064-build.log`), with the existing warning about 24 `_routes.json` exclusions.
- WU-063 CI observed completed/success: quality 108126902661, secrets 108126903106, Pages 108127293397, commit `3d8ee27846b49bc490b6dca68803a740abae35d4`.

## Boundaries

No UI changes or visual approval in this unit. Local SQL/auth stubs do not certify hosted JWT/PostgREST, independent-connection concurrency or retention/legal review. The declaration is recorded, not independently verified bilateral consent. This bridge does not retrofit the generic internal workflow contract; all releases remain closed. Pair calculations remain partial Moon/Venus/Mars positions without compatibility score, projected houses, inter-chart aspects, claims about feelings or interpretation. Next: authenticated intake, UUID-only recovery, explicit separate consent and frontend tests; then real vertical calculation/Library evidence without manufacturing an editorial approval.
