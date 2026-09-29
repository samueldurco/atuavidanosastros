import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildProductLabCorpus,
  corpusCategories,
  corpusDigest,
  corpusProducts,
} from "./helpers/product-lab-corpus.mjs";
import {
  HOROSCOPE_CORPUS_VERSION,
  horoscopeLabCases,
} from "./helpers/horoscope-lab-cases.mjs";
import {
  CAPTURE_VERSION,
  productBenchmarkManifest,
  evaluateProductBenchmark,
} from "./helpers/product-benchmark.mjs";
import {
  productReviewTemplate,
  evaluateProductReview,
} from "./helpers/product-benchmark-review.mjs";
import { horoscopeEditorialTestFixture } from "./helpers/horoscope-editorial-test-fixture.mjs";
import { evaluateSample } from "../packages/ai/src/lab/benchmark.ts";
import {
  createProductCalculators,
  productCalculationCoverage,
} from "../apps/worker/src/product-runtime.ts";
import {
  HOROSCOPE_EDITORIAL_VERSION,
  HOROSCOPE_MAX_INPUT_CHARS,
  buildPrompt,
  validateFacts,
} from "../packages/ai/src/index.ts";

const corpus = await buildProductLabCorpus({
  experimentalProduct: "horoscope",
});
const manifest = productBenchmarkManifest(corpus);
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
      output: horoscopeEditorialTestFixture(
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
    maxBuffer: 3 * 1024 * 1024,
  });
const withoutCalculationTimes = (value) =>
  JSON.parse(
    JSON.stringify(value, (key, field) =>
      key === "calculatedAt" ? undefined : field,
    ),
  );

test("Horoscope corpus is explicit, synthetic and separate from the frozen default and runtime", async () => {
  assert.equal(corpus.version, HOROSCOPE_CORPUS_VERSION);
  assert.deepEqual(
    corpus.cases.map((item) => item.category),
    corpusCategories,
  );
  assert.deepEqual(
    horoscopeLabCases.map((item) => item.category),
    corpusCategories,
  );
  assert.equal(corpus.scope, "experimental-horoscope-qa-policy-not-approved");
  assert.equal(corpus.policyApproval, "not-established");
  assert.equal(corpus.geometricDiversity, "single-synthetic-natal-sample");
  assert.equal(corpus.editorialReview, "not-reviewed");
  assert.equal(corpus.promotionEligible, false);
  assert.ok(corpus.unavailableProducts.includes("horoscope"));
  assert.equal(corpus.unavailableProducts.length, 12);
  assert.equal(createProductCalculators()["horoscope"], undefined);
  assert.equal(
    productCalculationCoverage().find((item) => item.productId === "horoscope")
      .calculation,
    "unavailable",
  );
  assert.equal(corpusProducts.includes("horoscope"), false);
  const original = await buildProductLabCorpus();
  assert.equal(original.version, "atv-product-facts-synthetic/1.25.0");
  assert.equal(original.cases.length, 105);
  assert.equal(new Set(corpus.cases.map((item) => item.runId)).size, 7);
});

