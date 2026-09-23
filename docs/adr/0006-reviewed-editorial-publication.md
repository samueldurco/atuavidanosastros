# ADR 0006 — Separate review authority from publication service

Status: accepted for local implementation; production blocked.

The calculation processor ends at AWAITING_EDITORIAL. Giving the same service an output-plus-approval RPC would let it self-approve content using a syntactically valid digest. The Lab assessment is not an authentication or signature boundary.

Use private authority-owned receipts and a separate service-only publisher. A receipt pins one run/revision, full calculation and final delivery payload, review/basis digests, a promotion and its evidence digest. No app identity can insert or modify receipts, promotions or policy. This change intentionally provides no issuer. Issuance must later be authenticated and verify editorial assessment, exact rendered delivery representation, provenance and eval-backed promotion evidence. Neither a fixture nor a feature flag proves homologation.

Publish using a random lease token, expected revision, live release/engine/promotion checks and the stored receipt, never caller text. The policy defaults false. Bound abandoned claims to five and never fail a product into a fabricated reading. Keep exact completion receipts for uncertain responses without an automatic retry. Store a receipt FK on the resulting run, and recheck revocation/integrity at subsequent reads and artifact access. Expiry bounds authorization to publish; it does not expire a valid owned reading. Existing receipt-less rows retain historical semantics, with no restored unfenced service grant.

Expand-only local migration and a tested non-destructive forward-fix preserve history and deletion. SQL fixtures certify permissions, rollback and sequential fencing, not actual reviewer identities, model quality, hosted JWT or concurrent independent connections. No remote deployment or paid activity is authorized by this ADR.

WU-046 adds a portable, default-off publisher that consumes only the two service RPCs. Bounded cancellation suppresses late continuation but cannot prove rollback after a write dispatch. Therefore every ambiguous completion is reported as uncertain without automatic retries or cleanup writes. Exact next-revision acknowledgements are required to report publication. Telemetry is aggregate-only. This is not the receipt issuer or a hosted worker activation.
