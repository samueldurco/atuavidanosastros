# WU-045 — Private reviewed publication boundary

RUN_ID: ATV-20260902-170644Z-01A0630F.

The local SQL migration implements authority-owned receipts, default-disabled policy and fenced publication independently of the calculation service. Service requests cannot supply output or fabricate review/promotion records. Completion pins the full calculation and stored final delivery, revision, live review validity/revocation, engine approval, product/contract and promotion evidence. Claims expose no user/content/evidence. Five abandoned 60-second leases exhaust automatic selection while preserving AWAITING_EDITORIAL. The persisted receipt binding also guards reader and artifact recovery after publication.

## Evidence

- Eight local database tests exercise real deterministic Tarot calculation through request → immutable calculation → awaiting review → synthetic private receipt → fenced READY → owner reader/library/history. The approval is explicitly a database-owner fixture, not a homologated interpretation or authenticated human review.
- Private tables and helpers deny anon/authenticated/service reads and writes; client RPC calls and old unfenced service publication remain denied. False policy and missing receipt prevent selection.
- Same-token retry appends no second event; expired/replaced token, wrong revision, wrong run/receipt and five abandoned leases refuse completion.
- Policy, workflow/contract, promotion/evidence, review expiry/revocation and full calculation are checked after claim, with unchanged state/event count on rejection. Experimental calculation needs an approved engine.
- Receipt revocation closes reader, artifact listing and exact stored-byte recovery. Receipt deletion cannot bypass the binding. Approval-window expiry does not remove already delivered owner access. Owner deletion cascades review/work records.
- Forward-fix stops new publication, preserves reads/deletion, and migration preserves a previously revoked reader ACL. Blank migrations contain zero receipts/promotions and zero enabled definitions.

Commands/logs: `node --test scripts/product-editorial-db.test.mjs` → `test-results/wu045-db-focal.log`; complete database regression → `test-results/wu045-db-all.log`.

Result: 8/8 focal and 45/45 complete database tests PASS; worker TypeScript check, Node syntax check and `git diff --check` PASS. No UI or renderer was changed, so WU-044 visual/build evidence was not rerun or relabeled. The known unrelated `fabrica-de-midia` global-check failure and concurrent admin/TikTok/lockfile work were preserved.

## Remaining release blockers

No authenticated issuer or runtime publisher adapter is included. Issuance must verify WU-034 review, exact final delivery mapping and pinned provider/model/prompt provenance against actual eval-backed promotion evidence. SQL authority references/digests alone cannot establish quality or authenticity. Test fixtures cannot be used as release data.

PGlite uses synthetic auth/storage stubs and sequential lease interleaving, not hosted JWT, PostgREST, Storage or independent-connection concurrency proof. All policies/releases remain disabled; no model is homologated, no provider invoked and no hosted migration applied. Prior WU-044 SHA 8865136 CI observed completed/success: quality 107141557376, secrets 107141557718, Pages 107141792840.
