import { createHash } from "node:crypto";

export const ARTIFACT_MANIFEST_VERSION = "atv-lab-artifacts/1.0.0";
export const artifactKeys = ["prompt", "schema", "rubric", "dataset"] as const;
export type ArtifactKey = (typeof artifactKeys)[number];
export type ArtifactDigests = Record<ArtifactKey, string>;
export interface ArtifactManifest {
  version: typeof ARTIFACT_MANIFEST_VERSION;
  /** Immutable Git commit whose blobs were read, never working-tree bytes. */
  commit: string;
  artifactDigests: ArtifactDigests;
}

// Explicit transitive dependencies: changing a constitution, tier or base case must invalidate
// the affected artifact even when its public version string was accidentally left unchanged.
export const artifactFiles: Readonly<Record<ArtifactKey, readonly string[]>> =
  Object.freeze({
    prompt: Object.freeze([
      "constitutions.ts",
      "editorial-style.ts",
      "contracts.ts",
      "prompt.ts",
      "schema.ts",
    ]),
    schema: Object.freeze(["contracts.ts", "schema.ts"]),
    rubric: Object.freeze([
      "contracts.ts",
      "director.ts",
      "editorial-style.ts",
    ]),
    dataset: Object.freeze([
      "contracts.ts",
      "lab/dataset.ts",
      "lab/release-dataset.ts",
    ]),
  });
const hash = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
export function createArtifactManifest(
  commit: string,
  readBlob: (path: string) => Uint8Array,
): ArtifactManifest {
  if (!/^[a-f0-9]{40}$/.test(commit))
    throw new Error("invalid_artifact_commit");
  const files = new Map<string, string>();
  for (const path of [...new Set(Object.values(artifactFiles).flat())].sort()) {
    const bytes = readBlob(`packages/ai/src/${path}`);
    if (
      !(bytes instanceof Uint8Array) ||
      bytes.byteLength < 1 ||
      bytes.byteLength > 1048576
    )
      throw new Error("invalid_artifact_blob");
    files.set(path, hash(bytes));
  }
  const artifactDigests = Object.fromEntries(
    artifactKeys.map((key) => [
      key,
      hash(
        JSON.stringify({
          version: ARTIFACT_MANIFEST_VERSION,
          artifact: key,
          files: artifactFiles[key].map((path) => ({
            path,
            sha256: files.get(path)!,
          })),
        }),
      ),
    ]),
  ) as ArtifactDigests;
  return { version: ARTIFACT_MANIFEST_VERSION, commit, artifactDigests };
}

/** Shape validation only. The release operator must obtain this from trusted repository data,
 * never from candidate/client input. This does not verify an author's identity or signature. */
export function validArtifactManifest(
  value: unknown,
): value is ArtifactManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).length !== 3 ||
    v.version !== ARTIFACT_MANIFEST_VERSION ||
    typeof v.commit !== "string" ||
    !/^[a-f0-9]{40}$/.test(v.commit) ||
    !v.artifactDigests ||
    typeof v.artifactDigests !== "object" ||
    Array.isArray(v.artifactDigests)
  )
    return false;
  const digests = v.artifactDigests as Record<string, unknown>;
  return (
    Object.keys(digests).length === artifactKeys.length &&
    artifactKeys.every(
      (key) =>
        Object.hasOwn(digests, key) &&
        typeof digests[key] === "string" &&
        /^[a-f0-9]{64}$/.test(digests[key]),
    )
  );
}
