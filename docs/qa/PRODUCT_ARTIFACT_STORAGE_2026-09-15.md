# WU-041 — Private artifact persistence and recovery

RUN_ID: ATV-20260902-170644Z-01A0630F. Local synthetic evidence only.

## Delivered

Versioned disabled-by-default binary storage, service-only immutable writes, owner-only manifest/read RPCs, cascading deletion, strict web/PDF/SVG/card eligibility, canonical encoding and SHA-256 integrity, bounded injected writer and private recovery API. The actual renderer → service writer → PostgreSQL → authenticated API test recovers the exact HTML bytes, survives identical retries and enforces revocation/deletion. No public URL, user upload or browser service credential.

## Verification

- 164 monorepo tests pass: domain 14, AI 20, astrology 23, integrations 3, worker 40, web 64 (including one real SQL/API integration).
- 37 PostgreSQL tests pass, including nine artifact suite tests (parent included). Tests cover direct ACL denial, disabled policy, other-owner/run substitution, engine/release/contract/review/promotion revocation, digest/base64 corruption, identical retry/conflict, 16 MiB run quota, 32 MiB owner quota, 200-file owner bound, forward-fix and binary deletion. Quota fixtures use isolated superuser setup; they are not application write capabilities.
- Type checks pass. Initial web response narrowing and imported fixture JSDoc errors were fixed; final web check has zero errors/warnings. Remaining workspace packages passed the full check invocation.
- Lint, build and `git diff --check` pass. No visual surface changed in WU-041; WU-040's 28 E2E/visual evidence is preserved, not represented as a new run.
- The initial cardinality test incorrectly enclosed expected SQL errors in a transaction; it was corrected to isolated fixture cleanup and all database tests rerun. No production transaction behavior was weakened.
- Evidence: `test-results/wu041-unit-final.log`, `wu041-db-final.log`, `wu041-web-check.log`, `wu041-check-final.log`, `wu041-lint-final.log`, `wu041-build.log`, `wu041-api.log`.

Previous commit d7e7d85: GitHub API confirmed quality 104538819938, secrets 104538819766 and Cloudflare Pages 104539336077 completed/success on 2026-09-15. This is technical CI evidence, not product release approval.

## Not completed / not authorized by these tests

No model homologation, product activation, paid provider call, hosted migration or production artifact creation. All 25 checked-in product releases remain disabled; artifact policy is independently false. The service transport/producer and Library UI are not yet connected. Existing download generation does not silently create a stored artifact. Audio, email and broader product completion remain open.

Hosted JWT/PostgREST, independent concurrent connections, global capacity/cost, CPU/memory and latency require staging evidence before rollout. SQL checks bytes/provenance but trusts the privileged renderer for document content safety. Downloaded copies cannot be remotely erased. ADR 0005 records the trade-offs and nondestructive forward-fix.
