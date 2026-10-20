import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { digest, byteDigest, verifyAutomatedApproval, canonicalJson } from "../apps/web/src/lib/server/editorial-automation.ts";
import { datedHoroscopeIndexDocument, verifyDatedHoroscopeIndex } from "../apps/web/src/lib/server/dated-horoscope-automation.ts";
import { RELEASE_PATH, repoFile, replayComparableFacts } from "./dated-horoscope-authority.mjs";
export const DATED_INDEX_PATH = "apps/web/src/lib/server/editorial-release/dated-index.json";
const webRequire = createRequire(new URL("../apps/web/package.json", import.meta.url));
const prettier = webRequire("prettier");
const indexSourcePath = fileURLToPath(new URL(`../${DATED_INDEX_PATH}`, import.meta.url));
const json = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
function samePublishedEdition(previous, current) {
  if (!previous) return false;
  const comparableDocument = ({ publishedAt, modifiedAt, calculation, ...document }) => {
    const { factsDigest, ...calculated } = calculation;
    return { ...document, calculation: calculated };
  };
  const comparableClaims = ({ factsDigest, ...claims }) => claims;
  return canonicalJson(replayComparableFacts(previous.dated.facts)) ===
      canonicalJson(replayComparableFacts(current.dated.facts)) &&
    canonicalJson(previous.dated.scope.composition) === canonicalJson(current.dated.scope.composition) &&
    canonicalJson(comparableClaims(previous.dated.claims)) === canonicalJson(comparableClaims(current.dated.claims)) &&
    canonicalJson(comparableDocument(previous.document)) === canonicalJson(comparableDocument(current.document));
}
export async function admitBatch({ root, batch, now = new Date(), runnerEvidence }) {
  if (batch.schemaVersion !== "atv-dated-horoscope-signed-batch-v1" ||
      !Array.isArray(batch.packages) || batch.packages.length < 12 ||
      batch.packages.length > 36 || batch.packages.length % 12 !== 0 ||
      new Set(batch.packages.map((p) => p.document.id)).size !== batch.packages.length)
    throw Error("A complete finite signed batch is required");
  const release = json(repoFile(root, RELEASE_PATH));
  const archive = json(repoFile(root, DATED_INDEX_PATH));
  if (archive.schemaVersion !== "atv-dated-horoscope-index-release-v1" ||
      !Array.isArray(archive.entries)) throw Error("Invalid archive index");
  const groups = new Map();
  for (const entry of batch.packages) {
    const scopeHash = await digest(entry.dated.scope);
    groups.set(scopeHash, [...(groups.get(scopeHash) ?? []), entry]);
  }
  if (!Array.isArray(batch.archiveIndexes) || batch.archiveIndexes.length !== groups.size)
    throw Error("Every interval requires a signed compact index");
  for (const [scopeHash, entries] of groups) {
    if (canonicalJson(entries.map((entry) => entry.document.id).sort()) !==
        canonicalJson(Object.keys(entries[0].dated.scope.documentDigests).sort()))
      throw Error("Every signed scope must include all twelve documents");
    const indexes = batch.archiveIndexes.filter((entry) => entry.index.scopeDigest === scopeHash);
    if (indexes.length !== 1) throw Error("Ambiguous signed index");
    const checked = await verifyDatedHoroscopeIndex({ indexEntry: indexes[0], authorities: release.authorities, now });
    if (!checked.approved) throw Error(`Index admission rejected: ${checked.reason}`);
    if (canonicalJson(indexes[0].index.documents) !==
        canonicalJson(entries.map((entry) => datedHoroscopeIndexDocument(entry.document))))
      throw Error("Signed index must match the full reviewed documents");
  }
  const evidenceByDigest = batch.evidenceByDigest;
  const admitted = new Map();
  const gateEvidenceDigest = await digest(runnerEvidence);
  for (const entry of batch.packages) {
    const evidenceFiles = new Map(entry.evidenceManifest.files.map((file) =>
      [file.path, new TextEncoder().encode(evidenceByDigest[file.sha256] ?? "")]));
    const result = await verifyAutomatedApproval({
      ...entry, evidenceFiles, authorities: release.authorities, now,
    });
    if (!result.approved) throw Error(`Admission rejected: ${entry.document.id}: ${result.reason}`);
    if (release.packages.some((p) => p.document.id === entry.document.id))
      throw Error("Existing bundled document requires explicit editorial migration");
    if (!batch.snapshots.some((snapshot) => canonicalJson(snapshot) === canonicalJson(entry.dated.facts)))
      throw Error("Signed facts missing from registry snapshot batch");
    admitted.set(entry.document.id, {
      ...entry, admission: {
        acceptedAt: now.toISOString(), attestationDigest: await digest(entry.attestation),
        gateEvidenceDigest,
      },
    });
  }
  const additions = [], assets = [], effectiveDocuments = [];
  for (const [scopeHash, entries] of groups) {
    const indexEntry = batch.archiveIndexes.find((entry) => entry.index.scopeDigest === scopeHash);
    const prior = archive.entries.filter((entry) => entry.scope.period === indexEntry.scope.period &&
      entry.scope.startDate === indexEntry.scope.startDate);
    // Repeated schedules preserve the exact previously published edition.
    if (prior.length > 1) throw Error("Ambiguous archive interval");
    if (prior.length) {
      const priorEntry = prior[0];
      if (!/^[a-f0-9]{64}$/.test(priorEntry.asset?.sha256) ||
          priorEntry.asset.path !== `/_editorial/dated/${priorEntry.asset.sha256}.json`)
        throw Error("Invalid existing archive asset");
      const bytes = fs.readFileSync(repoFile(root, `apps/web/static${priorEntry.asset.path}`));
      if (await byteDigest(bytes) !== priorEntry.asset.sha256) throw Error("Existing archive is corrupt");
      const previous = JSON.parse(bytes.toString("utf8"));
      if (entries.some((entry) => !samePublishedEdition(previous.packages.find((p) =>
            p.document.id === entry.document.id), entry)))
        throw Error("Existing period requires explicit editorial revision");
      effectiveDocuments.push(...previous.packages.map((entry) => entry.document));
      continue;
    }
    const packages = entries.map((entry) => admitted.get(entry.document.id));
    effectiveDocuments.push(...packages.map((entry) => entry.document));
    const hashes = new Set(packages.flatMap((entry) => entry.evidenceManifest.files.map((file) => file.sha256)));
    const bytes = Buffer.from(JSON.stringify({
      schemaVersion: "atv-dated-horoscope-archive-v1", packages,
      evidenceByDigest: Object.fromEntries([...hashes].map((hash) => [hash, evidenceByDigest[hash]])),
    }) + "\n");
    const sha256 = await byteDigest(bytes);
    const asset = { path: `/_editorial/dated/${sha256}.json`, sha256 };
    assets.push({ asset, bytes });
    additions.push({ ...indexEntry, asset, admission: {
      acceptedAt: now.toISOString(), gateEvidenceDigest,
    } });
  }
  if (!additions.length) return { changed: false, documents: 0, effectiveDocuments };
  // The index is derived metadata; immutable archive bytes and signatures stay untouched.
  const formattedIndex = await prettier.format(JSON.stringify({
    ...archive, entries: [...archive.entries, ...additions],
  }), { ...await prettier.resolveConfig(indexSourcePath), plugins: [], parser: "json" });
  // Immutable static archives and their compact index share one CI-gated commit.
  for (const { asset, bytes } of assets) {
    const destination = path.resolve(root, `apps/web/static${asset.path}`);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.existsSync(destination)) {
      if (!fs.readFileSync(destination).equals(bytes)) throw Error("Immutable asset collision");
    } else fs.writeFileSync(destination, bytes, { flag: "wx" });
  }
  fs.writeFileSync(path.resolve(root, DATED_INDEX_PATH), formattedIndex);
  return { changed: true, documents: additions.length * 12, effectiveDocuments };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await admitBatch({
    root: process.cwd(),
    batch: json(repoFile(process.cwd(), process.argv[2])),
    runnerEvidence: {
      stage: "cryptographic-admission-before-ci-and-release",
      repository: process.env.GITHUB_REPOSITORY ?? "local-synthetic",
      sourceCommit: process.env.GITHUB_SHA ?? null,
      workflowRun: process.env.GITHUB_RUN_ID ?? null,
    },
  });
  console.log(JSON.stringify({ changed: result.changed, documents: result.documents,
    effectiveDocuments: result.effectiveDocuments.length }));
}
