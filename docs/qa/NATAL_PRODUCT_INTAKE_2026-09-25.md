# Natal product intake — local QA

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-059. 2026-09-25.

## Scope and evidence

Authenticated `/biblioteca/nova/[productId]` now composes the existing ID-02 natal onboarding archetype and SH-02 MemberShell for `birth-chart`, `three-pillars`, `ascendant` and `midheaven`. The existing symbolic forms remain supported. Availability is read through the minimal access projection; production releases remain disabled.

The natal form explicitly reads the saved profile, displays its revision and precision, and requires separate unchecked product-storage consent. Only a COMPLETE, EXACT profile permits submission. The browser sends the strict revision command to `/api/workflows/natal`, never a client-supplied birth snapshot. Profile data stays in component memory; the pending session-storage slot contains only a UUID. Every attempt clears the displayed snapshot and consent. Another request requires a fresh read and consent.

Uncertain acknowledgements retain the UUID and permit only read-only recovery. Recovery remains available after profile removal or gate revocation. A Library link requires verified owner/product/root projections, not merely a successful submission. Known pre-write refusals permit correction; ambiguous failures do not permit replay.

## Verification

- Web suite: **391 tests / 29 files PASS** (`test-results/wu059-web.log`). New client coverage: 21 scenarios; server access coverage includes all four natal products.
- Svelte check: **0 errors, 0 warnings** (`wu059-check.log`). Scoped ESLint and Prettier passed.
- Production build: exit 0 (`wu059-final-build.log`). Existing warning about 24 discarded `_routes.json` exclusions remains.
- Browser regressions: **52 PASS**, including 20 natal scenarios plus symbolic intake, reader and reprocessing recovery (`wu059-e2e.log`). The initial pre-hydration click failure was fixed by disabling profile read until controller initialization. An intermediate symbolic dream test failed during concurrent build; the final isolated suite passed without that interference.
- Local screenshots at 1440, 820, 390 and 320 pixels were inspected: readable reflow, no horizontal overflow, visible keyboard focus, explicit pending/limited language. Reduced-motion, keyboard controls and the skip link were checked. Visual QA exposed a hidden skip link overlapping content in full-page captures; clipping now hides it until focus, and a regression verifies focus revelation and navigation to main.

Screenshots: `test-results/wu059-browser/natal-intake.e2e.ts-visual-keyboard-reflow-{width}/natal-intake-{width}.png`. Synthetic data only.

## Design traceability and limits

Canonical Stitch project `2141801333950500965`: ID-02 `133f01c9992f4ebc9ad46dbabd1746ec`, SH-02 `7d41b4e1322349109a91363bb7c2df2b`. The cached ID-02 PNG is incomplete; this is an approved-archetype composition, **not full visual parity or Gate B completion**. P002–P004 result designs are not certified by an intake form. No human screen-reader or full 400% zoom certification is claimed.

Browser transport uses local synthetic fixtures. Actual SQL bridge coverage is documented in `NATAL_PRODUCT_REQUESTS_2026-09-25.md`; end-to-end runtime/Library integration from this natal controller is the next unit. Hosted JWT/PostgREST, concurrent database sessions and deployed onboarding are not certified. No migrations, promotions, paid calls, READY results, email, audio or downloadable delivery were activated. No model is homologated.
