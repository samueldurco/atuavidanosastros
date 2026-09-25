# Preview do Par — entrada autenticada

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-065. Synthetic local evidence only.

## Scope

`/biblioteca/nova/pair-preview` reuses the reviewed, consented, exact saved owner profile at its current revision. The browser sends only the revision, minimal partner birth data and two separate declarations to `/api/workflows/pair`. Partner fields start empty: date, time, precision, IANA zone, historical UTC offset and coordinates. Unknown/approximate times cannot be silently defaulted. Calendar, UTC round-trip, range, coordinates and DST gaps are checked locally and independently by SQL; either explicitly selected occurrence in a DST overlap is valid. Technical provenance is constant, never free identity/context.

Both storage consent and the submitter's declaration of the partner's permission start unchecked and reset on any partner edit or profile reconsultation. The latter is not verified bilateral consent. No name, contact, gender, sharing destination, message, partner account or automatic location lookup is collected. The page states the separate retention of immutable request copies, no marketing/ATV+ enrollment and no contact, email, publication or sharing authorization.

After every submission attempt the in-memory draft, profile and declarations are cleared. Session storage holds only the owner/product-scoped request UUID. Lost acknowledgements permit read-only recovery without profile, partner data, permission renewal or request replay, even when creation is unavailable. Known prewrite refusals clear the key; uncertain responses retain it. The UI describes separate partial Moon/Venus/Mars positions, not compatibility, feelings, destiny, aspects or houses, and does not promise approved output.

## Verification

- 66 focused tests passed (`test-results/wu065-focal.log`); 531 web tests / 35 files passed (`test-results/wu065-web.log`).
- Svelte check passed with zero errors/warnings; scoped ESLint and formatting passed (`test-results/wu065-check-final.log`, `wu065-lint.log`, `wu065-format-final.log`).
- 64 Chromium tests passed: 15 pair scenarios plus 49 date/natal/symbolic regressions (`test-results/wu065-e2e-retry.log`, one worker). Production build succeeded inside the suite; the existing 24 `_routes.json` exclusions warning remains.
- Four screenshots at 1440, 820, 390 and 320 px were visually inspected: readable layout, visible keyboard focus and no horizontal clipping. Tests assert reflow, input targets ≥44px, reduced motion and keyboard traversal of the two declarations into submission. Evidence: `apps/web/test-results/tests-pair-intake.e2e.ts-*/pair-intake-{width}.png`.
- The first two-worker browser attempt was interrupted after the local preview exited with `ProxyWorker: Network connection lost`; ensuing connection-refused errors do not establish a UI failure. Evidence: `test-results/wu065-e2e.log`. A clean single-worker retry is recorded separately.

## Design and limits

Composition uses Stitch project `2141801333950500965`, ID-02 (`133f01c9992f4ebc9ad46dbabd1746ec`), CMP-02 (`7e5a59578fce4c48853a139940e07418`) and SH-02 (`7d41b4e1322349109a91363bb7c2df2b`) within AuthenticatedShell. No exact pair-intake reference is available; this is not a new unrelated template. ID-02/CMP-02 exports are incomplete, so local composition QA cannot certify full Gate B or pixel parity.

Browser transport uses local synthetic fixtures. SQL bridge coverage is separate in `PAIR_PRODUCT_REQUESTS_2026-09-25.md`; real controller → handlers → SQL/RLS → deterministic calculation → Library coverage follows in WU-066. No hosted migration, activation, spend, model homologation, READY interpretation or artifact delivery is claimed. Releases and engine/editorial/artifact gates remain disabled. Hosted JWT/transport, independent-connection concurrency and legal/retention review remain pending.
