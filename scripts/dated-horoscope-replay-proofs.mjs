import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import {
  assertRuntimeComposition,
  contentDigest,
} from "./lib/public-horoscope-compose.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** @param {unknown} value */
const fingerprint = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

// These are receipts for two deterministic functions on exact JSON inputs, never release decisions.
export async function datedReplayProofs() {
  const bundled = await build({
    entryPoints: [
      path.join(root, "apps/worker/src/public-horoscope-calculation.ts"),
    ],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
  });
  const { assertPublicHoroscopeSnapshot } = await import(
    `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString("base64")}`
  );
  const index = JSON.parse(
    readFileSync(
      path.join(
        root,
        "apps/web/src/lib/server/editorial-release/dated-index.json",
      ),
      "utf8",
    ),
  );
  const snapshots = Object.create(null);
  const claimDigests = Object.create(null);
  const compositions = [];
  const archives = Object.create(null);
  for (const entry of index.entries) {
    if (
      !/^[a-f0-9]{64}$/.test(entry.asset.sha256) ||
      entry.asset.path !== `/_editorial/dated/${entry.asset.sha256}.json`
    )
      throw Error("Invalid dated archive path");
    const bytes = readFileSync(
      path.join(root, "apps/web/static", entry.asset.path),
    );
    if (createHash("sha256").update(bytes).digest("hex") !== entry.asset.sha256)
      throw Error("Invalid dated archive bytes");
    /** @typedef {Parameters<typeof assertRuntimeComposition>[0]} Composition */
    /** @type {{schemaVersion: string, packages: { document: Composition['document'], dated: Omit<Composition, 'document'> }[], evidenceByDigest: Record<string, string>}} */
    const asset = JSON.parse(bytes.toString("utf8"));
    /** @param {unknown} value */
    const slice = (value) => {
      const encoded = Buffer.from(JSON.stringify(value));
      const start = bytes.indexOf(encoded);
      return start < 0 ? undefined : [start, start + encoded.length];
    };
    if (
      asset.schemaVersion === "atv-dated-horoscope-archive-v1" &&
      asset.packages.length === 12 &&
      new Set(asset.packages.map((item) => item.document.id)).size === 12
    ) {
      const packages = Object.fromEntries(
        asset.packages.map((item) => [item.document.id, slice(item)]),
      );
      const evidence = Object.fromEntries(
        Object.entries(asset.evidenceByDigest).map(([key, value]) => [
          key,
          slice(value),
        ]),
      );
      if (
        [...Object.values(packages), ...Object.values(evidence)].every(Boolean)
      )
        archives[entry.asset.sha256] = { packages, evidence };
    }
    for (const {
      document,
      dated: { claims, facts, scope },
    } of asset.packages) {
      const snapshotKey = fingerprint(facts);
      if (!Object.hasOwn(snapshots, snapshotKey)) {
        assertPublicHoroscopeSnapshot(facts);
        snapshots[snapshotKey] = contentDigest(facts);
      }
      const inputs = { document, claims, facts, scope };
      assertRuntimeComposition(inputs);
      claimDigests[fingerprint(claims)] = contentDigest(claims);
      compositions.push(fingerprint(inputs));
    }
  }
  return { snapshots, compositions, archives, claimDigests };
}
