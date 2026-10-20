import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  setupProductDatabase,
  owner,
  other,
  file,
} from "./helpers/product-database.mjs";
import { asRole, readyArtifactFixture } from "./helpers/artifact-fixture.mjs";
import { persistRenderedProductArtifact } from "../apps/worker/src/product-artifacts.ts";

test("V4 renderers preserve historical bytes, access gates and reversible new writes", async (t) => {
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
    rendererVersion: "atv-pdf-export/1.4.0",
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
      "supabase/migrations/20261005150000_language_renderer_versions.sql",
    ),
  );
  await db.exec(
    await file("supabase/migrations/20261009090221_visual_v4_pdf_renderer.sql"),
  );
  await assert.rejects(
    () => persistRenderedProductArtifact(rpc, input),
    /artifact_unavailable/,
  );
  await db.exec("update product_artifact_policy set enabled=true");
  const currentWebInput = {
    ...input,
    format: "web",
    rendererVersion: "atv-web-export/1.4.0",
    bytes: new TextEncoder().encode("<html>Version 1.4.0</html>"),
  };
  await assert.rejects(
    () => rpc("persist_product_artifact", {
      p_run_id: reading.id,
      p_owner: owner,
      p_revision: reading.revision,
      p_review_digest: reading.reviewDigest,
      p_format: "web",
      p_section: -1,
      p_renderer: currentWebInput.rendererVersion,
      p_body_base64: Buffer.from(currentWebInput.bytes).toString("base64"),
      p_sha256: createHash("sha256").update(currentWebInput.bytes).digest("hex"),
    }, new AbortController().signal),
    /artifact_invalid/,
  );
  await assert.rejects(
    () => persistRenderedProductArtifact(rpc, currentWebInput),
    /artifact_unavailable/,
  );
  await db.exec(
    await file("supabase/migrations/20261015125547_career_web_export_1_4.sql"),
  );
  const saved = [];
  for (const version of ["1.0.0", "1.1.0", "1.2.0", "1.3.0", "1.4.0"]) {
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
        rendererVersion: "atv-pdf-export/1.5.0",
      }),
    /artifact_invalid/,
  );
  const savedCards = [];
  for (const version of ["1.0.0", "1.1.0", "1.2.0"]) {
    const candidate = {
      ...input,
      format: "card",
      section: 0,
      rendererVersion: `atv-reading-card/${version}`,
      bytes: new TextEncoder().encode(`<svg>Version ${version}</svg>`),
    };
    const manifest = await persistRenderedProductArtifact(rpc, candidate);
    const recovered = await read(manifest.id);
    assert.equal(recovered.rendererVersion, candidate.rendererVersion);
    assert.deepEqual(
      Buffer.from(recovered.bodyBase64, "base64"),
      Buffer.from(candidate.bytes),
    );
    savedCards.push(manifest);
  }
  const svgReading = await readyArtifactFixture(db, "birth-chart", owner);
  // Local transport geometry only; this fixture does not approve an engine or editorial release.
  const svgCalculation = {
    version: "atv-natal-product-calculation/1.0.0",
    kind: "natal",
    status: "experimental",
    data: {
      productId: "birth-chart",
      positions: [
        "sun",
        "moon",
        "mercury",
        "venus",
        "mars",
        "jupiter",
        "saturn",
        "uranus",
        "neptune",
        "pluto",
      ].map((body, i) => ({ body, longitude: i * 35 })),
      angles: { ascendant: 21, midheaven: 291 },
      houses: {
        system: "placidus",
        status: "ok",
        cusps: Array.from({ length: 12 }, (_, i) => (i * 30 + 21) % 360),
      },
      provenance: {
        zodiac: "tropical",
        referenceFrame: "geocentric-apparent-ecliptic-of-date",
      },
    },
  };
  await db.query("update product_runs set calculation=$1 where id=$2", [
    svgCalculation,
    svgReading.id,
  ]);
  const svgInput = { ...input, reading: svgReading, format: "svg" };
  const currentSvgInput = {
    ...svgInput,
    rendererVersion: "atv-svg-export/1.3.0",
    bytes: new TextEncoder().encode("<svg>Version 1.3.0</svg>"),
  };
  const svgArgs = {
    p_run_id: svgReading.id,
    p_owner: owner,
    p_revision: svgReading.revision,
    p_review_digest: svgReading.reviewDigest,
    p_format: "svg",
    p_section: -1,
    p_renderer: currentSvgInput.rendererVersion,
    p_body_base64: Buffer.from(currentSvgInput.bytes).toString("base64"),
    p_sha256: createHash("sha256").update(currentSvgInput.bytes).digest("hex"),
  };
  const writeSvg = (overrides = {}) =>
    rpc("persist_product_artifact", { ...svgArgs, ...overrides }, new AbortController().signal);
  const functionDefinition = () =>
    db.query("select pg_get_functiondef('public.persist_product_artifact(uuid,uuid,integer,text,text,integer,text,text,text)'::regprocedure) as definition")
      .then((r) => r.rows[0].definition.replaceAll("\r\n", "\n"));
  const priorDefinition = await functionDefinition();
  await assert.rejects(() => writeSvg(), /artifact_invalid/);
  await db.exec(
    await file("supabase/migrations/20261020112347_mandala_svg_renderer_1_3.sql"),
  );
  // Only the SVG allowlist changes; every existing gate is identical after normalizing line endings.
  assert.equal(
    await functionDefinition(),
    priorDefinition.replace(
      "'atv-svg-export/1.1.0','atv-svg-export/1.2.0'",
      "'atv-svg-export/1.1.0','atv-svg-export/1.2.0','atv-svg-export/1.3.0'",
    ),
  );
  for (const role of ["anon", "authenticated", "service_role"]) {
    const result = await db.query(
      "select has_function_privilege($1, 'public.persist_product_artifact(uuid,uuid,integer,text,text,integer,text,text,text)', 'EXECUTE') as allowed",
      [role],
    );
    assert.equal(result.rows[0].allowed, role === "service_role");
  }
  for (const overrides of [
    { p_owner: other },
    { p_revision: svgReading.revision - 1 },
    { p_review_digest: "c".repeat(64) },
  ]) await assert.rejects(() => writeSvg(overrides), /artifact_unavailable/);
  for (const overrides of [
    { p_renderer: "atv-svg-export/1.4.0" },
    { p_section: 0 },
    { p_sha256: "0".repeat(64) },
    { p_body_base64: "invalid!" },
    { p_body_base64: Buffer.alloc(2_000_001).toString("base64") },
  ]) await assert.rejects(() => writeSvg(overrides), /artifact_invalid/);
  await db.exec("update product_artifact_policy set enabled=false");
  await assert.rejects(() => writeSvg(), /artifact_unavailable/);
  await db.exec("update product_artifact_policy set enabled=true");
  await db.query("update product_runs set calculation=$1 where id=$2", [{}, svgReading.id]);
  await assert.rejects(() => writeSvg(), /artifact_invalid/);
  await db.query("update product_runs set calculation=$1 where id=$2", [svgCalculation, svgReading.id]);
  const readSvg = (id) =>
    asRole(db, "authenticated", owner, () =>
      db.query("select read_product_artifact($1,$2) as data", [
        svgReading.id,
        id,
      ]),
    ).then((r) => r.rows[0].data);
  const savedSvg = [];
  for (const version of ["1.0.0", "1.1.0", "1.2.0", "1.3.0"]) {
    const candidate = {
      ...svgInput,
      rendererVersion: `atv-svg-export/${version}`,
      bytes: new TextEncoder().encode(`<svg>Version ${version}</svg>`),
    };
    const manifest = await persistRenderedProductArtifact(rpc, candidate);
    assert.deepEqual(
      await persistRenderedProductArtifact(rpc, candidate),
      manifest,
    );
    const recovered = await readSvg(manifest.id);
    assert.equal(recovered.rendererVersion, candidate.rendererVersion);
    assert.deepEqual(
      Buffer.from(recovered.bodyBase64, "base64"),
      Buffer.from(candidate.bytes),
    );
    savedSvg.push(manifest);
  }
  await db.exec(
    await file("supabase/forward-fixes/disable_mandala_svg_renderer_1_3.sql"),
  );
  assert.equal(await functionDefinition(), priorDefinition);
  await assert.rejects(() => writeSvg(), /artifact_invalid/);
  for (const svg of savedSvg)
    assert.equal((await readSvg(svg.id)).sha256, svg.sha256);
  assert.deepEqual(
    await persistRenderedProductArtifact(rpc, {
      ...currentSvgInput,
      rendererVersion: "atv-svg-export/1.2.0",
      bytes: new TextEncoder().encode("<svg>Version 1.2.0</svg>"),
    }),
    savedSvg[2],
  );
  await db.exec(
    await file("supabase/migrations/20261020112347_mandala_svg_renderer_1_3.sql"),
  );
  assert.deepEqual(await persistRenderedProductArtifact(rpc, currentSvgInput), savedSvg[3]);
  await assert.rejects(
    () => writeSvg({
      p_body_base64: Buffer.from("<svg>changed</svg>").toString("base64"),
      p_sha256: createHash("sha256").update("<svg>changed</svg>").digest("hex"),
    }),
    /artifact_conflict/,
  );
  const savedWeb = [];
  for (const version of ["1.0.0", "1.1.0", "1.2.0", "1.3.0", "1.4.0"]) {
    const candidate = {
      ...input,
      format: "web",
      rendererVersion: `atv-web-export/${version}`,
      bytes: new TextEncoder().encode(`<html>Version ${version}</html>`),
    };
    const manifest = await persistRenderedProductArtifact(rpc, candidate);
    const recovered = await read(manifest.id);
    assert.equal(recovered.rendererVersion, candidate.rendererVersion);
    assert.deepEqual(
      Buffer.from(recovered.bodyBase64, "base64"),
      Buffer.from(candidate.bytes),
    );
    savedWeb.push(manifest);
  }
  await assert.rejects(
    () =>
      persistRenderedProductArtifact(rpc, {
        ...currentWebInput,
        rendererVersion: "atv-web-export/1.5.0",
      }),
    /artifact_invalid/,
  );
  await db.exec(
    await file("supabase/forward-fixes/disable_visual_v4_pdf_renderer.sql"),
  );
  await assert.rejects(
    () => persistRenderedProductArtifact(rpc, input),
    /artifact_unavailable/,
  );
  assert.equal((await read(saved[4].id)).sha256, saved[4].sha256);
  for (const card of savedCards)
    assert.equal((await read(card.id)).sha256, card.sha256);
  for (const svg of savedSvg)
    assert.equal((await readSvg(svg.id)).sha256, svg.sha256);
  for (const web of savedWeb)
    assert.equal((await read(web.id)).sha256, web.sha256);
  for (const candidate of [
    {
      ...input,
      format: "card",
      section: 0,
      rendererVersion: "atv-reading-card/1.2.0",
      bytes: new TextEncoder().encode("<svg>V4</svg>"),
    },
    {
      ...input,
      format: "web",
      rendererVersion: "atv-web-export/1.4.0",
      bytes: new TextEncoder().encode("<html>V4</html>"),
    },
    {
      ...svgInput,
      rendererVersion: "atv-svg-export/1.2.0",
      bytes: new TextEncoder().encode("<svg>V4</svg>"),
    },
  ])
    await assert.rejects(
      () => persistRenderedProductArtifact(rpc, candidate),
      /artifact_unavailable/,
    );
  await db.exec(
    await file("supabase/migrations/20261009090221_visual_v4_pdf_renderer.sql"),
  );
  await db.exec(
    await file("supabase/migrations/20261015125547_career_web_export_1_4.sql"),
  );
  assert.deepEqual(await persistRenderedProductArtifact(rpc, input), saved[4]);
  assert.deepEqual(
    await persistRenderedProductArtifact(rpc, {
      ...svgInput,
      rendererVersion: "atv-svg-export/1.2.0",
      bytes: new TextEncoder().encode("<svg>Version 1.2.0</svg>"),
    }),
    savedSvg[2],
  );
  await db.exec("update product_artifact_policy set enabled=false");
  assert.equal(await read(saved[4].id), null);
});
