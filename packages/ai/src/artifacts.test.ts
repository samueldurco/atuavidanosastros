import assert from "node:assert/strict";
import test from "node:test";
import { createArtifactManifest, validArtifactManifest, artifactFiles, artifactKeys } from "./artifacts.ts";

const commit = "1".repeat(40);
const blob = (path: string) => Buffer.from(`synthetic source only: ${path}\n`, "utf8");
test("manifest reads each fixed dependency once and is reproducible", () => {
  const paths: string[] = [];
  const manifest = createArtifactManifest(commit, (path) => { paths.push(path); return blob(path); });
  assert.deepEqual(manifest, createArtifactManifest(commit, blob));
  assert.equal(validArtifactManifest(manifest), true);
  assert.equal(paths.length, 8);
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.every(path => path.startsWith("packages/ai/src/")));
  assert.equal(new Set(Object.values(manifest.artifactDigests)).size, 4);
  const otherCommit = createArtifactManifest("2".repeat(40), blob);
  assert.deepEqual(otherCommit.artifactDigests, manifest.artifactDigests);
  assert.notEqual(otherCommit.commit, manifest.commit);
});

for (const path of new Set(Object.values(artifactFiles).flat())) {
  test(`exact bytes of ${path} invalidate all and only dependent groups`, () => {
    const original = createArtifactManifest(commit, blob);
    const changed = createArtifactManifest(commit, (file) =>
      file === `packages/ai/src/${path}` ? Buffer.concat([blob(file), Buffer.from(" changed")]) : blob(file));
    for (const key of artifactKeys)
      assert.equal(changed.artifactDigests[key] !== original.artifactDigests[key], artifactFiles[key].includes(path), key);
  });
}

test("manifest has no line-ending normalization and never accepts missing/oversized blobs", () => {
  const lf = createArtifactManifest(commit, () => Buffer.from("source\n"));
  const crlf = createArtifactManifest(commit, () => Buffer.from("source\r\n"));
  for (const key of artifactKeys) assert.notEqual(lf.artifactDigests[key], crlf.artifactDigests[key]);
  for (const invalid of [new Uint8Array(), new Uint8Array(1048577), "source"])
    assert.throws(() => createArtifactManifest(commit, () => invalid as Uint8Array), /invalid_artifact_blob/);
  assert.throws(() => createArtifactManifest(commit, () => { throw new Error("missing"); }), /missing/);
  assert.throws(() => createArtifactManifest("HEAD", blob), /invalid_artifact_commit/);
});

test("trusted manifest shape rejects omitted/extra digests, malformed hashes and mutable refs", () => {
  const manifest = createArtifactManifest(commit, blob);
  for (const value of [undefined, null, [], {}, { ...manifest, version: "stale" },
    { ...manifest, commit: "main" }, { ...manifest, commit: "A".repeat(40) },
    { ...manifest, artifactDigests: [] }, { ...manifest, extra: true },
    { ...manifest, artifactDigests: { ...manifest.artifactDigests, extra: "a".repeat(64) } }])
    assert.equal(validArtifactManifest(value), false);
  for (const key of artifactKeys) {
    const value: Record<string, unknown> = { ...manifest.artifactDigests }; delete value[key];
    assert.equal(validArtifactManifest({ ...manifest, artifactDigests: value }), false);
    value[key] = "A".repeat(64);
    assert.equal(validArtifactManifest({ ...manifest, artifactDigests: value }), false);
  }
});