test("context cases preserve all base facts and declared limits without adding geometric diversity", () => {
  const reference = corpus.cases[0];
  for (const item of corpus.cases) {
    assert.deepEqual(item.input.birth, reference.input.birth);
    assert.equal(Object.hasOwn(item.input, "partner"), false);
    assert.equal(item.input.targetDate, reference.input.targetDate);
    assert.deepEqual(
      item.calculation.facts.filter((fact) => fact.kind === "calculated"),
      reference.calculation.facts.filter((fact) => fact.kind === "calculated"),
    );
    assert.deepEqual(
      item.calculation.data.projection,
      reference.calculation.data.projection,
    );
    assert.deepEqual(
      withoutCalculationTimes(item.calculation.data.base.data),
      withoutCalculationTimes(reference.calculation.data.base.data),
    );
    assert.equal(item.input.consent.continuity, false);
    assert.equal(
      item.request.facts.editorialProfile,
      HOROSCOPE_EDITORIAL_VERSION,
    );
    assert.equal(item.request.tier, "free");
    assert.equal(item.publication, "blocked");
    assert.ok(validateFacts(item.request.facts));
    assert.equal(
      item.request.facts.facts.filter((fact) => fact.id.startsWith("transit-"))
        .length,
      100,
    );
    assert.ok(
      item.request.facts.facts
        .filter((fact) => fact.id.startsWith("transit-"))
        .every((fact) =>
          fact.display.endsWith(
            " Precisão não certificada; estabilidade desconhecida.",
          ),
        ),
    );
    assert.equal(item.factsDigest, corpusDigest(item.request.facts));
    assert.ok(item.criteria[0].length > 100);
    assert.ok(
      item.criteria.some((criterion) =>
        criterion.includes("Exploração simbólica condicional"),
      ),
    );
    assert.ok(
      buildPrompt(item.request).prompt.length <= HOROSCOPE_MAX_INPUT_CHARS,
    );
  }
  const absent = corpus.cases.find((item) => item.category === "incomplete");
  assert.equal(Object.hasOwn(absent.input, "context"), false);
  assert.equal(Object.hasOwn(absent.request, "context"), false);
  assert.equal(absent.request.facts.facts.length, 121);
  const boundary = corpus.cases.find((item) => item.category === "boundary");
  assert.equal(boundary.input.context.length, 1200);
  assert.equal(
    boundary.request.facts.facts.at(-1).display,
    boundary.input.context,
  );
});

test("21 structural samples stay diagnostic with unknown measurements and no trusted reviews", () => {
  const samples = capture();
  const report = evaluateProductBenchmark(samples, corpus);
  assert.equal(report.summary.expectedSamples, 21);
  assert.equal(report.summary.mechanicalPasses, 21);
  assert.equal(report.summary.schemaPasses, 21);
  assert.equal(report.summary.costUnknown, 21);
  assert.equal(report.summary.tokensUnknown, 21);
  assert.equal(report.summary.unreviewedSamples, 21);
  assert.equal(report.summary.preparedChecksComplete, false);
  assert.equal(report.publication, "blocked");
  assert.equal(report.promotionEligible, false);
  const template = productReviewTemplate(samples, corpus);
  assert.equal(template.annotations.length, 21);
  for (const row of template.annotations) {
    assert.equal(row.source, null);
    assert.equal(row.reviewer, null);
    assert.ok(
      Object.values(row.dimensions).every(
        (entry) => entry.score === null && entry.evidence === null,
      ),
    );
    assert.ok(
      row.criteria.every(
        (entry) => entry.verdict === null && entry.evidence === null,
      ),
    );
  }
  const review = evaluateProductReview(samples, template, corpus);
  assert.equal(review.trustedReviews, 0);
  assert.equal(review.summary.incompleteAnnotations, 21);
  assert.equal(review.summary.completeAnnotations, 0);
  assert.equal(review.summary.preparedDiagnosticsComplete, false);
  assert.equal(review.publication, "blocked");
});

test("trusted Horoscope preview budgets apply to schema and token checks, independently of sample tier", () => {
  const item = corpus.cases[0];
  const sample = {
    caseId: item.id,
    promptVersion: manifest.promptVersion,
    model: "synthetic-only",
    repetition: 1,
    output: horoscopeEditorialTestFixture(item.request.facts),
    latencyMs: 0,
    inputTokens: 0,
    outputTokens: 4500,
  };
  const accepted = evaluateSample(sample, corpus);
  assert.equal(accepted.schemaPass, true);
  assert.equal(accepted.mechanicalPass, true);
  assert.equal(accepted.tokenUsagePass, true);
  assert.equal(accepted.costKnown, false);
  for (const tier of ["free", "premium"]) {
    const exceeded = evaluateSample(
      { ...sample, tier, outputTokens: 4501 },
      corpus,
    );
    assert.equal(exceeded.tokenUsagePass, false);
  }
  const invalidTier = evaluateSample({ ...sample, tier: "untrusted" }, corpus);
  assert.equal(invalidTier.schemaPass, false);
  assert.equal(invalidTier.tokenUsagePass, false);
  const incomplete = structuredClone(sample);
  incomplete.output.claims.pop();
  assert.equal(evaluateSample(incomplete, corpus).mechanicalPass, false);
});

