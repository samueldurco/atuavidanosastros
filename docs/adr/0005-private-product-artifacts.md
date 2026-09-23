# ADR 0005 — Bounded private product artifacts

Date: 2026-09-15. Implemented locally; hosted activation remains disabled and unapproved.

## Decision

Store small immutable deliverable binaries in a private PostgreSQL `bytea` table, bound to the owner, run, revision and editorial review digest. The owner/run foreign key deletes bytes in the same transaction as the selected reading. This avoids introducing external-bucket orphan cleanup or publicly accessible URLs before a durable delivery runtime exists. It does not replace the existing legacy `deliverables` table or change any bucket.

An independent singleton policy defaults to false. A service-only RPC validates current product, contract, engine and promotion gates, owner, revision, format eligibility, renderer version, canonical base64, actual SHA-256, byte quotas and tuple idempotency. Browser roles cannot write or directly read either table. Authenticated owner RPCs provide minimal manifests and current-gate binary recovery. An artifact is not evidence of approval.

Only trusted, tested renderers may call the injected writer. SQL validates integrity and provenance bindings, not the semantic content or safety of arbitrary HTML/PDF/SVG supplied by a privileged service. No user-upload endpoint or service credential is added to the web application. The writer captures inputs before awaiting, enforces an at-most-ten-second deadline and accepts a receipt only if it matches the exact bytes and identity. An uncertain response must be retried identically, not reported as success.

## Bounds and trade-offs

- Web/PDF: 8 MiB per file. SVG/cards: 2,000,000 bytes per file.
- 16 MiB per run, 32 MiB and 200 artifacts per owner. Exact retries do not consume additional capacity.
- Owner advisory locks serialize capacity checks; shared run/policy/release/promotion locks coordinate writes with deletion and revocation. Independent-connection concurrency remains a staging verification requirement.
- Reading a file transports bounded base64 and verifies the hash again before sending an attachment. This temporarily duplicates bytes in memory. Database egress, global capacity, timeout and memory measurements require hosted certification; these local per-owner limits are not a global production budget.
- Existing on-demand exports remain available under their original gates. They are not automatically persisted. WU-043 adds a disabled-by-default local composition of fixed renderers, fresh owner reads and the writer; trusted hosted transport/scheduler is still pending, as is audio storage support.
- Existing downloaded copies cannot be recalled. Future requests require current owner and release authorization. Reprocessing creates a distinct run; it does not mutate an earlier file.

## Rollout and recovery

Migration: `20260915180000_product_artifacts.sql`. Do not enable its policy until hosted JWT/PostgREST, capacity, concurrency, trusted producer integration and existing product/editorial release gates pass. No release or model is homologated by this ADR.

Forward-fix: `20260915180000_disable_product_artifacts.sql` disables the policy and revokes public API execution without deleting data or preventing owner deletion through the existing run RPC. Any later re-enable requires deliberate reviewed grants and gates; applying the forward-fix is not a destructive rollback.

Evidence: `docs/qa/PRODUCT_ARTIFACT_STORAGE_2026-09-15.md`.

Producer composition evidence: `docs/qa/PRODUCT_ARTIFACT_PRODUCER_2026-09-22.md`. This does not satisfy hosted rollout prerequisites or enable policy.

Native-calculation PDF/SVG/card local round-trip evidence: `docs/qa/PRODUCT_ARTIFACT_FORMATS_2026-09-23.md`. This closes the prior stub-receipt limitation for these formats, not the hosted activation gates.
