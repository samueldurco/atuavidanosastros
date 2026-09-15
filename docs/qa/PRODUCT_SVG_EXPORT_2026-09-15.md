# Private cartography SVG — WU-039

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Local implementation and synthetic QA only; no product, engine or model homologation.

## Delivered boundary

- Birth-chart and ascendant only, from the versioned minimal geometry of the authorized saved calculation. SQL validates the shape before numeric casts and projects only canonical bodies/longitudes, requested angles and supported Placidus cusps. It never exposes civil input, coordinates of the person, distances or raw calculation payloads. The client parser independently validates and copies the projection.
- The existing owner read RPC retains publication/engine/promotion gates and grants, including emergency revocation. A disabled or revoked release has no cartography. The projection helper cannot be invoked by API roles. A tested forward-fix suppresses geometry without losing text, history or deletion.
- Same-origin authenticated download with a fresh owner read, catalog eligibility, attachment, private/no-store, restrictive SVG CSP, version and SHA-256. Embedded brand WOFF2 fonts and inert XML; no external assets, scripts, hyperlinks or foreign objects. Fail closed above 2 MB. Generated on demand, not an artifact manifest.
- Exact source angles; zero Aries left and counterclockwise longitudes. Numbered radial tracks prevent body collisions without shifting longitudes or claiming physical distances. No inferred aspects or substituted houses/ASC. Polar and ascendant-only variants explicitly show missing/not-requested geometry. Six displayed decimals do not claim six-decimal accuracy.
- Reader action with MIME verification and recoverable errors, hidden for unavailable/revoked/ineligible runs and disabled for synthetic local fixtures. Previously downloaded copies cannot be revoked.

## Verification

- `pnpm test`: **141 PASS** (11 domain, 20 AI, 23 astrology, 3 integrations, 36 worker, 48 web). Eight SVG renderer tests and ten shared download tests cover deterministic bytes, exact coordinates, malicious/malformed input, minimal metadata, catalog and access gates, session expiry and fresh revocation. Log: `test-results/wu039-unit.log`.
- `pnpm test:db`: **28 PASS**, including the five new cartography cases plus their parent suite. Real local PostgreSQL via PGlite with synthetic auth stubs; exact projection, malformed refusals, isolation, privilege revocation preserved on reapply, all release gates and forward-fix recovery. Log: `test-results/wu039-db.log`. This is not hosted JWT/PostgREST integration.
- Monorepo `pnpm check`: **PASS**, zero Svelte errors/warnings; `pnpm lint`: **PASS**. Logs: `test-results/wu039-final-check.log`, `wu039-lint.log`.
- Local build/preview and focal Playwright: **22 PASS**, including existing HTML/PDF reader regressions. Four standalone SVG variants (natal, coincident ten-body cluster, polar refusal, ascendant) verify exact geometry, loaded embedded fonts, text bounds and no external request. All four SVG images visually inspected. Four reader widths (1440/820/390/320) visually inspected, no overflow or overlapping controls. MEM-03 ReadingShell reference `58afdd10c4b7484d8167ea5c62b29ee3` retained; this is scoped visual QA, not full premium cartography Gate B. Log: `test-results/wu039-e2e.log`; ignored images under `apps/web/test-results/`.
- Initial standalone SVG screenshot timed out after geometry/font checks because the full-page capture path assumed an HTML body. Fixed the test to capture the exact 1000×1360 SVG viewport; all 22 tests passed on rerun. No product geometry changed to accommodate QA.
- Previous SHA `baa1971`: quality `104435408299` and Pages `104435868304` completed/success. Secrets `104435408563` reported inconsistent `in_progress`/`success`, so completion is not asserted here.

## Remaining gates

No hosted migration, paid provider call, release-flag update or model promotion. All 25 releases remain disabled in checked-in migrations. The SVG is a preserved-position diagram, not a complete premium map/aspect engine, persisted artifact, audio, email delivery or six finished verticals. Hosted JWT/resource-budget verification and integral engine/editorial approvals remain necessary before rollout.