test("review binds current Horoscope criteria and rejects other corpus or modified outputs", async () => {
  const samples = capture();
  const template = productReviewTemplate(samples, corpus);
  const changed = structuredClone(corpus);
  changed.cases[0].criteria[0] += " Critério alterado.";
  assert.throws(
    () => evaluateProductReview(samples, template, changed),
    /review_binding_mismatch/,
  );
  samples.samples[0].output.title += " modificado";
  assert.throws(
    () => evaluateProductReview(samples, template, corpus),
    /review_binding_mismatch/,
  );
  const defaultCorpus = await buildProductLabCorpus();
  assert.throws(
    () => evaluateProductBenchmark(capture(), defaultCorpus),
    /capture_corpus_mismatch/,
  );
});

test("existing CLIs carry the explicit Horoscope scope through manifest, capture and blank review", () => {
  const exported = cli([
    "scripts/product-lab-corpus.mjs",
    "--experimental-horoscope",
  ]);
  assert.equal(exported.status, 0, exported.stderr);
  const exportedCorpus = JSON.parse(exported.stdout);
  assert.deepEqual(productBenchmarkManifest(exportedCorpus), manifest);
  assert.deepEqual(
    exportedCorpus.cases.map((item) =>
      withoutCalculationTimes(item.calculation),
    ),
    corpus.cases.map((item) => withoutCalculationTimes(item.calculation)),
  );
  const listed = cli([
    "scripts/evaluate-product-benchmark.mjs",
    "--experimental-horoscope",
    "--manifest",
  ]);
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout), manifest);
  const folder = mkdtempSync(join(tmpdir(), "atv-horoscope-lab-"));
  const file = join(folder, "fixture.json");
  const reviewFile = join(folder, "review.json");
  try {
    writeFileSync(file, JSON.stringify(capture()));
    const evaluated = cli([
      "scripts/evaluate-product-benchmark.mjs",
      "--experimental-horoscope",
      file,
    ]);
    assert.equal(evaluated.status, 1, evaluated.stderr);
    assert.equal(JSON.parse(evaluated.stdout).summary.mechanicalPasses, 21);
    const blank = cli([
      "scripts/evaluate-product-benchmark.mjs",
      "--experimental-horoscope",
      "--review-template",
      file,
    ]);
    assert.equal(blank.status, 0, blank.stderr);
    writeFileSync(reviewFile, blank.stdout);
    const reviewed = cli([
      "scripts/evaluate-product-benchmark.mjs",
      "--experimental-horoscope",
      "--review",
      file,
      reviewFile,
    ]);
    assert.equal(reviewed.status, 1, reviewed.stderr);
    assert.equal(JSON.parse(reviewed.stdout).trustedReviews, 0);
    for (const args of [
      [file],
      ["--experimental-synastry", file],
      ["--experimental-couple-dossier", file],
    ]) {
      const wrong = cli(["scripts/evaluate-product-benchmark.mjs", ...args]);
      assert.equal(wrong.status, 2);
      assert.equal(JSON.parse(wrong.stderr).code, "capture_corpus_mismatch");
    }
  } finally {
    for (const path of [file, reviewFile])
      if (existsSync(path)) unlinkSync(path);
    rmdirSync(folder);
  }
  for (const args of [
    ["--experimental-horoscope", "--experimental-synastry"],
    ["--unknown"],
    ["constructor"],
  ])
    assert.equal(cli(["scripts/product-lab-corpus.mjs", ...args]).status, 2);
  assert.equal(
    cli([
      "scripts/evaluate-product-benchmark.mjs",
      "--experimental-horoscope",
      "--experimental-synastry",
      "--manifest",
    ]).status,
    2,
  );
});
