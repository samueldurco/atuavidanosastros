import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildProductLabCorpus,
  corpusCategories,
  corpusDigest,
  corpusProducts,
} from "./helpers/product-lab-corpus.mjs";
import {
  SYNASTRY_CORPUS_VERSION,
  synastryLabCases,
} from "./helpers/synastry-lab-cases.mjs";
import {
  CAPTURE_VERSION,
  productBenchmarkManifest,
  evaluateProductBenchmark,
} from "./helpers/product-benchmark.mjs";
import {
  createProductCalculators,
  productCalculationCoverage,
} from "../apps/worker/src/product-runtime.ts";
import {
  SYNASTRY_EDITORIAL_VERSION,
  SYNASTRY_MAX_INPUT_CHARS,
  SCHEMA_VERSION,
  synastryRoles,
  synastryEvidence,
  synastryBaseLimit,
  synastryConsentLimit,
  synastryScopeLimit,
  validateFacts,
  buildPrompt,
} from "../packages/ai/src/index.ts";

const corpus = await buildProductLabCorpus({ experimentalProduct: "synastry" });
const manifest = productBenchmarkManifest(corpus);
const structuralOutput = (facts) => ({
  schemaVersion: SCHEMA_VERSION,
  capability: facts.capability,
  scope: "partial",
  title: "Fixture estrutural de Sinastria, sem conteúdo homologado",
  claims: synastryRoles.map((role) => ({
    id: role,
    kind: "hypothesis",
    text: `${role}: hipótese sintética usada somente para verificar o transporte destas evidências, sem utilidade editorial demonstrada.`,
    evidence: synastryEvidence(facts, role),
  })),
  relations: [],
  synthesis: [
    {
      claimIds: [...synastryRoles],
      text: "Integração sintética dos blocos para verificar estrutura, sem significado relacional certificado.",
    },
  ],
  reflections: [
    "Que tema de comunicação ou vínculo podemos explorar?",
    "Como respeitar autonomia em uma reparação consentida?",
    "Que acordo reversível de crescimento podemos experimentar?",
  ],
  limits: [synastryBaseLimit, synastryConsentLimit, synastryScopeLimit],
});
const capture = () => ({
  version: CAPTURE_VERSION,
  dataClass: "synthetic",
  corpusVersion: manifest.corpusVersion,
  corpusFingerprint: manifest.corpusFingerprint,
  promptVersion: manifest.promptVersion,
  provider: "synthetic-only",
  model: "synthetic-only",
  samples: manifest.cases.flatMap((item) =>
    [1, 2, 3].map((repetition) => ({
      caseId: item.caseId,
      repetition,
      provider: "synthetic-only",
      model: "synthetic-only",
      executionId: `fixture-${item.caseId}-${repetition}`,
      requestDigest: item.requestDigest,
      promptDigest: item.promptDigest,
      output: structuralOutput(
        corpus.cases.find((row) => row.id === item.caseId).request.facts,
      ),
      latencyMs: null,
      inputTokens: null,
      outputTokens: null,
      costBrl: null,
      costEvidence: null,
    })),
  ),
});
const cli = (args) =>
  spawnSync(process.execPath, args, {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
// Actual calculation timestamps remain in artifacts; they are not geometry or prompt evidence.
const withoutCalculationTimes = (value) =>
  JSON.parse(
    JSON.stringify(value, (key, field) =>
      key === "calculatedAt" ? undefined : field,
    ),
  );

test("experimental synastry has seven explicit scenarios without production registration or approved policy", () => {
  assert.equal(corpus.version, SYNASTRY_CORPUS_VERSION);
  assert.deepEqual(
    corpus.cases.map((item) => item.category),
    corpusCategories,
  );
  assert.deepEqual(
    synastryLabCases.map((item) => item.category),
    corpusCategories,
  );
  assert.equal(corpus.scope, "experimental-synastry-qa-policy-not-approved");
  assert.equal(corpus.geometricDiversity, "single-synthetic-pair");
  assert.equal(corpus.policyApproval, "not-established");
  assert.equal(corpus.dataClass, "synthetic");
  assert.equal(corpus.promotionEligible, false);
  assert.equal(corpus.editorialReview, "not-reviewed");
  assert.ok(corpus.unavailableProducts.includes("synastry"));
  assert.equal(corpus.unavailableProducts.length, 12);
  assert.equal(createProductCalculators().synastry, undefined);
  assert.equal(corpusProducts.includes("synastry"), false);
  assert.equal(
    productCalculationCoverage().find((item) => item.productId === "synastry")
      .calculation,
    "unavailable",
  );
  assert.equal(new Set(corpus.cases.map((item) => item.runId)).size, 7);
});

test("counterfactual reports preserve both synthetic charts and all 100 unknown pairs without factual diversity claims", () => {
  const reference = corpus.cases[0];
  for (const item of corpus.cases) {
    assert.deepEqual(item.input.birth, reference.input.birth);
    assert.deepEqual(item.input.partner, reference.input.partner);
    assert.deepEqual(
      item.calculation.facts.filter((fact) => fact.kind === "calculated"),
      reference.calculation.facts.filter((fact) => fact.kind === "calculated"),
    );
    assert.deepEqual(
      withoutCalculationTimes(item.calculation.data),
      withoutCalculationTimes(reference.calculation.data),
    );
    assert.equal(item.input.consent.continuity, false);
    assert.equal(item.request.tier, "premium");
    assert.equal(item.preparation, "prepared");
    assert.equal(
      item.request.facts.editorialProfile,
      SYNASTRY_EDITORIAL_VERSION,
    );
    assert.ok(validateFacts(item.request.facts));
    assert.equal(item.publication, "blocked");
    assert.equal(item.editorialReview, "not-reviewed");
    const cross = item.request.facts.facts.filter((fact) =>
      fact.id.startsWith("cross-"),
    );
    assert.equal(cross.length, 100);
    assert.ok(
      cross.every((fact) =>
        fact.display.endsWith(
          " Precisão não certificada; estabilidade desconhecida.",
        ),
      ),
    );
    assert.ok(
      item.calculation.facts
        .filter((fact) => fact.id.startsWith("cross-"))
        .every((fact) => fact.source.split(";").length === 4),
    );
    assert.ok(item.criteria[0].length > 60);
    assert.equal(item.factsDigest, corpusDigest(item.request.facts));
    assert.ok(
      buildPrompt(item.request).prompt.length <= SYNASTRY_MAX_INPUT_CHARS,
    );
  }
  const absent = corpus.cases.find((item) => item.category === "incomplete");
  assert.equal(Object.hasOwn(absent.input, "context"), false);
  assert.equal(Object.hasOwn(absent.request, "context"), false);
  assert.equal(absent.request.facts.facts.length, 120);
  const boundary = corpus.cases.find((item) => item.category === "boundary");
  assert.equal(boundary.input.context.length, 1200);
  assert.equal(
    boundary.request.facts.facts.at(-1).display,
    boundary.input.context,
  );
});

test("manifest and 21 structural fixture samples remain unreviewed with unknown operational measurements", () => {
  assert.equal(manifest.cases.length, 7);
  assert.equal(manifest.scope, corpus.scope);
  assert.ok(manifest.unavailableProducts.includes("synastry"));
  const report = evaluateProductBenchmark(capture(), corpus);
  assert.equal(report.summary.expectedSamples, 21);
  assert.equal(report.summary.schemaPasses, 21);
  assert.equal(report.summary.mechanicalPasses, 21);
  assert.equal(report.summary.costUnknown, 21);
  assert.equal(report.summary.tokensUnknown, 21);
  assert.equal(report.summary.unreviewedSamples, 21);
  assert.equal(report.summary.preparedChecksComplete, false);
  assert.equal(report.publication, "blocked");
  assert.equal(report.promotionEligible, false);
  assert.equal(report.provenance, "declared-not-authenticated");
  assert.equal(report.products.length, 1);
});

test("existing local CLIs select synastry explicitly and reject wrong scope or malformed options", () => {
  const exported = cli([
    "scripts/product-lab-corpus.mjs",
    "--experimental-synastry",
  ]);
  assert.equal(exported.status, 0, exported.stderr);
  const exportedCorpus = JSON.parse(exported.stdout);
  assert.deepEqual(productBenchmarkManifest(exportedCorpus), manifest);
  assert.deepEqual(
    exportedCorpus.cases.map((item) => item.request),
    corpus.cases.map((item) => item.request),
  );
  assert.deepEqual(
    exportedCorpus.cases.map((item) =>
      withoutCalculationTimes(item.calculation),
    ),
    corpus.cases.map((item) => withoutCalculationTimes(item.calculation)),
  );
  for (const item of exportedCorpus.cases)
    assert.equal(item.calculationDigest, corpusDigest(item.calculation));
  const listed = cli([
    "scripts/evaluate-product-benchmark.mjs",
    "--experimental-synastry",
    "--manifest",
  ]);
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout), manifest);
  const folder = mkdtempSync(join(tmpdir(), "atv-synastry-lab-"));
  const file = join(folder, "structural-fixture.json");
  try {
    writeFileSync(file, JSON.stringify(capture()));
    const evaluated = cli([
      "scripts/evaluate-product-benchmark.mjs",
      "--experimental-synastry",
      file,
    ]);
    assert.equal(evaluated.status, 1, evaluated.stderr);
    assert.equal(JSON.parse(evaluated.stdout).summary.mechanicalPasses, 21);
    const wrongScope = cli(["scripts/evaluate-product-benchmark.mjs", file]);
    assert.equal(wrongScope.status, 2);
    assert.equal(JSON.parse(wrongScope.stderr).code, "capture_corpus_mismatch");
  } finally {
    unlinkSync(file);
    rmdirSync(folder);
  }
  for (const args of [
    [],
    ["--experimental-synastry"],
    ["--experimental-synastry", "--manifest", "extra"],
  ]) {
    const invalid = cli(["scripts/evaluate-product-benchmark.mjs", ...args]);
    assert.equal(invalid.status, 2);
    assert.equal(JSON.parse(invalid.stderr).code, "usage");
  }
  assert.equal(cli(["scripts/product-lab-corpus.mjs", "--unknown"]).status, 2);
  assert.equal(
    cli(["scripts/product-lab-corpus.mjs", "--experimental-synastry", "extra"])
      .status,
    2,
  );
});

test("invalid experimental product is rejected and fresh builds do not retain prior fixture mutation", async () => {
  await assert.rejects(
    buildProductLabCorpus({ experimentalProduct: "unknown-product" }),
    /unknown_experimental_product/,
  );
  const first = await buildProductLabCorpus({
    experimentalProduct: "synastry",
  });
  first.cases[0].calculation.facts[0].display = "changed synthetic test field";
  first.cases[0].request.facts.facts[0].display = "changed request";
  const second = await buildProductLabCorpus({
    experimentalProduct: "synastry",
  });
  assert.deepEqual(
    second.cases.map((item) => item.request),
    corpus.cases.map((item) => item.request),
  );
  assert.deepEqual(
    second.cases.map((item) => withoutCalculationTimes(item.calculation)),
    corpus.cases.map((item) => withoutCalculationTimes(item.calculation)),
  );
});
