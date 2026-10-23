# Chart wheel crop regression — 2026-10-20

Base reviewed: `f7acc3343bc10e03dadd2b6adb67e557781a73b6` (PR 45). The source repair was integrated in `0d5199e`; the calendar regression assertion was strengthened in `0d6d5f8`.

The former natal viewBox (`40 40 820 820`) clipped the left and right comparison card rectangles and their labels. The helper now retains the centered natal square while expanding it to include the actual exported marker rectangles, strokes, and a four-unit margin. SVG geometry and calculated facts remain unchanged.

## Focused verification

`pnpm --dir apps/web exec vitest run src/lib/astrological-chart-presentation.spec.ts`: 10/10 PASS, 13.65 s. The six new regressions calculate actual product maps and verify every card boundary, unchanged marker/leader geometry, and unchanged scene facts. Existing natal, rounding, source, and positions regressions also pass. Scoped `git diff --check`: PASS.

| Product | Corrected viewBox | Cards |
| --- | --- | --- |
| date-reading | 14 14 872 872 | 20 |
| synastry | 13 13 874 874 | 20 |
| couple-dossier | 13 13 874 874 | 20 |
| week-reading | 14 14 872 872 | 20 |
| personal-calendar | 14 14 872 872 | 20 |
| career-forecast-30d | 14 14 872 872 | 20 |

## Visual inspection

Local Chromium renders use the final saved date-reading and synastry maps from `artifacts/current-final-20261020`. Before images reproduce the original viewBox on the same geometry; after images use the repaired helper. Native captures are 880 × 880 (820-pixel image); mobile captures are 390 × 430 (366-pixel image).

Inspected: `synastry-before-native.png`, `synastry-after-native.png`, `synastry-after-mobile.png`, `date-reading-before-native.png`, `date-reading-after-native.png`, and `date-reading-after-mobile.png`.

Before: confirmed cuts through the outer cards on both sides. After: all 20 cards, their borders, and their text remain inside the image. No newly clipped zodiac glyphs, axes, rings, aspects, or leaders observed. Mobile overview labels remain small at this scale; the existing enlargement control and positions table remain the detail-reading surfaces. This inspection covers SVG framing, not a new end-to-end application audit.

Visual crop repair accepted. No remaining blocker in this scoped change. This report records the focused local review; CI, merge, and hosted publication are tracked separately in the release evidence.
