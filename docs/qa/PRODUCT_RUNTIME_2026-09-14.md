# WU-037 — composed internal calculation runtime

RUN_ID: ATV-20260902-170644Z-01A0630F.

`createProductCalculators` composes the ten candidate adapters. `productCalculationCoverage` explicitly reports ten partial bases and fifteen unavailable product calculations, all publication-blocked. Six-universe coverage is not six completed product verticals.

`createProductProcessor` takes a service-only RPC transport and a copied explicit product allowlist. Default empty configuration performs no RPC or provider work. Unsupported, duplicate or malformed configuration fails before any operation. One call runs one durable step, bounded by the existing 20-second default/25-second maximum and separate three-second cleanup. No drain loop, scheduler, HTTP endpoint, environment credential, AI generation or publication path is introduced. Configured allowlists do not bypass database gates. Abort cannot preempt synchronous CPU work; production needs a host-level CPU limit and an abort-aware transport.

Verification: 125 monorepo unit tests PASS, full check with zero errors/warnings and lint PASS. Six new runtime unit tests cover all catalog coverage, default inactivity, invalid configuration/deadlines, caller-option mutation, exact one-claim behavior, redacted-by-construction metrics, unexpected claims and failing telemetry sinks. Existing processor tests retain timeout/lease fences. Evidence is in `test-results/wu037-*.log`.

PostgreSQL: 22 tests PASS. A new test configures ten real adapters, confirms all releases start disabled, then enables each solely inside the isolated PGlite test. Every product crosses input → queue → calculation → persistence → AWAITING_EDITORIAL, with Lab-compatible partial facts and owner-only Library metadata. No unreleased calculation/editorial is returned to a client; no promotion exists. This closes composition/integration of the calculation bases, not approved interpretation or complete delivery.

WU-036 SHA d38df4f: quality 104160351410, secrets 104160351556 and Pages 104160848678 completed/success via dedicated GitHub API. No remote migration, production activation, external model call or spend. Rollback by code revert; durable history remains intact. Hosted JWT/PostgREST, scheduler/authentication, model/motor homologation and remaining delivery gates stay open.
