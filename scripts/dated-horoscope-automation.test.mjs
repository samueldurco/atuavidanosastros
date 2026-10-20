// Synthetic review and ephemeral in-memory Ed25519 key: never publication evidence.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import {
  digest, byteDigest, attestationPayload, verifyAutomatedApproval,
  verifyAdmittedApproval, freezeEditorialJson, GATE,
} from "../apps/web/src/lib/server/editorial-automation.ts";
import {
  DATED_POLICY, DATED_PROTOCOL, DATED_METHOD, DATED_REVIEW_MODE, DATED_RISK, SIGNS,
  assessHoroscopeCorpusReview, datedHoroscopeIndexDocument, verifyDatedHoroscopeIndex,
} from "../apps/web/src/lib/server/dated-horoscope-automation.ts";
import { composeDocumentAndClaims, corpusDigest, ALGORITHM_VERSION } from "./lib/public-horoscope-compose.mjs";
import { CORPUS_VERSION } from "./lib/public-horoscope-corpus.mjs";

const now = new Date("2026-10-20T18:00:00.000Z");
const frozenAt = "2026-10-20T17:00:00.000Z";
const facts = JSON.parse(fs.readFileSync(new URL("../docs/editorial/horoscope-2026-10-20/recurring-v3-daily/facts.json", import.meta.url), "utf8"));
const weights = { intent: 20, value: 20, accuracy: 15, trust: 10, language: 10, journey: 10, metadata: 10, maintenance: 5 };
const ids = ["scope", "claims", "rights", "identity", "safety", "originality", "tools", "integrity"];
const copy = (v) => structuredClone(v);
async function fixture() {
  const keys = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const sign = async (v) => ({ ...v, signature: Buffer.from(await crypto.subtle.sign("Ed25519", keys.privateKey, attestationPayload(v))).toString("base64") });
  const evidence = new TextEncoder().encode("Synthetic evidence only. No real editorial approval.");
  const composition = {
    corpusVersion: CORPUS_VERSION, corpusDigest: corpusDigest(),
    algorithmVersion: ALGORITHM_VERSION,
    algorithmDigest: createHash("sha256").update("synthetic-algorithm-binding").digest("hex"),
    reviewMode: DATED_REVIEW_MODE,
  };
  const batch = SIGNS.map((s) => composeDocumentAndClaims(facts, s, frozenAt));
  const { document, claims } = batch[0];
  const scope = {
    schemaVersion: "atv-dated-horoscope-preparation-v1",
    policyVersion: DATED_POLICY, methodVersion: DATED_METHOD,
    keyId: "synthetic-key", reviewerId: "synthetic-service", period: facts.period,
    startDate: facts.startDate, endDateExclusive: facts.endDateExclusive,
    frozenAt, factsDigest: await digest(facts), composition,
    documentDigests: Object.fromEntries(await Promise.all(batch.map(async (v) => [v.document.id, await digest(v.document)]))),
    claimsDigests: Object.fromEntries(await Promise.all(batch.map(async (v) => [v.document.id, await digest(v.claims)]))),
  };
  const review = {
    schemaVersion: "atv-horoscope-corpus-review-v1", policyVersion: DATED_POLICY,
    authoringAgent: "synthetic-author", reviewerAgent: "synthetic-independent-reviewer",
    reviewedAt: "2026-10-20T16:00:00.000Z", composition,
    checks: ids.map((id) => ({ id, status: "PASS", reason: "Synthetic test.", evidence: ["fixture/evidence.txt#fixture"] })),
    scores: Object.entries(weights).map(([id, points]) => ({ id, points, reason: "Synthetic test.", evidence: ["fixture/evidence.txt"] })),
    decision: "APROVADO_AUTOMATICAMENTE", corrections: [], publicationGate: GATE,
  };
  const runtime = {
    schemaVersion: "atv-dated-horoscope-runtime-v1", documentId: document.id,
    documentDigest: await digest(document), factsDigest: await digest(facts),
    claimsDigest: await digest(claims), scopeDigest: await digest(scope), composition,
    verifiedAt: "2026-10-20T17:10:00.000Z", decision: "PASS",
    checks: Object.fromEntries(["facts", "claims", "composition", "coverage", "disclosure", "differentiation"].map((k) => [k, "PASS"])),
  };
  const grant = await sign({
    protocol: "atv-dated-horoscope-grant-v1", keyId: "synthetic-key", reviewerId: "synthetic-service",
    policyVersion: DATED_POLICY, methodVersion: DATED_METHOD, reviewMode: DATED_REVIEW_MODE,
    composition, ownerDecisionDigest: "a".repeat(64), corpusReviewDigest: await digest(review),
    allowedPeriods: ["daily", "weekly", "monthly"], validFrom: "2026-10-20T16:30:00.000Z",
    validUntil: "2026-11-30T00:00:00.000Z", coverageFrom: "2026-10-01",
  });
  const manifest = {
    schemaVersion: "atv-editorial-evidence-manifest-v1", documentId: document.id,
    revision: 1, documentDigest: await digest(document),
    files: [{ path: "fixture/evidence.txt", sha256: await byteDigest(evidence) }],
  };
  const attestation = await sign({
    protocol: DATED_PROTOCOL, keyId: grant.keyId, reviewerId: grant.reviewerId,
    policyVersion: DATED_POLICY, risk: DATED_RISK, reviewMode: DATED_REVIEW_MODE,
    documentId: document.id, revision: 1, digest: await digest(document),
    evidenceManifestDigest: await digest(manifest), reportDigest: await digest(runtime),
    scopeDigest: await digest(scope), claimsDigest: await digest(claims), factsDigest: await digest(facts),
    corpusReviewDigest: await digest(review), runtimeReportDigest: await digest(runtime),
    grantDigest: await digest(grant), decision: "APROVADO_AUTOMATICAMENTE",
    approvedAt: "2026-10-20T17:15:00.000Z", expiresAt: "2026-10-21T17:15:00.000Z",
  });
  const authority = {
    identityType: "automated-service", reviewerId: grant.reviewerId, enabled: true, revokedAt: null,
    publicKey: Buffer.from(await crypto.subtle.exportKey("raw", keys.publicKey)).toString("base64"),
    // Existing evergreen authority remains unchanged; the signed finite grant extends scope.
    policyVersion: "atvna-editorial-policy-2026-10-06-v1", allowedKinds: ["guide"],
    allowedRisks: ["low-educational-evergreen"],
    validFrom: "2026-10-01T00:00:00.000Z", validUntil: "2027-01-01T00:00:00.000Z",
    provisioningEvidence: { id: "synthetic-only", digest: "b".repeat(64) },
  };
  return {
    document, report: null, evidenceManifest: manifest,
    evidenceFiles: new Map([["fixture/evidence.txt", evidence]]), attestation,
    dated: { scope, claims, facts: copy(facts), corpusReview: review, runtimeReport: runtime, grant },
    authorities: { [grant.keyId]: authority }, now, sign, batch,
  };
}
test("dated protocol verifies real synthetic Ed25519 signatures and exact composition", async () => {
  assert.equal((await verifyAutomatedApproval(await fixture())).approved, true);
});
const mutations = {
  "changed interpretation": (x) => x.document.sections[0].paragraphs[0] += " altered",
  "changed factual longitude": (x) => x.dated.facts.rows[0][1] += 1,
  "changed symbolic sector": (x) => x.dated.claims.claims[0].positionObservations[0].sectors.sun = 12,
  "fabricated independent review": (x) => x.dated.corpusReview.reviewerAgent = x.dated.corpusReview.authoringAgent,
  "missing corpus evidence": (x) => x.evidenceFiles.clear(),
  "wrong signed scope": (x) => x.dated.scope.documentDigests[x.document.id] = "f".repeat(64),
  "different corpus": (x) => x.dated.scope.composition.corpusDigest = "c".repeat(64),
  "tampered grant signature": (x) => x.dated.grant.signature = Buffer.alloc(64).toString("base64"),
  "tampered document signature": (x) => x.attestation.signature = Buffer.alloc(64).toString("base64"),
  "revoked authority": (x) => x.authorities["synthetic-key"].revokedAt = "2026-10-20T17:30:00.000Z",
  "expired admission window": (x) => x.now = new Date("2026-10-21T17:15:00.000Z"),
  "missing disclosure": (x) => delete x.document.automationDisclosure,
};
test("corpus rubric requires integer points and rounded-up per-category minimums", async () => {
  const f = await fixture();
  for (const [id, points] of [["accuracy", 7.5], ["maintenance", 2.5], ["accuracy", 7], ["maintenance", 2]]) {
    const review = copy(f.dated.corpusReview);
    review.scores.find((row) => row.id === id).points = points;
    assert.equal(assessHoroscopeCorpusReview(review), false, `${id}:${points}`);
  }
  const boundary = copy(f.dated.corpusReview);
  boundary.scores.find((row) => row.id === "accuracy").points = 8;
  boundary.scores.find((row) => row.id === "maintenance").points = 3;
  assert.equal(assessHoroscopeCorpusReview(boundary), true);
});
for (const [name, mutate] of Object.entries(mutations)) test(`dated protocol rejects ${name}`, async () => {
  const f = await fixture(); mutate(f);
  assert.equal((await verifyAutomatedApproval(f)).approved, false);
});
test("future packages stay admitted historically, but authority revocation still applies", async () => {
  const f = await fixture();
  const publication = { ...f, admission: {
    acceptedAt: now.toISOString(), attestationDigest: await digest(f.attestation),
    gateEvidenceDigest: "c".repeat(64),
  }};
  assert.equal((await verifyAdmittedApproval({ ...publication, now: new Date("2026-11-01T00:00:00.000Z") })).approved, true);
  f.authorities["synthetic-key"].revokedAt = "2026-10-25T00:00:00.000Z";
  assert.equal((await verifyAdmittedApproval({ ...publication, now: new Date("2026-11-01T00:00:00.000Z") })).approved, false);
});

