// The executable entry point accepts only the existing external signing environment.
// Exported helpers allow synthetic-key tests; no real private key is written or printed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPrivateKey, createPublicKey, sign } from "node:crypto";
import {
  digest, byteDigest, canonicalJson, attestationPayload, verifyAutomatedApproval,
} from "../apps/web/src/lib/server/editorial-automation.ts";
import {
  assessHoroscopeCorpusReview, DATED_POLICY, DATED_PROTOCOL, DATED_METHOD,
  DATED_REVIEW_MODE, DATED_RISK, datedHoroscopeIndexDocument, verifyDatedHoroscopeIndex,
} from "../apps/web/src/lib/server/dated-horoscope-automation.ts";
import { algorithmManifest, calculationAdapter } from "./prepare-dated-horoscope.mjs";
import { corpusDigest, assertRuntimeComposition } from "./lib/public-horoscope-compose.mjs";

export const RELEASE_PATH = "apps/web/src/lib/server/editorial-release/registry.json";
export const FACTS_PATH = "apps/web/src/lib/server/editorial-release/horoscope-facts.json";
export const REQUEST_PATH = "docs/editorial/horoscope-2026-10-20/authority-request.json";
const same = (a, b) => canonicalJson(a) === canonicalJson(b);
// Caelus records the execution clock separately from the astronomical instant.
// Preserve that audit field in signed bytes; only replay equivalence excludes it.
export function replayComparableFacts(facts) {
  const { calculatedAt, ...provenance } = facts.provenance;
  if (typeof calculatedAt !== "string" || !Number.isFinite(Date.parse(calculatedAt)) ||
      new Date(calculatedAt).toISOString() !== calculatedAt)
    throw Error("Invalid calculation execution timestamp");
  return { ...facts, provenance };
}
const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
export function repoFile(root, relative) {
  if (typeof relative !== "string" || !relative || relative.includes("\\") ||
      relative.split("/").some((part) => !part || part === "." || part === "..") ||
      path.isAbsolute(relative)) throw Error("A safe repository-relative path is required");
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) throw Error("Path escapes repository");
  const real = fs.realpathSync(resolved);
  if (!real.startsWith(fs.realpathSync(root) + path.sep)) throw Error("Symlink escapes repository");
  return real;
}
export function signPayload(value, privateKey) {
  const { signature: ignored, ...payload } = value;
  return { ...payload, signature: sign(null, Buffer.from(attestationPayload(payload)), privateKey).toString("base64") };
}
export async function validateRequest(root, request, authorities, now = new Date()) {
  const review = json(repoFile(root, request.corpusReviewPath));
  const assessed = assessHoroscopeCorpusReview(review);
  const authority = authorities[request.keyId];
  if (!assessed || request.schemaVersion !== "atv-dated-horoscope-authority-request-v1" ||
      request.policyVersion !== DATED_POLICY || request.methodVersion !== DATED_METHOD ||
      !authority?.enabled || authority.revokedAt || authority.identityType !== "automated-service" ||
      request.reviewerId !== authority.reviewerId ||
      !same(request.allowedPeriods, ["daily", "weekly", "monthly"]) ||
      !/^[a-f0-9]{64}$/.test(request.ownerDecisionDigest) ||
      !same(review.composition, request.composition) ||
      request.corpusReviewDigest !== await digest(review) ||
      request.composition.corpusDigest !== corpusDigest() ||
      request.composition.algorithmDigest !== await digest(algorithmManifest(root)) ||
      Date.parse(review.reviewedAt) > now.getTime() ||
      Date.parse(request.validFrom) < Date.parse(authority.validFrom) ||
      Date.parse(request.validUntil) > Date.parse(authority.validUntil) ||
      !(Date.parse(request.validFrom) <= now.getTime() && now.getTime() < Date.parse(request.validUntil)) ||
      !/^\d{4}-\d\d-\d\d$/.test(request.coverageFrom))
    throw Error("Finite reviewed authority request is invalid");
  const ownerBytes = fs.readFileSync(repoFile(root, request.ownerDecisionPath));
  if (await byteDigest(ownerBytes) !== request.ownerDecisionDigest) throw Error("Owner decision bytes changed");
  const refs = new Set([
    request.corpusReviewPath, request.ownerDecisionPath, REQUEST_PATH,
    "scripts/lib/public-horoscope-corpus.mjs", "scripts/lib/public-horoscope-compose.mjs",
    "scripts/prepare-dated-horoscope.mjs", "docs/contracts/public-horoscope-dated-automation.md",
    ...review.checks.flatMap((r) => r.evidence.map((r) => r.split("#")[0])),
    ...review.scores.flatMap((r) => r.evidence.map((r) => r.split("#")[0])),
  ]);
  const evidenceFiles = new Map([...refs].sort().map((relative) =>
    [relative, new Uint8Array(fs.readFileSync(repoFile(root, relative)))]));
  return { review, authority, evidenceFiles };
}
export async function signPreparedBatch({
  root, index, request, privateKey, now = new Date(), adapter,
}) {
  const registry = json(repoFile(root, RELEASE_PATH));
  const { review, authority, evidenceFiles } = await validateRequest(root, request, registry.authorities, now);
  if (createPublicKey(privateKey).export({ type: "spki", format: "der" }).subarray(-32).toString("base64") !== authority.publicKey)
    throw Error("Custodied key does not match the existing audited authority");
  if (index.schema !== "atv-dated-horoscope-batch-v1" || !["bootstrap", "next"].includes(index.mode) ||
      !Array.isArray(index.packages) || index.packages.length < 1 || index.packages.length > 3)
    throw Error("A finite prepared batch is required");
  const grant = signPayload({
    protocol: "atv-dated-horoscope-grant-v1", keyId: request.keyId, reviewerId: request.reviewerId,
    policyVersion: DATED_POLICY, methodVersion: DATED_METHOD, reviewMode: DATED_REVIEW_MODE,
    composition: request.composition, ownerDecisionDigest: request.ownerDecisionDigest,
    corpusReviewDigest: request.corpusReviewDigest, allowedPeriods: request.allowedPeriods,
    validFrom: request.validFrom, validUntil: request.validUntil, coverageFrom: request.coverageFrom,
  }, privateKey);
  const engine = adapter ?? await calculationAdapter(root);
  const packages = [];
  const snapshots = [];
  const archiveIndexes = [];
  const files = await Promise.all([...evidenceFiles].map(async ([p, bytes]) => ({ path: p, sha256: await byteDigest(bytes) })));
  for (const prepared of index.packages) {
    const scope = json(repoFile(root, `${prepared.directory}/scope.json`));
    const facts = json(repoFile(root, `${prepared.directory}/facts.json`));
    if (prepared.scopeDigest !== await digest(scope) || !same(scope.composition, request.composition) ||
        scope.period !== prepared.period || scope.startDate !== prepared.startDate ||
        scope.endDateExclusive !== prepared.endDateExclusive) throw Error("Prepared index binding changed");
    await engine.assertPublicHoroscopeSnapshot(facts);
    const reproduced = await engine.calculatePublicHoroscope(facts.startDate, facts.period, AbortSignal.timeout(120000));
    if (!same(replayComparableFacts(facts), replayComparableFacts(reproduced)))
      throw Error("Full astronomical calculation replay differs");
    snapshots.push(facts);
    const documents = [];
    for (const id of Object.keys(scope.documentDigests)) {
      const document = json(repoFile(root, `${prepared.directory}/${id}.document.json`));
      const claims = json(repoFile(root, `${prepared.directory}/${id}.claims.json`));
      assertRuntimeComposition({ document, claims, facts, scope });
      const runtimeReport = {
        schemaVersion: "atv-dated-horoscope-runtime-v1", documentId: id,
        documentDigest: await digest(document), factsDigest: await digest(facts),
        claimsDigest: await digest(claims), scopeDigest: await digest(scope),
        composition: request.composition, verifiedAt: now.toISOString(),
        checks: Object.fromEntries(["facts", "claims", "composition", "coverage", "disclosure", "differentiation"].map((name) => [name, "PASS"])),
        decision: "PASS",
      };
      const evidenceManifest = {
        schemaVersion: "atv-editorial-evidence-manifest-v1", documentId: id,
        revision: document.revision, documentDigest: await digest(document), files,
      };
      const expiresAt = new Date(Math.min(now.getTime() + 86400000, Date.parse(grant.validUntil))).toISOString();
      const attestation = signPayload({
        protocol: DATED_PROTOCOL, keyId: grant.keyId, reviewerId: grant.reviewerId,
        policyVersion: DATED_POLICY, risk: DATED_RISK, reviewMode: DATED_REVIEW_MODE,
        documentId: id, revision: document.revision, digest: await digest(document),
        evidenceManifestDigest: await digest(evidenceManifest), reportDigest: await digest(runtimeReport),
        scopeDigest: await digest(scope), claimsDigest: await digest(claims), factsDigest: await digest(facts),
        corpusReviewDigest: await digest(review), runtimeReportDigest: await digest(runtimeReport),
        grantDigest: await digest(grant), decision: "APROVADO_AUTOMATICAMENTE",
        approvedAt: now.toISOString(), expiresAt,
      }, privateKey);
      const entry = {
        document, report: null, evidenceManifest, attestation,
        dated: { scope, claims, facts, corpusReview: review, runtimeReport, grant },
      };
      const checked = await verifyAutomatedApproval({
        ...entry, evidenceFiles, authorities: registry.authorities, now,
      });
      if (!checked.approved) throw Error(`Signed package rejected: ${id}: ${checked.reason}`);
      packages.push(entry);
      documents.push(datedHoroscopeIndexDocument(document));
    }
    const indexEntry = { scope, grant, index: signPayload({
      protocol: "atv-dated-horoscope-index-v1", keyId: grant.keyId, reviewerId: grant.reviewerId,
      scopeDigest: await digest(scope), grantDigest: await digest(grant),
      signedAt: now.toISOString(), documents, documentDigests: scope.documentDigests,
    }, privateKey) };
    const checkedIndex = await verifyDatedHoroscopeIndex({ indexEntry, authorities: registry.authorities, now });
    if (!checkedIndex.approved) throw Error(`Signed archive index rejected: ${checkedIndex.reason}`);
    archiveIndexes.push(indexEntry);
  }
  return {
    schemaVersion: "atv-dated-horoscope-signed-batch-v1", preparedIndexDigest: await digest(index),
    signedAt: now.toISOString(), packages, snapshots, archiveIndexes,
    evidenceByDigest: Object.fromEntries(await Promise.all([...evidenceFiles].map(async ([, bytes]) =>
      [await byteDigest(bytes), new TextDecoder().decode(bytes)]))),
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.env.GITHUB_ACTIONS !== "true" ||
      process.env.GITHUB_REPOSITORY !== "samueldurco/atuavidanosastros" ||
      process.env.GITHUB_REF !== "refs/heads/main" ||
      !["schedule", "workflow_dispatch"].includes(process.env.GITHUB_EVENT_NAME) ||
      !process.env.ATVNA_EDITORIAL_SIGNING_KEY) throw Error("Trusted external signing runner required");
  const root = process.cwd();
  const result = await signPreparedBatch({
    root, index: json(repoFile(root, process.argv[2])),
    request: json(repoFile(root, REQUEST_PATH)),
    privateKey: createPrivateKey(process.env.ATVNA_EDITORIAL_SIGNING_KEY),
  });
  const output = path.resolve(root, "output/dated-horoscope-signed.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ operation: "sign", documents: result.packages.length, path: "output/dated-horoscope-signed.json" }));
}
