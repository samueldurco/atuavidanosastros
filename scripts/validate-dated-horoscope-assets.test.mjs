import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateDatedHoroscopeAssets } from "./validate-dated-horoscope-assets.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "atv-dated-asset-integrity-"),
  );
  t.after(() => {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith("atv-dated-asset-integrity-"));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const bytes = Buffer.from(
    '{"schemaVersion":"synthetic-test-only","packages":[]}\n',
  );
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const assetPath = `/_editorial/dated/${sha256}.json`;
  const file = path.join(root, assetPath.slice(1));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes);
  const index = {
    schemaVersion: "atv-dated-horoscope-index-release-v1",
    entries: [{ asset: { path: assetPath, sha256 } }],
  };
  const indexFile = path.join(root, "index.json");
  const writeIndex = () => fs.writeFileSync(indexFile, JSON.stringify(index));
  writeIndex();
  return {
    root,
    bytes,
    file,
    index,
    writeIndex,
    options: { indexFile, assetRoot: root },
  };
}

test("accepts exact signed asset bytes without parsing or rewriting them", (t) => {
  const f = fixture(t);
  assert.deepEqual(validateDatedHoroscopeAssets(f.options), {
    assets: 1,
    sha256Verified: true,
  });
  assert.deepEqual(fs.readFileSync(f.file), f.bytes);
});

test("rejects the Windows LF to CRLF transformation even when JSON content is identical", (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.file, f.bytes.toString("utf8").replace(/\n/g, "\r\n"));
  assert.deepEqual(JSON.parse(fs.readFileSync(f.file)), JSON.parse(f.bytes));
  assert.throws(
    () => validateDatedHoroscopeAssets(f.options),
    /bytes differ from the signed index/,
  );
});

test("rejects a missing archive and a directory in place of an archive", (t) => {
  const f = fixture(t);
  fs.unlinkSync(f.file);
  assert.throws(
    () => validateDatedHoroscopeAssets(f.options),
    /Missing dated horoscope asset/,
  );
  fs.mkdirSync(f.file);
  assert.throws(
    () => validateDatedHoroscopeAssets(f.options),
    /Missing dated horoscope asset/,
  );
});

test("rejects invalid paths and a digest that differs from the immutable filename", (t) => {
  const f = fixture(t);
  f.index.entries[0].asset.path = "/_editorial/dated/../../outside.json";
  f.writeIndex();
  assert.throws(
    () => validateDatedHoroscopeAssets(f.options),
    /immutable asset reference/,
  );
  f.index.entries[0].asset.path = `/_editorial/dated/${"0".repeat(64)}.json`;
  f.writeIndex();
  assert.throws(
    () => validateDatedHoroscopeAssets(f.options),
    /immutable asset reference/,
  );
});

test("rejects a malformed index rather than silently skipping asset checks", (t) => {
  const f = fixture(t);
  delete f.index.entries;
  f.writeIndex();
  assert.throws(
    () => validateDatedHoroscopeAssets(f.options),
    /Invalid dated horoscope release index/,
  );
});

test("checks the build destination independently of valid source bytes", (t) => {
  const f = fixture(t);
  const builtRoot = path.join(f.root, "built");
  assert.throws(
    () => validateDatedHoroscopeAssets({ ...f.options, assetRoot: builtRoot }),
    /Missing dated horoscope asset/,
  );
  const destination = path.join(builtRoot, path.relative(f.root, f.file));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, f.bytes);
  assert.equal(
    validateDatedHoroscopeAssets({ ...f.options, assetRoot: builtRoot }).assets,
    1,
  );
  fs.appendFileSync(destination, "\n");
  assert.throws(
    () => validateDatedHoroscopeAssets({ ...f.options, assetRoot: builtRoot }),
    /bytes differ from the signed index/,
  );
});
