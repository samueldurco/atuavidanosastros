# Sinastria — private intake, local validation

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU160, 29/09/2026. E1 independent requirement: collect the two natal records and optional reported relationship context with explicit, separate declarations, using the existing private request/recovery mechanism. All personal data in these tests are synthetic.

Implementation and validation are local PASS. Integral E1 remains blocked by approved aspect policy/engine and hosted input/session evidence. E2 remains blocked by legitimate editorial/model/prompt approval. E3–E5 are pending. This evidence neither publishes Sinastria nor approves its interpretation, calculation or release.

## Delivered behavior

- `atv-pair-request/2` is exclusive to `synastry`. V1 remains exclusive to Preview do Par and refuses context. Other product/version combinations, extra identity fields and broader sharing/continuity permission are refused.
- The authenticated owner's current COMPLETE, consented, EXACT profile is copied at the expected revision. The other person's canonical civil/UTC birth record is validated independently, with an initially unchecked declaration of permission to store/process it. This is the submitter's declaration, not bilateral verification.
- Optional context is exact reported text up to 1200 UTF-16 units. HTTP and SQL enforce shape, whitespace, controls and Unicode; the 8192-byte HTTP limit accommodates the full multibyte context. SQL preserves the 4096-byte v1 command limit and uses 8192 for v2. Context stays in the private immutable request/run; it does not update natal profiles or authorize ATV+ continuity.
- Partner/context edits and profile reconsultation clear both declarations. Every attempt clears in-memory drafts. Only the recovery UUID persists in session storage. Lost acknowledgement is recovered by reads, with no automatic replay or renewed profile access.
- The existing RPC, owner locks, RLS, release/entitlement/quota checks and atomic run/event/Library/receipt persistence are preserved. No release/engine flags, policy or production runtime registration were changed.
- Forward-fix restores Preview do Par v1 writes and refuses v2 writes, preserving original v2 history and read recovery. Reapplying the migration restores idempotent v2 retry. The separate original bridge revocation remains tested.

## Evidence

| Check                                                             | Result                                       | Local artifact                                                     |
| ----------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| SQL/HTTP/client focal                                             | 47 passed                                    | `test-results/wu160-focal-final.log`                               |
| Shared request, natal/date, JSON, onboarding/recovery regressions | 223 passed across 9 files                    | `test-results/wu160-web-regression.log`                            |
| Svelte/TypeScript                                                 | 0 errors, 0 warnings                         | `test-results/wu160-web-check-final.log`                           |
| Local Chromium                                                    | 22 passed: 15 Preview do Par and 7 Sinastria | `test-results/wu160-e2e.log`                                       |
| Formatting                                                        | 11 files PASS                                | `test-results/wu160-format-check.log`                              |
| Diff / secret scan                                                | 13 scoped files PASS / staged PASS           | `test-results/wu160-staged.diff`, `test-results/wu160-secrets.log` |

Focal tests include exact full-limit multibyte context and omission, rejected malformed commands, idempotent original retries after profile forgetting/release revocation, changed-command/cross-product collisions, private receipts, anonymous/service-role refusal, disabled release, unchanged engine approval and forward-fix/reapplication. The first run found a nonexistent recovery function name in the new test and one missing JSON response type; both test defects were corrected before the passing run. No production behavior was weakened.

Chromium coverage proves blank initial partner/context fields and unchecked declarations, exact v2 payload, private Library reference, draft clearing, context edits renewing permission, invalid whitespace refusing send/persistence and lost-response recovery without replay. The existing Preview do Par suite covers shared civil/UTC conflict, stale profile, unavailable access, keyboard/reflow and unauthenticated route behavior.

Visual inspection: full captures at 1440, 820, 390 and 320 px, with native-size mobile context/consent crops. Content, labels, focus outline, permission distinction and actions remain readable; narrow screens stack the explanation below the form. No overlap or clipping was observed. Automated document horizontal overflow was at most 1 px in each viewport. Captures: `test-results/wu160-synastry-intake-{1440,820,390,320}.png`; mobile crops also retained. This is local visual/interaction QA, not a complete accessibility certification.

## Remaining gates

No hosted migration, JWT/PostgREST session, independent-connection concurrency or live provider call was performed. Supabase remains owner-paused; hosted checks resume only after that condition changes. Retention/deletion/legal review, aspect policy and engine approval, complete interpreted content, model/prompt validation and release authorization remain required. All product releases stay off; automatic cost is zero. Fixtures and local checks do not meet those approvals.
