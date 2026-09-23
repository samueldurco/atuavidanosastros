# WU-044 — Real calculation to private PDF/SVG/card recovery

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Synthetic local evidence only.

## Delivered and corrected

Three integration tests compose the actual natal calculator, validated calculation, SQL owner projection, fixed renderers, private producer/writer, real PGlite migration and owner HTTP recovery. Editorial approval and identities are explicitly synthetic; no model is involved. The tests prove exact PDF/SVG/card bytes and hashes, deterministic explicit retries, minimal manifest listing, owner isolation, promotion revocation, disabled policy, ineligible format/section refusal, same-length stored-byte corruption denial and recovery after restoring the exact original bytes.

The polar case preserves ten body longitudes and MC while withholding unsupported houses/ASC. Nothing infers missing geometry or promotes the experimental calculation.

This real-input test revealed that the mandatory engine warning contains Δ, which Newsreader/Onest subsets do not support. PDF and card previously refused the entire report. Both now use the already embedded Bodoni Moda glyph only for Δ, preserving the full warning and measuring the same font runs used for drawing. Mixed card lines share an alphabetic baseline and reserve both fonts' ascent/descent; other unsupported glyphs still fail closed. No font, dependency, external request or transliteration was added. Existing supported content keeps its layout and renderer version; previously refused Δ reports had no successful immutable artifact to overwrite.

## Validation

- 16 focal tests passed, including three SQL format integrations (`test-results/wu044-tests-final.log`).
- Full monorepo tests: 187 passed, including 84 web tests; 182 scoped/baseline plus five from the preserved concurrent work (`wu044-monorepo-final.log`).
- Web check: zero errors/warnings (`wu044-check-final.log`). Scoped ESLint and Prettier passed (`wu044-lint-final.log`, `wu044-format-final.log`); diff check passed.
- Global `pnpm check` failed in the unrelated untracked `packages/fabrica-de-midia` work (JSX typings, `.ts` import settings and missing `../types.ts`). That work was neither changed nor included; no claim of a green global working-tree type check (`wu044-monorepo-check.log`).
- Build/preview plus seven Chromium E2E passed (`wu044-e2e-final.log`): standard, long and repeated-Δ cards, intact text, loaded embedded fonts, no external requests/active content, bounded non-overlapping text, and reader controls at 1440/820/390/320px.
- Four natal PDF pages rendered with Poppler and inspected. PDF text extraction in pypdf layout mode preserves the exact UTC/ΔT warning; default extraction inserts line breaks at font switches, so it is not treated as layout proof. Final card and repeated-Δ card screenshots were inspected without clipping, overlap or baseline defects. Synthetic artifacts and screenshots are under `test-results/wu044/` and web Playwright results; not user readings or committed binaries.
- WU-043 `f657ead`: quality `106986497024`, secrets `106986497314`, Pages `106986753865` completed/success, rechecked through GitHub API.

## Boundaries

No hosted migration, JWT/PostgREST certification, producer registration, scheduler, paid provider, email/audio delivery, release activation or model homologation. Policy and all 25 releases remain disabled. The local tests do not certify independent database concurrency or hosted CPU/memory/global cost budgets. Existing unsupported-glyph, size/deadline, ownership and revocation gates remain mandatory. Revert the rendering fix to restore fail-closed Δ refusal; no stored data deletion is needed.
