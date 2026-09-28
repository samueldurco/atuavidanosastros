# Library email controls — WU071

RUN_ID: ATV-20260902-170644Z-01A0630F.

## Scope and evidence

- Authenticated workflow reader supplies only the verified owner ID. The email section stays visible after release revocation; a missing editorial digest permits existing-key recovery/cancellation, never acceptance. New requests remain disabled in the real reader and SQL policy remains false.
- Explicit consultation/cancellation, unchecked and non-persisted consent, pending locks against conflicting reader actions, live feedback and keyboard focus after completion. Mount performs no POST. UUID-only tab storage, no content/address, reset, resend or transport.
- 105 focal tests PASS: 55 controller, 40 HTTP/parser and ten PostgreSQL integrations. The real controller → handler → SQL revocation scenario now withholds the current review digest.
- 696 web tests / 39 files PASS (`test-results/wu071-web-retry.log`). Initial concurrent run had one existing SVG-render test exceed its 5000 ms timeout; isolated rerun passed unchanged, with no timeout increase.
- 25 local Chromium E2E PASS: ten email cases, nine complete-reader cases and six artifact cases, at 1440/820/390/320 px. Includes keyboard consent, no consent replay, lost acknowledgement/reload, withheld digest, pending locks, corrupt storage, uncertain cancellation and real unauthenticated HTTP refusal. Exact 401/auth_required and 503/auth_unavailable are distinguished; only confirmed pre-write 401 clears the fresh key.
- Build is part of the successful Playwright webServer command. Local Wrangler preview only, no hosted operation. Existing excluded-routes adapter warning remains; this is not release approval.
- Logs: `test-results/wu071-{focal,check,format}.log`, `wu071-lint-final.log`, `wu071-check-final.log`, `wu071-e2e-final.log`. Screenshots/traces under `test-results/wu071-browser-final/` (ignored local evidence).

## Visual QA / Gate B scope

Canonical Stitch project 2141801333950500965: MEM03 `58afdd10c4b7484d8167ea5c62b29ee3`, ReadingShell SH03 `157daa1e0776415982d5ab65d092248f`. Existing exports in `test-results/gate-b/references/` were consulted; MEM03 image and action-group HTML were inspected. This functional extension preserves the existing reading shell, light editorial surface, index, thin dividers, brand tokens and action grouping; it does not invent a sent-email template.

Cancelled states at 1440/390/320 px and disabled desktop state were visually inspected. The final 320 px capture was inspected again after the test adjustment: readable text, wrapped copy and no clipped button. Automated no-overflow assertions pass at all four widths. Keyboard traversal and live-status focus pass. This is scoped visual evidence, not integral Gate B, native zoom or human screen-reader certification.

## Failures retained and limits

The first two-worker preview lost its network connection (4 passed / 20 failed), with Wrangler ProxyController/ProxyWorker connection-loss diagnostics. Serial retry reached 23/24; the remaining test incorrectly required configured authentication instead of allowing the precise unconfigured-auth refusal. Final serial run passed 25/25 after correcting that assumption and adding a separate mocked 401 case. Failed runs remain in `wu071-e2e.log`, `wu071-e2e-retry.log` and their output folders; none is treated as a passing gate.

Current receipt recovery requires the same owner/run/revision UUID retained in this tab. Cross-session/lost-key discovery remains pending and is disclosed in the UI/contract. Synthetic intercepted E2E is not hosted JWT/PostgREST certification. No hosted migration, email delivery, scheduler, cost, release or model/prompt promotion. No model is homologated. Unrelated concurrent work was preserved.
