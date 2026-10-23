import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const indexPath = "apps/web/src/lib/server/editorial-release/dated-index.json";
const assetPattern = /^\/_editorial\/dated\/([a-f0-9]{64})\.json$/;

// Verify exact bytes. Parsing and reserializing an archive would hide a corrupt checkout.
export function validateDatedHoroscopeAssets({
  indexFile = path.join(repository, indexPath),
  assetRoot = path.join(repository, "apps/web/static"),
} = {}) {
  const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  if (
    index.schemaVersion !== "atv-dated-horoscope-index-release-v1" ||
    !Array.isArray(index.entries)
  ) {
    throw new Error("Invalid dated horoscope release index");
  }
  const assets = new Map();
  for (const entry of index.entries) {
    const match =
      typeof entry.asset?.path === "string" &&
      entry.asset.path.match(assetPattern);
    if (!match || match[1] !== entry.asset.sha256) {
      throw new Error("Invalid dated horoscope immutable asset reference");
    }
    assets.set(entry.asset.path, entry.asset.sha256);
  }
  for (const [assetPath, expectedHash] of assets) {
    const file = path.join(assetRoot, assetPath.slice(1));
    if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
      throw new Error(`Missing dated horoscope asset: ${assetPath}`);
    }
    const actualHash = createHash("sha256")
      .update(fs.readFileSync(file))
      .digest("hex");
    if (actualHash !== expectedHash) {
      throw new Error(
        `Dated horoscope asset bytes differ from the signed index: ${assetPath}`,
      );
    }
  }
  return { assets: assets.size, sha256Verified: true };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const built = process.argv.slice(2);
  if (built.length > 1 || (built.length === 1 && built[0] !== "--built")) {
    throw new Error("Usage: validate-dated-horoscope-assets.mjs [--built]");
  }
  const result = validateDatedHoroscopeAssets({
    assetRoot: path.join(
      repository,
      built.length ? "apps/web/.svelte-kit/cloudflare" : "apps/web/static",
    ),
  });
  console.log(
    JSON.stringify({ ...result, stage: built.length ? "built" : "source" }),
  );
}
