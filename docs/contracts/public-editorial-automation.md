# Public editorial automation v2

Status: implemented for local validation; no production authority or admitted article.

Owner authorization: editorial/SEO request of 2026-10-06, executed under RUN_ID `ATV-20260902-170644Z-01A0630F`. This contract adds the finite automatic-review path to `public-editorial-seo.md` and ADR 0006. The existing independent-review v1 path remains separate. It does not change private product approval, engine, commerce or release policy.

## Scope and identity

Only `kind: guide`, low-risk evergreen education, without calculation facts or a dated forecast. Guides use Article, including guides under `/noticias/AAAA/MM`. NewsArticle and the news sitemap retain their existing eligibility rules.

The final runtime document has Organization authorship, a truthful biography and `automationDisclosure: { generatedWithAI: true, humanReview: false, reviewMode: "separate-pass" }`. The article visibly discloses AI production and absence of independent human review. Article and author-profile JSON-LD use the actual author type; legacy authors retain Person by default.

The common validator still requires PUBLISHED, permitted path, actual dates, usable original sections, HTTPS sources and all applicable image/calculation rules. Invalid documents, conflicting IDs/paths or inconsistent author identities are excluded before the protocol is selected. Documents declaring automation must pass v2 and cannot fall back to v1. Exactly one matching automated package is allowed.

## Exact report and evidence

`editorial-automation.ts` implements policy `atvna-editorial-policy-2026-10-06-v1`, derived from the skill rubric; no local skill code is imported by the deployed build. SHA-256 covers the entire JSON document in UTF-8, object keys sorted lexically in UTF-16, arrays in their original order, undefined object properties omitted. Non-JSON objects and non-finite numbers fail.

Eight unique checks are mandatory: scope, claims, rights, identity, safety, originality, tools, integrity. Eight score dimensions have maxima 20/20/15/10/10/10/10/5 for intent/value/accuracy/trust/language/journey/metadata/maintenance. All checks must PASS, the total must reach 85, and each dimension must reach at least half its maximum rounded up. Corrections must be empty. UNKNOWN/FAIL, duplicate rows, invented score labels or disagreement between the declared and recalculated decision block approval. Every row has a reason and real evidence references.

The evidence manifest uses `atv-editorial-evidence-manifest-v1`, documentId, revision, documentDigest and unique `{path, sha256}` files. Paths are relative, without empty, dot or parent segments. The verifier loads actual bytes through a Map and recomputes every file hash. Every report reference must resolve to an included file, with at most one nonempty fragment. The manifest covers claims/sources, rights, identity and separate review, original contribution, links/CTAs and final metadata. A hash or signature does not itself establish factual quality or source rights.

## Authorized service attestation

Ed25519 authenticates the canonical payload without signature. Fields:

- protocol `atv-editorial-automation-v2`, keyId, reviewerId;
- documentId, revision, digest;
- policyVersion, decision `APROVADO_AUTOMATICAMENTE`, reviewMode `separate-pass`, risk `low-educational-evergreen`;
- reportDigest, evidenceManifestDigest, approvedAt, expiresAt.

Signature is Base64; publicKey is Base64 raw Ed25519, 32 bytes. Authorities are a server-owned allowlist with identityType `automated-service`, reviewerId different from the author, enabled true, revokedAt null, exact policy, allowedKinds exactly `["guide"]`, risk, validFrom/validUntil and audit-reference/digest for provisioning. Missing, disabled, revoked, unpinned or out-of-scope authorities fail closed. A key generated in a test or chat is not a production authority. No private key is stored in the app/repository.

Dates are real ISO instants: publishedAt <= modifiedAt <= reviewedAt <= approvedAt <= admission time < expiresAt. The attestation lasts at most 24 hours, lies inside the authority's validity and binds the exact document, report and manifest. Any change to body, dates, state, author, metadata, source, link, CTA or evidence requires a new full review and attestation.

## Admission, release and reading

`verifyAutomatedApproval` returns editorial eligibility with `PENDING_INTEGRATION_AND_RELEASE_GATES`; it does not publish. CI, Gate B, render/SSR, route/feed/canonical validation and the existing hosted-release checks remain mandatory.

After those gates pass, the trusted release process records `{acceptedAt, attestationDigest, gateEvidenceDigest}` in the server-owned registry. The release-evidence digest identifies the actual immutable gate proof maintained by the publisher; the reader verifies its presence/shape, not the execution of CI. No HTTP/client endpoint can submit this record. An admission made after expiry or in the future fails. The actual attestation hash must match.

`verifyAdmittedApproval` checks the whole package at the recorded admission instant on every read, while consulting the current authority allowlist/revocation state. The 24-hour admission window does not expire an already published guide. Preserve historical public keys for valid old admissions during rotation; disable/revoke a key to remove its affected guides. Authority validity is checked at admission, while current revocation always applies.

Only admitted guides enter public routes, hubs, author profiles, editorial sitemap and RSS. They never become news solely because of their URL. Drafts and unavailable packages do not acquire public canonicals, indexability, feed entries or publication dates.

## Finite onboarding and rollback

1. Obtain specific authorization for the real service identity and its external key custody/provisioning, without changing permissions or spending by implication.
2. Register only the public key, validity, finite guide scope and auditable provisioning evidence. Keep signing secrets external.
3. Freeze each final runtime package with actual metadata and dates; conduct a complete separate review of the exact digest, with all references resolving to included evidence.
4. Issue the authenticated attestation externally, then validate CI/Gate B/SSR and record the trusted admission. Release 3–5 guides first; verify the hosted pages before continuing to 12.
5. Confirm actual canonical, Article/Organization/disclosure, links, dates, robots, sitemap and HTTP behavior through the allowed provider API/CLI/HTTP path. Submit discovery only with an accessible verified Search Console property. No Indexing API for these guides.

Rollback removes only affected registry admissions or disables/revokes their authority, using a selective tracked change. Verify routes/hubs/feeds/cache and preserve history, drafts, evidence, other products and private receipts. Do not use feature flags, fixtures, fabricated signatures or reduced gates to complete release.
