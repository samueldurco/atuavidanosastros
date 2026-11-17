import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { digest } from "../apps/web/src/lib/server/editorial-automation.ts";
import { verifyDatedHoroscopeIndex } from "../apps/web/src/lib/server/dated-horoscope-automation.ts";
import { RELEASE_PATH } from "./dated-horoscope-authority.mjs";
import { admitBatch } from "./admit-dated-horoscope.mjs";

const [batchPath, destination] = process.argv.slice(2);
if (!batchPath || !destination || !process.env.GITHUB_RUN_ID)
  throw Error("A signed batch, content checkout and workflow run are required");
const { editions } = await admitBatch({
  root: process.cwd(),
  batch: JSON.parse(readFileSync(batchPath, "utf8")),
  writeArchive: false,
  runnerEvidence: {
    stage: "live-horoscope-cryptographic-admission",
    repository: process.env.GITHUB_REPOSITORY,
    sourceCommit: process.env.GITHUB_SHA,
    workflowRun: process.env.GITHUB_RUN_ID,
  },
});

const { authorities } = JSON.parse(readFileSync(RELEASE_PATH, "utf8"));
for (const { entry, documents } of editions) {
  const { period, startDate } = entry.scope;
  const output = path.join(destination, period, startDate);
  mkdirSync(output, { recursive: true });
  const indexFile = path.join(output, "index.json");
  let previous;
  try {
    previous = JSON.parse(readFileSync(indexFile, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (previous) {
    // The first admitted edition wins. A repeat run cannot replace its public text.
    if (previous.scope.period !== period || previous.scope.startDate !== startDate ||
        !(await verifyDatedHoroscopeIndex({
          indexEntry: previous, authorities, now: new Date(), admittedAt: previous.admission.acceptedAt,
        })).approved)
      throw Error("Unexpected content in existing interval");
    for (const document of documents) {
      const sign = document.path.split("/")[2];
      const stored = JSON.parse(readFileSync(path.join(output, sign + ".json"), "utf8"));
      if (stored.path !== document.path ||
          await digest(stored) !== previous.index.documentDigests[document.id])
        throw Error("Incomplete or modified existing interval");
    }
    continue;
  }
  for (const document of documents) {
    const sign = document.path.split("/")[2];
    writeFileSync(path.join(output, sign + ".json"), JSON.stringify(document) + "\n", { flag: "wx" });
  }
  writeFileSync(indexFile, JSON.stringify(entry) + "\n", { flag: "wx" });
  console.log("Admitted " + documents.length + " " + period + " readings for " + startDate);
}
