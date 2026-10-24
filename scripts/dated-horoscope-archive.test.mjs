// End-to-end archive infrastructure tests. All authority keys and approval evidence are synthetic.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { admitBatch, DATED_INDEX_PATH } from "./admit-dated-horoscope.mjs";
import { RELEASE_PATH } from "./dated-horoscope-authority.mjs";
import {
  byteDigest,
  digest,
} from "../apps/web/src/lib/server/editorial-automation.ts";
import { signedHoroscopeFixture } from "./test-support/dated-horoscope-fixture.mjs";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const bundled = await build({
  entryPoints: [
    path.join(repository, "apps/web/src/lib/server/dated-horoscope-archive.ts"),
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  alias: { $lib: path.join(repository, "apps/web/src/lib") },
});
const {
  archivedEditorialDocument,
  archivedEditorialSummaries,
  createDatedArchiveRead,
} = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].contents).toString("base64")}`
);

const clone = (value) => structuredClone(value);
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value) + "\n");
};
const runnerEvidence = { fixtureOnly: true, stage: "synthetic-admission-test" };
async function workspace(t, { admit = true } = {}) {
  const fixture = await signedHoroscopeFixture();
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "atv-dated-archive-test-"),
  );
  t.after(() => {
    const absolute = path.resolve(root);
    assert.equal(path.dirname(absolute), path.resolve(os.tmpdir()));
    assert.ok(path.basename(absolute).startsWith("atv-dated-archive-test-"));
    fs.rmSync(absolute, { recursive: true, force: true });
  });
  writeJson(path.join(root, RELEASE_PATH), {
    authorities: fixture.authorities,
    packages: [],
  });
  writeJson(path.join(root, DATED_INDEX_PATH), {
    schemaVersion: "atv-dated-horoscope-index-release-v1",
    entries: [],
  });
  if (admit)
    assert.deepEqual(await admitBatch({ ...fixture, root, runnerEvidence }), {
      changed: true,
      documents: 12,
      effectiveDocuments: fixture.batch.packages.map((p) => p.document),
    });
  const release = readJson(path.join(root, DATED_INDEX_PATH));
  const requested = fixture.batch.packages[0].document.path;
  let fetches = 0;
  const fetchAsset = async (assetPath) => {
    fetches++;
    assert.match(assetPath, /^\/_editorial\/dated\/[a-f0-9]{64}\.json$/);
    return new Response(
      fs.readFileSync(path.join(root, "apps/web/static", assetPath)),
    );
  };
  return {
    ...fixture,
    root,
    release,
    requested,
    fetchAsset,
    fetches: () => fetches,
  };
}
async function rewriteAsset(f, mutate) {
  const entry = f.release.entries[0];
  const originalFile = path.join(f.root, "apps/web/static", entry.asset.path);
  const asset = readJson(originalFile);
  await mutate(asset);
  const bytes = Buffer.from(JSON.stringify(asset) + "\n");
  const sha256 = await byteDigest(bytes);
  entry.asset = { path: `/_editorial/dated/${sha256}.json`, sha256 };
  const destination = path.join(f.root, "apps/web/static", entry.asset.path);
  fs.writeFileSync(destination, bytes);
}
const load = (f, now = f.now) =>
  archivedEditorialDocument(
    f.requested,
    f.release,
    f.authorities,
    f.fetchAsset,
    now,
  );

test("complete signed admission creates a compact index and fetches exactly one immutable edition", async (t) => {
  const f = await workspace(t);
  assert.equal(f.release.entries.length, 1);
  assert.equal(
    f.release.entries[0].admission.gateEvidenceDigest,
    await digest(runnerEvidence),
  );
  const summaries = await archivedEditorialSummaries(
    f.release,
    f.authorities,
    f.now,
  );
  assert.equal(summaries.length, 12);
  assert.equal(
    summaries.some((summary) => "sections" in summary),
    false,
  );
  assert.equal(f.fetches(), 0);
  const document = await load(f);
  assert.deepEqual(document, f.batch.packages[0].document);
  assert.equal(f.fetches(), 1);
  assert.equal(
    await archivedEditorialDocument(
      "/horoscopo/inexistente",
      f.release,
      f.authorities,
      f.fetchAsset,
      f.now,
    ),
    undefined,
  );
  assert.equal(f.fetches(), 1);
});

test("request admission shares the index but rereads asset bytes and the next request checks revocation", async (t) => {
  const f = await workspace(t);
  const read = createDatedArchiveRead(f.release, f.authorities, f.now);
  assert.equal((await read.summaries()).length, 12);
  assert.deepEqual(
    await read.document(f.requested, f.fetchAsset),
    f.batch.packages[0].document,
  );
  assert.equal(f.fetches(), 1);
  assert.equal(
    await read.document(f.requested, async (assetPath) => {
      const response = await f.fetchAsset(assetPath);
      return new Response((await response.text()) + " ");
    }),
    undefined,
  );
  assert.equal(f.fetches(), 2);
  for (const authority of Object.values(f.authorities))
    authority.revokedAt = "2026-10-01T00:00:00.000Z";
  const next = createDatedArchiveRead(f.release, f.authorities, f.now);
  assert.deepEqual(await next.summaries(), []);
  assert.equal(await next.document(f.requested, f.fetchAsset), undefined);
  assert.equal(f.fetches(), 2);
});

test("readmission is idempotent and preserves the first archive bytes and admission", async (t) => {
  const f = await workspace(t);
  const before = fs.readFileSync(path.join(f.root, DATED_INDEX_PATH));
  const assetPath = path.join(
    f.root,
    "apps/web/static",
    f.release.entries[0].asset.path,
  );
  const assetBefore = fs.readFileSync(assetPath);
  assert.deepEqual(
    await admitBatch({
      ...f,
      now: new Date("2026-10-20T19:00:00Z"),
      runnerEvidence: { fixtureOnly: true, rerun: true },
    }),
    {
      changed: false,
      documents: 0,
      effectiveDocuments: f.batch.packages.map((p) => p.document),
    },
  );
  assert.deepEqual(
    fs.readFileSync(path.join(f.root, DATED_INDEX_PATH)),
    before,
  );
  assert.deepEqual(fs.readFileSync(assetPath), assetBefore);
});

test("initial admission TTL expires, while an edition admitted in time remains readable historically", async (t) => {
  const fresh = await workspace(t, { admit: false });
  await assert.rejects(
    admitBatch({
      ...fresh,
      now: new Date("2026-10-21T17:15:00Z"),
      runnerEvidence,
    }),
    /admission rejected/i,
  );
  assert.equal(
    readJson(path.join(fresh.root, DATED_INDEX_PATH)).entries.length,
    0,
  );
  const admitted = await workspace(t);
  const historical = new Date("2027-02-01T00:00:00Z");
  assert.equal(
    (
      await archivedEditorialSummaries(
        admitted.release,
        admitted.authorities,
        historical,
      )
    ).length,
    12,
  );
  assert.deepEqual(
    await load(admitted, historical),
    admitted.batch.packages[0].document,
  );
});

test("authority revocation hides both historical metadata and readings without fetching an asset", async (t) => {
  const f = await workspace(t);
  f.authorities["synthetic-key"].revokedAt = "2026-10-25T00:00:00Z";
  const historical = new Date("2026-11-01T00:00:00Z");
  assert.deepEqual(
    await archivedEditorialSummaries(f.release, f.authorities, historical),
    [],
  );
  assert.equal(await load(f, historical), undefined);
  assert.equal(f.fetches(), 0);
});

test("changed asset bytes are rejected even when the JSON remains parseable", async (t) => {
  const f = await workspace(t);
  fs.appendFileSync(
    path.join(f.root, "apps/web/static", f.release.entries[0].asset.path),
    " ",
  );
  assert.equal(await load(f), undefined);
});

const assetMutations = {
  "projection changed despite recomputed asset hash": (asset) =>
    (asset.packages[0].document.title += " adulterado"),
  "body changed despite recomputed asset hash": (asset) =>
    (asset.packages[0].document.sections[0].paragraphs[0] += " adulterado"),
  "attestation signature changed despite recomputed asset hash": (asset) =>
    (asset.packages[0].attestation.signature =
      Buffer.alloc(64).toString("base64")),
  "evidence changed despite recomputed asset hash": (asset) =>
    (asset.evidenceByDigest[Object.keys(asset.evidenceByDigest)[0]] +=
      " adulterado"),
  "admission changed despite recomputed asset hash": (asset) =>
    (asset.packages[0].admission.acceptedAt = "2026-10-20T18:01:00.000Z"),
  "duplicate requested document": (asset) =>
    (asset.packages[1] = clone(asset.packages[0])),
  "incomplete edition": (asset) => asset.packages.pop(),
};
for (const [name, mutate] of Object.entries(assetMutations))
  test(`archive rejects ${name}`, async (t) => {
    const f = await workspace(t);
    await rewriteAsset(f, mutate);
    assert.equal(await load(f), undefined);
  });

const indexMutations = {
  "unsigned projection": (entry) =>
    (entry.index.documents[0].title += " adulterado"),
  "index signature": (entry) =>
    (entry.index.signature = Buffer.alloc(64).toString("base64")),
  "grant signature": (entry) =>
    (entry.grant.signature = Buffer.alloc(64).toString("base64")),
  "asset traversal": (entry) =>
    (entry.asset.path = "/_editorial/dated/../registry.json"),
  "late recorded admission": (entry) =>
    (entry.admission.acceptedAt = "2026-10-21T17:15:00.000Z"),
};
for (const [name, mutate] of Object.entries(indexMutations))
  test(`archive rejects ${name} before reading asset`, async (t) => {
    const f = await workspace(t);
    mutate(f.release.entries[0]);
    assert.deepEqual(
      await archivedEditorialSummaries(f.release, f.authorities, f.now),
      [],
    );
    assert.equal(await load(f), undefined);
    assert.equal(f.fetches(), 0);
  });

test("duplicate archive intervals never produce duplicate navigation or ambiguous readings", async (t) => {
  const f = await workspace(t);
  f.release.entries.push(clone(f.release.entries[0]));
  assert.equal(await load(f), undefined);
  assert.equal(f.fetches(), 0);
  assert.equal(
    (await archivedEditorialSummaries(f.release, f.authorities, f.now)).length,
    0,
  );
  writeJson(path.join(f.root, DATED_INDEX_PATH), f.release);
  await assert.rejects(
    admitBatch({ ...f, runnerEvidence }),
    /Ambiguous archive interval/,
  );
});

test("duplicate, missing and tampered packages cannot mutate the admission index", async (t) => {
  for (const mutation of [
    (batch) => (batch.packages[1] = clone(batch.packages[0])),
    (batch) => batch.packages.pop(),
    (batch) =>
      (batch.packages[0].attestation.signature =
        Buffer.alloc(64).toString("base64")),
    (batch) => batch.archiveIndexes.push(clone(batch.archiveIndexes[0])),
    (batch) => (batch.snapshots = []),
  ]) {
    const f = await workspace(t, { admit: false });
    const before = fs.readFileSync(path.join(f.root, DATED_INDEX_PATH));
    mutation(f.batch);
    await assert.rejects(admitBatch({ ...f, runnerEvidence }));
    assert.deepEqual(
      fs.readFileSync(path.join(f.root, DATED_INDEX_PATH)),
      before,
    );
    assert.equal(
      fs.existsSync(path.join(f.root, "apps/web/static/_editorial/dated")),
      false,
    );
  }
});

test("invalid competing entries cannot leave ambiguous ids or paths in navigation", async (t) => {
  for (const key of ["id", "path"]) {
    const f = await workspace(t);
    const competing = clone(f.release.entries[0]);
    for (const document of competing.index.documents) {
      if (key === "id") document.path += "/invalid";
      else document.id += "-invalid";
    }
    competing.index.signature = Buffer.alloc(64).toString("base64");
    f.release.entries.push(competing);
    assert.equal(
      (await archivedEditorialSummaries(f.release, f.authorities, f.now))
        .length,
      0,
    );
    if (key === "path") {
      assert.equal(await load(f), undefined);
      assert.equal(f.fetches(), 0);
    }
  }
});

test("unavailable or malformed archive assets fail closed", async (t) => {
  const f = await workspace(t);
  for (const fetchAsset of [
    async () => new Response("missing", { status: 404 }),
    async () => {
      throw Error("offline fixture");
    },
    async () => new Response("{malformed"),
  ])
    assert.equal(
      await archivedEditorialDocument(
        f.requested,
        f.release,
        f.authorities,
        fetchAsset,
        f.now,
      ),
      undefined,
    );
});
