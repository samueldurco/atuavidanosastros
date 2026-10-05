import { test } from "node:test";
import assert from "node:assert/strict";
import {
  setupProductDatabase,
  owner,
  file,
} from "./helpers/product-database.mjs";
import { asRole, readyArtifactFixture } from "./helpers/artifact-fixture.mjs";
import { persistRenderedProductArtifact } from "../apps/worker/src/product-artifacts.ts";

test("PDF 1.2 expands writes, retains exact historical bytes and has a reversible write policy", async (t) => {
  const db = await setupProductDatabase();
  t.after(() => db.close());
  await db.exec(
    await file("supabase/migrations/20260915180000_product_artifacts.sql"),
  );
  await db.exec(
    await file(
      "supabase/migrations/20260928234000_product_artifact_renderer_versions.sql",
    ),
  );
  // Synthetic transport fixture for the retained workflow contract; not editorial approval.
  const birth = {
    localDateTime: "2000-01-02T12:00:00",
    utcInstant: "2000-01-02T12:00:00Z",
    timezone: "UTC",
    latitude: 0,
    longitude: 0,
    locationSource: "synthetic-fixture/1",
  };
  const reading = await readyArtifactFixture(db, "synastry", owner, {
    version: "atv-workflow/1.0.0",
    productId: "synastry",
    birth,
    partner: {
      ...birth,
      localDateTime: "2001-07-03T12:00:00",
      utcInstant: "2001-07-03T12:00:00Z",
    },
    consent: {
      storage: true,
      partner: true,
      continuity: false,
      policyVersion: "atv-input-consent/1",
    },
  });
  const rpc = async (name, args, signal) => {
    signal.throwIfAborted();
    return (
      await asRole(db, "service_role", null, () =>
        db.query(
          `select ${name}(${Object.keys(args)
            .map((key, i) => key + " => $" + (i + 1))
            .join(",")}) as data`,
          Object.values(args),
        ),
      )
    ).rows[0].data;
  };
  const input = {
    owner,
    reading,
    format: "pdf",
    section: -1,
    rendererVersion: "atv-pdf-export/1.2.0",
    bytes: new TextEncoder().encode("%PDF-synthetic-version-policy-QA"),
  };
  const read = (id) =>
    asRole(db, "authenticated", owner, () =>
      db.query("select read_product_artifact($1,$2) as data", [reading.id, id]),
    ).then((r) => r.rows[0].data);
  await assert.rejects(
    () => persistRenderedProductArtifact(rpc, input),
    /artifact_unavailable/,
  );
  await db.exec(
    await file(
      "supabase/migrations/20260929020000_product_pdf_renderer_1_2.sql",
    ),
  );
  await assert.rejects(
    () => persistRenderedProductArtifact(rpc, input),
    /artifact_unavailable/,
  );
  await db.exec("update product_artifact_policy set enabled=true");
  const saved = [];
  for (const version of ["1.0.0", "1.1.0", "1.2.0"]) {
    const candidate = {
      ...input,
      rendererVersion: `atv-pdf-export/${version}`,
    };
    const manifest = await persistRenderedProductArtifact(rpc, candidate);
    assert.deepEqual(
      await persistRenderedProductArtifact(rpc, candidate),
      manifest,
    );
    const recovered = await read(manifest.id);
    assert.equal(recovered.rendererVersion, candidate.rendererVersion);
    assert.deepEqual(
      Buffer.from(recovered.bodyBase64, "base64"),
      Buffer.from(input.bytes),
    );
    saved.push(manifest);
  }
  await assert.rejects(
    () =>
      persistRenderedProductArtifact(rpc, {
        ...input,
        rendererVersion: "atv-pdf-export/1.4.0",
      }),
    /artifact_invalid/,
  );
  await db.exec(
    await file(
      "supabase/migrations/20260928234000_product_artifact_renderer_versions.sql",
    ),
  );
  await assert.rejects(
    () => persistRenderedProductArtifact(rpc, input),
    /artifact_unavailable/,
  );
  assert.equal((await read(saved[2].id)).sha256, saved[2].sha256);
  await db.exec(
    await file(
      "supabase/migrations/20260929020000_product_pdf_renderer_1_2.sql",
    ),
  );
  assert.deepEqual(await persistRenderedProductArtifact(rpc, input), saved[2]);
  await db.exec("update product_artifact_policy set enabled=false");
  assert.equal(await read(saved[2].id), null);
});
