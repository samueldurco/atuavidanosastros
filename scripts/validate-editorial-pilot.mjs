// Validate the finite private pilot's frozen evidence. This never issues approval or publishes.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve, relative, isAbsolute } from "node:path";
import {
  digest,
  byteDigest,
  assessReport,
  verifyAutomatedApproval,
} from "../apps/web/src/lib/server/editorial-automation.ts";
const base = fileURLToPath(
  new URL("../docs/editorial/pilot-2026-10-06/", import.meta.url),
);
const read = (p) => JSON.parse(readFileSync(p, "utf8"));
const index = read(join(base, "index.json"));
if (
  index.articles.length !== 12 ||
  index.admitted !== 0 ||
  index.published !== 0 ||
  index.authorityProvisioned !== false
)
  throw Error("Unexpected pilot scope/release");
const now = new Date();
const results = [];
for (const item of index.articles) {
  const dir = join(base, item.briefId);
  const document = read(join(dir, "document.json")),
    report = read(join(dir, "report.json")),
    manifest = read(join(dir, "manifest.json"));
  if (
    document.state !== "DRAFT" ||
    document.publishedAt !== null ||
    document.kind !== "guide" ||
    document.author.type !== "Organization" ||
    document.automationDisclosure.humanReview !== false
  )
    throw Error(item.briefId + ": draft/identity invariant");
  if (
    (await digest(document)) !== item.documentDigest ||
    (await digest(report)) !== item.reportDigest ||
    (await digest(manifest)) !== item.manifestDigest
  )
    throw Error(item.briefId + ": index binding");
  if (
    manifest.documentId !== document.id ||
    manifest.revision !== document.revision ||
    manifest.documentDigest !== item.documentDigest
  )
    throw Error(item.briefId + ": manifest binding");
  const files = new Map();
  for (const row of manifest.files) {
    if (
      !/^[A-Za-z0-9_./-]+$/.test(row.path) ||
      row.path.split("/").some((x) => !x || x === "." || x === "..") ||
      files.has(row.path)
    )
      throw Error("Invalid evidence path");
    const target = resolve(dir, row.path),
      local = relative(dir, target);
    if (local.startsWith("..") || isAbsolute(local))
      throw Error("Evidence outside package");
    const content = new Uint8Array(readFileSync(target));
    if ((await byteDigest(content)) !== row.sha256)
      throw Error(item.briefId + ": changed evidence " + row.path);
    files.set(row.path, content);
  }
  for (const row of [...report.checks, ...report.scores])
    for (const ref of row.evidence) {
      const [file, ...fragment] = ref.split("#");
      if (
        !files.has(file) ||
        fragment.length > 1 ||
        (fragment.length === 1 && !fragment[0].trim())
      )
        throw Error(item.briefId + ": missing evidence reference");
    }
  const assessment = await assessReport(document, report, now);
  if (
    !assessment.valid ||
    assessment.decision !== "BLOQUEADO" ||
    assessment.score !== item.score
  )
    throw Error(item.briefId + ": report policy disagreement");
  const eligibility = await verifyAutomatedApproval({
    document,
    report,
    evidenceManifest: manifest,
    evidenceFiles: files,
    attestation: null,
    authorities: {},
    now,
  });
  if (eligibility.approved) throw Error("Private draft became publishable");
  results.push({
    briefId: item.briefId,
    revision: document.revision,
    score: assessment.score,
    decision: assessment.decision,
  });
}
console.log(
  JSON.stringify({
    packages: results.length,
    evidenceBytesVerified: true,
    reportsValid: true,
    approved: 0,
    published: 0,
    results,
  }),
);