async function indexFixture() {
  const f = await fixture();
  const { scope, grant } = f.dated;
  const index = await f.sign({
    protocol: "atv-dated-horoscope-index-v1", keyId: grant.keyId, reviewerId: grant.reviewerId,
    scopeDigest: await digest(scope), grantDigest: await digest(grant),
    signedAt: "2026-10-20T17:15:00.000Z",
    documents: f.batch.map(({ document }) => datedHoroscopeIndexDocument(document)),
    documentDigests: scope.documentDigests,
  });
  return { indexEntry: { index, scope, grant }, authorities: f.authorities, now, sign: f.sign };
}
test("compact index validates a complete signed interval", async () => {
  assert.equal((await verifyDatedHoroscopeIndex(await indexFixture())).approved, true);
});
const indexMutations = {
  "changed title": (f) => f.indexEntry.index.documents[0].title += " altered",
  "missing sign": (f) => f.indexEntry.index.documents.pop(),
  "changed scope": (f) => f.indexEntry.scope.claimsDigests[Object.keys(f.indexEntry.scope.claimsDigests)[0]] = "f".repeat(64),
  "wrong index signature": (f) => f.indexEntry.index.signature = Buffer.alloc(64).toString("base64"),
  "wrong grant signature": (f) => f.indexEntry.grant.signature = Buffer.alloc(64).toString("base64"),
  "late initial admission": (f) => f.now = new Date("2026-10-21T17:15:00.000Z"),
  "coverage beyond grant": (f) => f.indexEntry.grant.validUntil = "2026-10-20T23:59:59.000Z",
  "revoked authority": (f) => f.authorities["synthetic-key"].revokedAt = now.toISOString(),
};
for (const [name, mutate] of Object.entries(indexMutations)) test(`compact index rejects ${name}`, async () => {
  const f = await indexFixture(); mutate(f);
  assert.equal((await verifyDatedHoroscopeIndex(f)).approved, false);
});
test("only immutable signatures are cached and current authority remains enforced", async (t) => {
  const f = await indexFixture();
  Object.values(f.indexEntry).forEach(freezeEditorialJson);
  const originalVerify = crypto.subtle.verify.bind(crypto.subtle);
  let calls = 0;
  t.mock.method(crypto.subtle, "verify", (...args) => { calls++; return originalVerify(...args); });
  assert.equal((await verifyDatedHoroscopeIndex(f)).approved, true);
  assert.equal(calls, 2);
  assert.equal((await verifyDatedHoroscopeIndex(f)).approved, true);
  assert.equal(calls, 2);
  const historical = { ...f, admittedAt: now.toISOString(), now: new Date("2027-02-01T00:00:00.000Z") };
  assert.equal((await verifyDatedHoroscopeIndex(historical)).approved, true);
  assert.equal(calls, 2);
  f.authorities["synthetic-key"].revokedAt = "2026-10-25T00:00:00.000Z";
  assert.equal((await verifyDatedHoroscopeIndex(historical)).approved, false);
  f.authorities["synthetic-key"].revokedAt = null;
  f.authorities["synthetic-key"].publicKey = Buffer.alloc(32).toString("base64");
  assert.equal((await verifyDatedHoroscopeIndex(f)).approved, false);
});
test("mutable signed indexes are rechecked after mutation", async () => {
  const f = await indexFixture();
  assert.equal((await verifyDatedHoroscopeIndex(f)).approved, true);
  f.indexEntry.index.documents[0].title += " altered after first verification";
  assert.equal((await verifyDatedHoroscopeIndex(f)).approved, false);
});
