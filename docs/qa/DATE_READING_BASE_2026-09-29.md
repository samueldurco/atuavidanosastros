# Leitura da Data — E1 persisted projection audit

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-150. 2026-09-29.

The generic calculation validator previously accepted snapshots without checking correspondence between the date projection, persisted position displays and sampling provenance. The new pure date-specific guard runs before generic normalization can remove hidden fact metadata. It rejects inconsistent geometry/fact identity/source/order, date/12:00 UTC sample/JD, provenance/contracts/engine identity, report classification and limitations. No calculation, request/SQL schema, release flag or provider configuration changed. Preparation evidence advances to 1.24.0; valid Lab fact requests and corpus fingerprint remain unchanged.

Local evidence:

- Worker suite **127/127 PASS**, `test-results/wu150-worker.log`. After adding cross-projection engine identity checking, the affected date/context tests **10/10 PASS**, `wu150-projection-final.log`. TypeScript PASS, `wu150-worker-check-final.log`.
- New boundary cases cover 1900-01-01, valid leap day and 2099-12-31; polar natal latitude and explicit UTC-03:00 birth; exact 1,200 UTF-16 report including paired Unicode/newline/tab; unchanged calculated facts with optional reported context. Adversarial mutations cover original hidden metadata, missing/reordered facts/positions, changed contract/ranges/date/provenance, invented events/aspects/sharing and context control/unpaired-surrogate violations.
- Corpus/benchmark and PostgreSQL-compatible processing/editorial integration **51/51 PASS**, `wu150-root.log`; private web SQL flow **15/15 PASS**, `wu150-web-sql.log`. Valid facts retain the existing fingerprint; no synthetic approval is promoted.
- Scoped format, diff and staged secret checks recorded before commit. Existing admin/TikTok/media/social changes excluded. CI149 `36528393227` completed/success for SHA `e034433c88c0f959fced44480a2a707564b41620`, `wu150-ci.json`.

E1 is implemented/validated locally for the existing **partial single-instant base**, not complete engine/product acceptance. The snapshot has no temporal duration/window, intensity policy, cross-map aspects or exact-event search. E2–E5 remain pending for this product; complete editorial/model validation, legitimate approval and hosted owner-session checks are outstanding. Supabase remains blocked pending the owner's Resume action; operator/editor must supply approved content/model and review. No new paid call, hosted migration, READY publication, model promotion, sharing, ATV+ memory or release. R$0 and gates off.

Next: implement the date-specific interpretation coverage for available natal/sample evidence and declared context, explicitly withholding unsupported temporal claims; then integrate the private reader and verify its formats/states. Continue the 25-product queue, ATV+ and original plan. This WU does not close the whole product.
