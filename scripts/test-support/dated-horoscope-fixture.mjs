// Ephemeral signing material and synthetic approval evidence, exclusively for tests.
// Nothing from this helper may be admitted to the repository's real registry.
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  digest, byteDigest, attestationPayload, GATE,
} from "../../apps/web/src/lib/server/editorial-automation.ts";
import {
  DATED_POLICY, DATED_PROTOCOL, DATED_METHOD, DATED_REVIEW_MODE, DATED_RISK,
  SIGNS, datedHoroscopeIndexDocument,
} from "../../apps/web/src/lib/server/dated-horoscope-automation.ts";
import { composeDocumentAndClaims, corpusDigest, ALGORITHM_VERSION } from "../lib/public-horoscope-compose.mjs";
import { CORPUS_VERSION } from "../lib/public-horoscope-corpus.mjs";

export const FIXTURE_NOW = new Date("2026-10-20T18:00:00.000Z");
export async function signedHoroscopeFixture({ frozenAt = "2026-10-20T17:00:00.000Z" } = {}) {
  const facts = JSON.parse(fs.readFileSync(new URL("../../docs/editorial/horoscope-2026-10-20/recurring-v3-daily/facts.json", import.meta.url), "utf8"));
  const keys = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const sign = async (value) => {
    const { signature: ignored, ...payload } = value;
    return { ...payload, signature: Buffer.from(await crypto.subtle.sign("Ed25519", keys.privateKey, attestationPayload(payload))).toString("base64") };
  };
  const composition = {
    corpusVersion: CORPUS_VERSION, corpusDigest: corpusDigest(),
    algorithmVersion: ALGORITHM_VERSION,
    algorithmDigest: createHash("sha256").update("synthetic-algorithm-binding").digest("hex"),
    reviewMode: DATED_REVIEW_MODE,
  };
  const generated = SIGNS.map((signName) => composeDocumentAndClaims(facts, signName, frozenAt));
  const scope = {
    schemaVersion: "atv-dated-horoscope-preparation-v1",
    policyVersion: DATED_POLICY, methodVersion: DATED_METHOD,
    keyId: "synthetic-key", reviewerId: "synthetic-service", period: facts.period,
    startDate: facts.startDate, endDateExclusive: facts.endDateExclusive,
    frozenAt, factsDigest: await digest(facts), composition,
    documentDigests: Object.fromEntries(await Promise.all(generated.map(async ({ document }) => [document.id, await digest(document)]))),
    claimsDigests: Object.fromEntries(await Promise.all(generated.map(async ({ document, claims }) => [document.id, await digest(claims)]))),
  };
  const corpusReview = {
    schemaVersion: "atv-horoscope-corpus-review-v1", policyVersion: DATED_POLICY,
    authoringAgent: "synthetic-author", reviewerAgent: "synthetic-independent-reviewer",
    reviewedAt: "2026-10-20T16:00:00.000Z", composition,
    checks: ["scope", "claims", "rights", "identity", "safety", "originality", "tools", "integrity"]
      .map((id) => ({ id, status: "PASS", reason: "Synthetic test only.", evidence: ["fixture/evidence.txt#fixture"] })),
    scores: Object.entries({ intent: 20, value: 20, accuracy: 15, trust: 10, language: 10, journey: 10, metadata: 10, maintenance: 5 })
      .map(([id, points]) => ({ id, points, reason: "Synthetic test only.", evidence: ["fixture/evidence.txt"] })),
    decision: "APROVADO_AUTOMATICAMENTE", corrections: [], publicationGate: GATE,
  };
  const grant = await sign({
    protocol: "atv-dated-horoscope-grant-v1", keyId: scope.keyId, reviewerId: scope.reviewerId,
    policyVersion: DATED_POLICY, methodVersion: DATED_METHOD, reviewMode: DATED_REVIEW_MODE,
    composition, ownerDecisionDigest: "a".repeat(64), corpusReviewDigest: await digest(corpusReview),
    allowedPeriods: ["daily", "weekly", "monthly"], validFrom: "2026-10-20T16:30:00.000Z",
    validUntil: "2026-11-30T00:00:00.000Z", coverageFrom: "2026-10-01",
  });
  const evidence = "Synthetic evidence only. No real editorial approval.";
  const evidenceHash = await byteDigest(new TextEncoder().encode(evidence));
  const packages = await Promise.all(generated.map(async ({ document, claims }) => {
    const runtimeReport = {
      schemaVersion: "atv-dated-horoscope-runtime-v1", documentId: document.id,
      documentDigest: await digest(document), factsDigest: await digest(facts),
      claimsDigest: await digest(claims), scopeDigest: await digest(scope), composition,
      verifiedAt: "2026-10-20T17:10:00.000Z", decision: "PASS",
      checks: Object.fromEntries(["facts", "claims", "composition", "coverage", "disclosure", "differentiation"].map((name) => [name, "PASS"])),
    };
    const evidenceManifest = {
      schemaVersion: "atv-editorial-evidence-manifest-v1", documentId: document.id,
      revision: 1, documentDigest: await digest(document),
      files: [{ path: "fixture/evidence.txt", sha256: evidenceHash }],
    };
    const attestation = await sign({
      protocol: DATED_PROTOCOL, keyId: grant.keyId, reviewerId: grant.reviewerId,
      policyVersion: DATED_POLICY, risk: DATED_RISK, reviewMode: DATED_REVIEW_MODE,
      documentId: document.id, revision: 1, digest: await digest(document),
      evidenceManifestDigest: await digest(evidenceManifest), reportDigest: await digest(runtimeReport),
      scopeDigest: await digest(scope), claimsDigest: await digest(claims), factsDigest: await digest(facts),
      corpusReviewDigest: await digest(corpusReview), runtimeReportDigest: await digest(runtimeReport),
      grantDigest: await digest(grant), decision: "APROVADO_AUTOMATICAMENTE",
      approvedAt: "2026-10-20T17:15:00.000Z", expiresAt: "2026-10-21T17:15:00.000Z",
    });
    return { document, report: null, evidenceManifest, attestation, dated: { scope, claims, facts, corpusReview, runtimeReport, grant } };
  }));
  const index = await sign({
    protocol: "atv-dated-horoscope-index-v1", keyId: grant.keyId, reviewerId: grant.reviewerId,
    scopeDigest: await digest(scope), grantDigest: await digest(grant), signedAt: "2026-10-20T17:15:00.000Z",
    documents: generated.map(({ document }) => datedHoroscopeIndexDocument(document)),
    documentDigests: scope.documentDigests,
  });
  const authorities = { [scope.keyId]: {
    identityType: "automated-service", reviewerId: grant.reviewerId, enabled: true, revokedAt: null,
    publicKey: Buffer.from(await crypto.subtle.exportKey("raw", keys.publicKey)).toString("base64"),
    policyVersion: "atvna-editorial-policy-2026-10-06-v1", allowedKinds: ["guide"],
    allowedRisks: ["low-educational-evergreen"],
    validFrom: "2026-10-01T00:00:00.000Z", validUntil: "2027-01-01T00:00:00.000Z",
    provisioningEvidence: { id: "synthetic-only", digest: "b".repeat(64) },
  }};
  return {
    now: new Date(FIXTURE_NOW), authorities, sign,
    batch: {
      schemaVersion: "atv-dated-horoscope-signed-batch-v1", packages,
      archiveIndexes: [{ index, scope, grant }], snapshots: [facts],
      evidenceByDigest: { [evidenceHash]: evidence },
    },
  };
}
