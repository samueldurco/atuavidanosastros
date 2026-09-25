# Leitura de Data — entrada autenticada

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-062. Local synthetic evidence only.

## Scope

`/biblioteca/nova/date-reading` reuses the saved natal profile, exact-time requirement and revision check. The date is initially empty, strictly validated from 1900-01-01 to 2099-12-31, and requires separate storage consent. Changing it clears consent. The minimal command goes to `/api/workflows/date`; the browser never supplies birth data or stores the date/profile. Session storage contains only the owner/product-scoped request UUID. A lost acknowledgement recovers the existing request without replaying input, including after eligibility is revoked. Exact prewrite refusals allow a fresh request; uncertain responses retain the recovery key.

The form explicitly describes a single geocentric sample at 12:00 UTC, not a whole local day, aspects, events, favorable hours, a week, calendar or solar return. Birth timezone is not current location. Profile deletion does not delete the immutable request copy. Consent is not marketing or automatic ATV+ continuity. No result or download is promised before approval.

## Verification

- 71 focused tests passed: `test-results/wu062-focal.log`.
- 459 web tests / 32 files passed: `test-results/wu062-web.log`.
- Svelte check: zero errors and warnings: `test-results/wu062-check.log`.
- Scoped ESLint and Prettier passed. Production build succeeded inside the browser suite; the existing `_routes.json` exclusion warning remains.
- 49 Chromium browser tests passed: 14 date scenarios plus natal and symbolic regressions (`test-results/wu062-e2e.log`). Covers explicit input/consent, invalid range, changed-date consent reset, stale revision, lost acknowledgement, three unavailable-access states, three invalid-profile states, authentication, keyboard, reduced motion and reflow.
- Screenshots at 1440, 820, 390 and 320 px were visually inspected: readable layout, visible keyboard focus and no horizontal clipping. Browser assertions verify no horizontal overflow. Screenshots live under `apps/web/test-results/tests-date-intake.e2e.ts-*/date-intake-{width}.png`. This is not human screen-reader or full 400% zoom certification.

## Design and limits

Canonical Stitch project `2141801333950500965`: composition of ID-02 `133f01c9992f4ebc9ad46dbabd1746ec`, CMP-02 `7e5a59578fce4c48853a139940e07418` and SH-02 `7d41b4e1322349109a91363bb7c2df2b`. Existing Atlas typography, Field and member shell are retained. Cached ID-02/CMP-02 captures are incomplete; this is **INTAKE_LOCAL_QA_PASS / NOT_FULL_VISUAL_PASS**, not pixel parity or full Gate B approval.

Browser transport is mocked against local synthetic fixtures. Real SQL bridge coverage is separate in `DATE_PRODUCT_REQUESTS_2026-09-25.md`; controller → handlers → SQL/RLS → calculation → Library integration is WU-063. No hosted migration, activation, paid call, editorial approval, READY result, audio, email or downloadable delivery is claimed. All releases and engine/editorial/artifact policies stay disabled. No model is homologated.
