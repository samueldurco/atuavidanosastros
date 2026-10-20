// Tests use a temporary workspace and synthetic in-memory key, never custody credentials.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateKeyPairSync } from "node:crypto";
import { digest, byteDigest, GATE } from "../apps/web/src/lib/server/editorial-automation.ts";
import { DATED_POLICY, DATED_METHOD, DATED_REVIEW_MODE, SIGNS } from "../apps/web/src/lib/server/dated-horoscope-automation.ts";
import { signPreparedBatch, validateRequest, repoFile, RELEASE_PATH, REQUEST_PATH } from "./dated-horoscope-authority.mjs";
import { algorithmManifest, calculationAdapter } from "./prepare-dated-horoscope.mjs";
import { corpusDigest, ALGORITHM_VERSION, composeDocumentAndClaims } from "./lib/public-horoscope-compose.mjs";
import { CORPUS_VERSION } from "./lib/public-horoscope-corpus.mjs";
import {
  assertSuccessfulRun, assertMergeCandidate, assertPublicationFiles, REQUIRED_JOBS, INDEX_PATH,
  containsPublishedArticle, currentApiMatches, waitForPublication, withPublicationLock, PUBLICATION_LOCK,
} from "./publish-dated-horoscope.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const now = new Date("2026-10-20T18:00:00.000Z");
const frozenAt = "2026-10-20T17:00:00.000Z";
const copy = (v) => structuredClone(v);
test("publication mutex is shared and releases only its own unchanged lock", async () => {
  const sha = "a".repeat(40);
  let held = null;
  const api = async (endpoint, method = "GET", body) => {
    if (endpoint === "git/refs" && method === "POST") {
      assert.equal(body.ref, `refs/${PUBLICATION_LOCK}`);
      if (held) throw Error("Lock already exists");
      held = body.sha;
      return {};
    }
    if (endpoint === `git/ref/${PUBLICATION_LOCK}` && method === "GET")
      return { object: { sha: held } };
    if (endpoint === `git/refs/${PUBLICATION_LOCK}` && method === "DELETE") {
      held = null;
      return null;
    }
    throw Error("Unexpected lock operation");
  };
  assert.equal(await withPublicationLock(api, sha, async () => {
    await assert.rejects(withPublicationLock(api, sha, async () => {
      throw Error("Second owner must never enter");
    }), /already exists/);
    return "published";
  }), "published");
  assert.equal(held, null);
  await assert.rejects(withPublicationLock(api, sha, async () => {
    throw Error("CI failed");
  }), /CI failed/);
  assert.equal(held, null);
  await assert.rejects(withPublicationLock(api, sha, async () => {
    held = "b".repeat(40);
  }), /lock changed/);
  assert.equal(held, "b".repeat(40));
});
const facts = JSON.parse(fs.readFileSync(path.join(root, "docs/editorial/horoscope-2026-10-20/recurring-v3-daily/facts.json"), "utf8"));
const documents = SIGNS.map((sign) => composeDocumentAndClaims(facts, sign, frozenAt).document);
function renderedArticle(document) {
  const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const metadata = {
    "@type": "Article", headline: document.title, description: document.description,
    mainEntityOfPage: `https://atuavidanosastros.com.br${document.path}`,
    datePublished: document.publishedAt, dateModified: document.modifiedAt,
  };
  return `<script type="application/ld+json">${JSON.stringify(metadata)}</script><article>${document.sections.map((section, index) =>
    `<section class="article-section" aria-labelledby="artigo-secao-${index + 1}"><h2>${escape(section.heading)}</h2>${section.paragraphs.map((paragraph) => `<p><!-- SSR -->${escape(paragraph)}</p>`).join("")}</section>`
  ).join("")}</article>`;
}
const files = [
  { filename: INDEX_PATH, status: "modified" },
  { filename: `apps/web/static/_editorial/dated/${"a".repeat(64)}.json`, status: "added" },
];
test("publisher requires exact successful dispatched CI including every required job", () => {
  const sha = "a".repeat(40);
  const run = { head_sha: sha, event: "workflow_dispatch", path: ".github/workflows/ci.yml", status: "completed", conclusion: "success" };
  const jobs = REQUIRED_JOBS.map((name) => ({ name, conclusion: "success" }));
  assert.doesNotThrow(() => assertSuccessfulRun(run, jobs, sha));
  for (const change of [{ head_sha: "b".repeat(40) }, { event: "pull_request" }, { conclusion: "skipped" }, { path: "other.yml" }])
    assert.throws(() => assertSuccessfulRun({ ...run, ...change }, jobs, sha));
  assert.throws(() => assertSuccessfulRun(run, jobs.slice(1), sha));
  assert.throws(() => assertSuccessfulRun(run, [...jobs, jobs[0]], sha));
  assert.throws(() => assertSuccessfulRun(run, jobs.map((j, i) => i ? j : { ...j, conclusion: "skipped" }), sha));
});
test("publisher permits only an index update and new immutable assets on a clean PR", () => {
  const head = "a".repeat(40), base = "b".repeat(40);
  const pr = { state: "open", draft: false, head: { sha: head }, base: { ref: "main", sha: base }, mergeable: true, mergeable_state: "clean" };
  assert.doesNotThrow(() => assertMergeCandidate(pr, files, head, base));
  for (const change of [{ mergeable_state: "blocked" }, { mergeable: null }, { draft: true }, { head: { sha: base } }])
    assert.throws(() => assertMergeCandidate({ ...pr, ...change }, files, head, base));
  for (const invalid of [
    files.slice(0, 1), [...files, { filename: "package.json", status: "modified" }],
    [files[0], { ...files[1], status: "modified" }], [...files, files[1]],
    [files[0], { filename: "apps/web/static/_editorial/dated/../../injection.json", status: "added" }],
  ]) assert.throws(() => assertPublicationFiles(invalid));
});
test("hosted proof requires the exact Article and all twelve current API responses", async () => {
  const seen = new Set();
  const fetcher = async (url) => {
    seen.add(url);
    const u = new URL(url);
    if (u.pathname.startsWith("/api/")) {
      const sign = u.searchParams.get("sign"), period = u.searchParams.get("period");
      const d = documents.find((d) => d.path.includes(`/${sign}/`));
      return { status: 200, json: async () => ({ sign, period, current: { ...d, sign, period, startDate: facts.startDate, endDateExclusive: facts.endDateExclusive } }) };
    }
    const d = documents.find((d) => d.path === u.pathname);
    return { status: 200, text: async () => renderedArticle(d) };
  };
  assert.deepEqual(await waitForPublication(documents, { fetcher, attempts: 1, now }), { articlePaths: 12, currentApiChecks: 12 });
  assert.equal(seen.size, 24);
  assert.equal(containsPublishedArticle("<h1>Same title</h1>", documents[0]), false);
  assert.equal(currentApiMatches({ sign: "aries", period: "daily", current: null }, documents[0], "aries", "daily", now), false);
  assert.equal(currentApiMatches({ sign: "aries", period: "daily", current: null }, undefined, "aries", "daily", now), true);
  await assert.rejects(waitForPublication(documents, { fetcher: async () => ({ status: 404 }), attempts: 1, now }), /12 documents and 12 current API queries/);
});
test("hosted Article proof rejects stale metadata, omitted text and extra or reordered paragraphs", () => {
  const expected = copy(documents[0]);
  expected.sections[0].paragraphs[0] += ` A & B: "clareza", 'escuta' e <limites>.`;
  assert.equal(containsPublishedArticle(renderedArticle(expected), expected), true);
  for (const mutate of [
    (d) => { d.modifiedAt = "2026-10-19T17:00:00.000Z"; },
    (d) => { d.path = d.path.replace("2026-10-20", "2026-10-19"); },
    (d) => { d.sections[0].paragraphs[0] = "Leitura diferente."; },
    (d) => { d.sections[0].paragraphs.pop(); },
    (d) => { d.sections[0].paragraphs.push("Parágrafo não admitido."); },
    (d) => { d.sections.reverse(); },
  ]) {
    const changed = copy(expected);
    mutate(changed);
    assert.equal(containsPublishedArticle(renderedArticle(changed), expected), false);
  }
  const noVisibleReading = renderedArticle(expected).replace(/<article>[\s\S]*<\/article>/, "");
  assert.equal(containsPublishedArticle(noVisibleReading, expected), false);
});
async function syntheticWorkspace() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "atv-dated-signing-test-"));
  const write = (relative, value) => {
    const target = path.join(directory, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, typeof value === "string" ? value : JSON.stringify(value));
  };
  for (const relative of [
    "scripts/lib/public-horoscope-corpus.mjs", "scripts/lib/public-horoscope-compose.mjs",
    "scripts/prepare-dated-horoscope.mjs", "docs/contracts/public-horoscope-dated-automation.md",
  ]) write(relative, fs.readFileSync(path.join(root, relative), "utf8"));
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const authority = {
    identityType: "automated-service", reviewerId: "synthetic-service", enabled: true, revokedAt: null,
    publicKey: publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("base64"),
    policyVersion: "atvna-editorial-policy-2026-10-06-v1", allowedKinds: ["guide"],
    allowedRisks: ["low-educational-evergreen"],
    validFrom: "2026-10-01T00:00:00.000Z", validUntil: "2027-01-01T00:00:00.000Z",
    provisioningEvidence: { id: "synthetic-only", digest: "b".repeat(64) },
  };
  const authorities = { "synthetic-key": authority };
  write(RELEASE_PATH, { authorities, packages: [] });
  const composition = {
    corpusVersion: CORPUS_VERSION, corpusDigest: corpusDigest(), algorithmVersion: ALGORITHM_VERSION,
    algorithmDigest: await digest(algorithmManifest(directory)), reviewMode: DATED_REVIEW_MODE,
  };
  write("fixture/evidence.txt", "Synthetic evidence only; not a real corpus approval.");
  write("fixture/owner.txt", "Synthetic test scope only.");
  const review = {
    schemaVersion: "atv-horoscope-corpus-review-v1", policyVersion: DATED_POLICY,
    authoringAgent: "synthetic-author", reviewerAgent: "synthetic-independent-reviewer",
    reviewedAt: "2026-10-20T16:00:00.000Z", composition,
    checks: ["scope", "claims", "rights", "identity", "safety", "originality", "tools", "integrity"]
      .map((id) => ({ id, status: "PASS", reason: "Synthetic test.", evidence: ["fixture/evidence.txt#test"] })),
    scores: Object.entries({ intent: 20, value: 20, accuracy: 15, trust: 10, language: 10, journey: 10, metadata: 10, maintenance: 5 })
      .map(([id, points]) => ({ id, points, reason: "Synthetic test.", evidence: ["fixture/evidence.txt"] })),
    decision: "APROVADO_AUTOMATICAMENTE", corrections: [], publicationGate: GATE,
  };
  write("fixture/review.json", review);
  const request = {
    schemaVersion: "atv-dated-horoscope-authority-request-v1", policyVersion: DATED_POLICY, methodVersion: DATED_METHOD,
    keyId: "synthetic-key", reviewerId: "synthetic-service", allowedPeriods: ["daily", "weekly", "monthly"],
    composition, corpusReviewPath: "fixture/review.json", corpusReviewDigest: await digest(review),
    ownerDecisionPath: "fixture/owner.txt", ownerDecisionDigest: await byteDigest(fs.readFileSync(path.join(directory, "fixture/owner.txt"))),
    validFrom: "2026-10-20T16:30:00.000Z", validUntil: "2026-11-30T00:00:00.000Z", coverageFrom: "2026-10-01",
  };
  write(REQUEST_PATH, request);
  const pairs = SIGNS.map((sign) => composeDocumentAndClaims(facts, sign, frozenAt));
  const scope = {
    schemaVersion: "atv-dated-horoscope-preparation-v1", policyVersion: DATED_POLICY, methodVersion: DATED_METHOD,
    keyId: request.keyId, reviewerId: request.reviewerId, period: facts.period,
    startDate: facts.startDate, endDateExclusive: facts.endDateExclusive, frozenAt,
    factsDigest: await digest(facts), composition,
    documentDigests: Object.fromEntries(await Promise.all(pairs.map(async ({ document }) => [document.id, await digest(document)]))),
    claimsDigests: Object.fromEntries(await Promise.all(pairs.map(async ({ document, claims }) => [document.id, await digest(claims)]))),
  };
  write("fixture/prepared/scope.json", scope);
  write("fixture/prepared/facts.json", facts);
  for (const { document, claims } of pairs) {
    write(`fixture/prepared/${document.id}.document.json`, document);
    write(`fixture/prepared/${document.id}.claims.json`, claims);
  }
  const index = {
    schema: "atv-dated-horoscope-batch-v1", mode: "bootstrap",
    packages: [{ directory: "fixture/prepared", period: facts.period, startDate: facts.startDate, endDateExclusive: facts.endDateExclusive, scopeDigest: await digest(scope) }],
  };
  return { root: directory, index, request, privateKey, now, authorities, write };
}
test("authority signer reproduces real calculated facts and rejects changed authority/content", async () => {
  const f = await syntheticWorkspace();
  try {
    const adapter = await calculationAdapter(root);
    const result = await signPreparedBatch({ ...f, adapter });
    assert.equal(result.packages.length, 12);
    assert.equal(result.archiveIndexes.length, 1);
    assert.equal(result.archiveIndexes[0].index.documents.length, 12);
    assert.equal(result.packages[0].dated.grant.validUntil, f.request.validUntil);
    const wrong = copy(f.request); wrong.composition.algorithmDigest = "f".repeat(64);
    await assert.rejects(validateRequest(f.root, wrong, f.authorities, now), /invalid/);
    await assert.rejects(signPreparedBatch({ ...f, adapter, privateKey: generateKeyPairSync("ed25519").privateKey }), /does not match/);
    await assert.rejects(signPreparedBatch({ ...f, adapter: { ...adapter, calculatePublicHoroscope: async () => ({ ...facts, rows: [] }) } }), /calculation replay differs/);
    f.write(`fixture/prepared/${documents[0].id}.document.json`, { ...documents[0], title: "Tampered" });
    await assert.rejects(signPreparedBatch({ ...f, adapter }));
    assert.throws(() => repoFile(f.root, "../outside"), /safe repository-relative/);
    assert.throws(() => repoFile(f.root, "fixture\\evidence.txt"), /safe repository-relative/);
  } finally {
    if (!path.basename(f.root).startsWith("atv-dated-signing-test-") || path.dirname(f.root) !== fs.realpathSync(os.tmpdir()))
      throw Error("Unexpected temporary test cleanup target");
    fs.rmSync(f.root, { recursive: true });
  }
});
