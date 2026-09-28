# Durable email history in the Library — WU073

RUN_ID: ATV-20260902-170644Z-01A0630F.

## Scope

Explicit authenticated owner/run history and cancellation of acknowledged revisions in the existing reader. Independent of the tab recovery key, sessionStorage availability, current revision and review digest. No automatic POST, browser receipt persistence, creation, sending, hosted migration or release activation. Switching to history hides exact-key controls until the component is remounted, avoiding conflicting acknowledged states.

The controller validates exact envelopes, pins receipt identity and terminal cancellation, serializes actions and uses a 15-second timeout. Ambiguous cancellation clears actionable receipts and requires explicit read-only reconciliation. Empty, unavailable and expired-authentication states are distinct; no server error or private data is reflected.

## Evidence

- 165 focal controller/parser/HTTP/PostgreSQL tests PASS (`test-results/wu073-focal-final.log`). Includes 38 new controller tests and a real controller → handler → local SQL case: advanced revision, revoked gates/profile, committed cancellation with lost acknowledgement, reconciliation and deletion.
- 756 web tests / 40 files PASS (`test-results/wu073-web-final.log`).
- Type check: zero errors and warnings (`test-results/wu073-check-final.log`). Scoped ESLint PASS (`test-results/wu073-lint-final.log`).
- 34 serial Chromium E2E tests PASS (`test-results/wu073-e2e-final.log`), including 9 new history cases and regressions for exact-key email, reader and artifacts. Local build/preview completed within this run; existing 24 route-exclusion warning remains.
- Initial E2E run: 31 passed, 3 failed (`test-results/wu073-e2e.log`). Two ambiguous list selectors were replaced with the accessible list name. A browser response-body retrieval failure on real authentication refusal was replaced by status, private/no-store header and safe visible-state assertions; exact JSON envelopes remain covered by real handler tests. Final replay passed all 34.

## Visual and interaction verification

Preserved Atlas Essencial v3 light reading surface and MEM03/SH03 action patterns (Stitch references `58afdd10c4b7484d8167ea5c62b29ee3` and `157daa1e0776415982d5ab65d092248f`). Tests cover 1440, 820, 390 and 320 px, reduced motion, post-action focus, action locks and no horizontal overflow. Screenshots under `test-results/wu073-e2e-final/` include each width and empty/unavailable states. Inspected 320 px cancellation and empty/unavailable final renders: wrapped controls, legible hierarchy, persistent empty explanation outside the live region and distinct failure feedback. This is scoped UI verification, not integral Gate B, human screen-reader or native zoom certification.

## Limits

No model or prompt homologated or promoted. New acceptance remains disabled in production; no transport, scheduler, paid call or email delivery. Synthetic localhost fixtures do not prove hosted JWT/PostgREST. SQL integration uses local PGlite and does not certify independent hosted concurrency. Hosted application of WU072 history migration remains pending. Unrelated work is excluded from this commit.
