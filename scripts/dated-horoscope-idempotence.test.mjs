// These tests sign only ephemeral fixtures; no authority or release is written in the repository.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { admitBatch, DATED_INDEX_PATH } from "./admit-dated-horoscope.mjs";
import { RELEASE_PATH, replayComparableFacts } from "./dated-horoscope-authority.mjs";
import { digest } from "../apps/web/src/lib/server/editorial-automation.ts";
import { datedHoroscopeIndexDocument } from "../apps/web/src/lib/server/dated-horoscope-automation.ts";
import { composeDocumentAndClaims } from "./lib/public-horoscope-compose.mjs";
import { signedHoroscopeFixture } from "./test-support/dated-horoscope-fixture.mjs";

const runnerEvidence = { syntheticOnly: true, stage: "idempotence-test" };
const prettier = createRequire(new URL("../apps/web/package.json", import.meta.url))("prettier");
const write = (root, relative, value) => {
  const destination = path.join(root, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(value) + "\n");
};
async function workspace(t) {
  const fixture = await signedHoroscopeFixture();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "atv-dated-rerun-test-"));
  t.after(() => {
    const absolute = path.resolve(root);
    assert.equal(path.dirname(absolute), path.resolve(os.tmpdir()));
    assert.ok(path.basename(absolute).startsWith("atv-dated-rerun-test-"));
    fs.rmSync(absolute, { recursive: true, force: true });
  });
  write(root, RELEASE_PATH, { authorities: fixture.authorities, packages: [] });
  write(root, DATED_INDEX_PATH, { schemaVersion: "atv-dated-horoscope-index-release-v1", entries: [] });
  await admitBatch({ ...fixture, root, runnerEvidence });
  const indexBytes = fs.readFileSync(path.join(root, DATED_INDEX_PATH));
  const index = JSON.parse(indexBytes);
  const assetPath = path.join(root, "apps/web/static", index.entries[0].asset.path);
  return { ...fixture, root, indexBytes, assetPath, assetBytes: fs.readFileSync(assetPath) };
}
async function resignedBatch(fixture, facts, frozenAt = "2026-10-20T17:05:00.000Z") {
  const batch = structuredClone(fixture.batch);
  const { scope, grant } = batch.archiveIndexes[0];
  const factsDigest = await digest(facts);
  scope.frozenAt = frozenAt;
  scope.factsDigest = factsDigest;
  const generated = batch.packages.map((entry) =>
    composeDocumentAndClaims(facts, entry.dated.claims.sign, frozenAt));
  scope.documentDigests = Object.fromEntries(await Promise.all(generated.map(async ({ document }) =>
    [document.id, await digest(document)])));
  scope.claimsDigests = Object.fromEntries(await Promise.all(generated.map(async ({ document, claims }) =>
    [document.id, await digest(claims)])));
  const scopeDigest = await digest(scope);
  batch.packages = await Promise.all(batch.packages.map(async (entry, index) => {
    const { document, claims } = generated[index];
    const documentDigest = await digest(document), claimsDigest = await digest(claims);
    const runtimeReport = { ...entry.dated.runtimeReport, documentDigest, claimsDigest, factsDigest, scopeDigest };
    const evidenceManifest = { ...entry.evidenceManifest, documentDigest };
    const attestation = await fixture.sign({
      ...entry.attestation, digest: documentDigest, claimsDigest, factsDigest, scopeDigest,
      evidenceManifestDigest: await digest(evidenceManifest),
      runtimeReportDigest: await digest(runtimeReport), reportDigest: await digest(runtimeReport),
    });
    return { ...entry, document, attestation, evidenceManifest,
      dated: { ...entry.dated, claims, facts, scope, runtimeReport } };
  }));
  batch.snapshots = [facts];
  batch.archiveIndexes = [{ scope, grant, index: await fixture.sign({
    ...batch.archiveIndexes[0].index, scopeDigest,
    documentDigests: scope.documentDigests,
    documents: generated.map(({ document }) => datedHoroscopeIndexDocument(document)),
  }) }];
  return batch;
}

test("admission formats the derived index with the web application's lint configuration", async (t) => {
  const fixture = await workspace(t);
  const indexPath = fileURLToPath(new URL(`../${DATED_INDEX_PATH}`, import.meta.url));
  assert.equal(await prettier.check(fixture.indexBytes.toString("utf8"), {
    ...await prettier.resolveConfig(indexPath), plugins: [], parser: "json",
  }), true);
});

test("fresh calculation and freeze clocks retain all originally admitted bytes and documents", async (t) => {
  const fixture = await workspace(t);
  const facts = structuredClone(fixture.batch.snapshots[0]);
  facts.provenance.calculatedAt = "2026-10-20T17:01:00.000Z";
  const batch = await resignedBatch(fixture, facts);
  assert.notEqual(batch.packages[0].document.publishedAt, fixture.batch.packages[0].document.publishedAt);
  assert.notEqual(batch.packages[0].document.calculation.factsDigest, fixture.batch.packages[0].document.calculation.factsDigest);
  const result = await admitBatch({ ...fixture, batch, runnerEvidence });
  assert.equal(result.changed, false);
  assert.equal(result.documents, 0);
  assert.deepEqual(result.effectiveDocuments, fixture.batch.packages.map((entry) => entry.document));
  assert.deepEqual(fs.readFileSync(path.join(fixture.root, DATED_INDEX_PATH)), fixture.indexBytes);
  assert.deepEqual(fs.readFileSync(fixture.assetPath), fixture.assetBytes);
});

test("execution-clock equivalence rejects invalid clocks and retains every other factual field", async () => {
  const { batch } = await signedHoroscopeFixture();
  const original = batch.snapshots[0], comparable = replayComparableFacts(original);
  for (const value of ["yesterday", "2026-10-20", null]) {
    const changed = structuredClone(original);
    changed.provenance.calculatedAt = value;
    assert.throws(() => replayComparableFacts(changed), /execution timestamp/);
  }
  for (const mutate of [
    (facts) => { facts.rows[0][1] += 0.001; },
    (facts) => { facts.startDate = "2026-10-21"; },
    (facts) => { facts.endDateExclusive = "2026-10-22"; },
    (facts) => { facts.provenance.providerVersion += "-changed"; },
  ]) {
    const changed = structuredClone(original);
    mutate(changed);
    assert.notDeepEqual(replayComparableFacts(changed), comparable);
  }
});

test("signed recalculations with changed positions or coverage cannot replace an admitted edition", async (t) => {
  for (const mutate of [
    (facts) => { facts.rows[0][1] += 0.001; },
    (facts) => { facts.endDateExclusive = "2026-10-22"; },
  ]) {
    const fixture = await workspace(t);
    const facts = structuredClone(fixture.batch.snapshots[0]);
    mutate(facts);
    const batch = await resignedBatch(fixture, facts);
    await assert.rejects(admitBatch({ ...fixture, batch, runnerEvidence }));
    assert.deepEqual(fs.readFileSync(path.join(fixture.root, DATED_INDEX_PATH)), fixture.indexBytes);
    assert.deepEqual(fs.readFileSync(fixture.assetPath), fixture.assetBytes);
  }
});
