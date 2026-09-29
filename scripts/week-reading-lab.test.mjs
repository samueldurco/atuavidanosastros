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
  WEEK_READING_CORPUS_VERSION,
  weekReadingLabCases,
} from "./helpers/week-reading-lab-cases.mjs";
import {
  CAPTURE_VERSION,
  productBenchmarkManifest,
  evaluateProductBenchmark,
} from "./helpers/product-benchmark.mjs";
import {
  productReviewTemplate,
  evaluateProductReview,
} from "./helpers/product-benchmark-review.mjs";
import { weekReadingEditorialTestFixture } from "./helpers/week-reading-editorial-test-fixture.mjs";
import { evaluateSample } from "../packages/ai/src/lab/benchmark.ts";
import {
  createProductCalculators,
  productCalculationCoverage,
} from "../apps/worker/src/product-runtime.ts";
import {
  WEEK_READING_EDITORIAL_VERSION,
  WEEK_READING_MAX_INPUT_CHARS,
  weekReadingEditorialLimits,
  buildPrompt,
  validateFacts,
} from "../packages/ai/src/index.ts";

const corpus = await buildProductLabCorpus({
  experimentalProduct: "week-reading",
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
      output: weekReadingEditorialTestFixture(
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

test("Week corpus is opt-in, synthetic and separate from default runtime and frozen corpus", async () => {
  assert.equal(corpus.version, WEEK_READING_CORPUS_VERSION);
  assert.deepEqual(
    corpus.cases.map((item) => item.category),
    corpusCategories,
  );
  assert.deepEqual(
    weekReadingLabCases.map((item) => item.category),
    corpusCategories,
  );
  assert.equal(corpus.scope, "experimental-week-reading-seven-utc-samples");
  assert.equal(corpus.engineApproval, "not-established");
  assert.equal(corpus.temporalCoverage, "seven-12utc-samples-not-local-days");
  assert.equal(
    corpus.geometricDiversity,
    "single-synthetic-natal-seven-samples",
  );
  assert.equal(corpus.editorialReview, "not-reviewed");
  assert.equal(corpus.promotionEligible, false);
  assert.ok(corpus.unavailableProducts.includes("week-reading"));
  assert.equal(corpus.unavailableProducts.length, 12);
  assert.equal(createProductCalculators()["week-reading"], undefined);
  assert.equal(
    productCalculationCoverage().find(
      (item) => item.productId === "week-reading",
    ).calculation,
    "unavailable",
  );
  assert.equal(corpusProducts.includes("week-reading"), false);
  const original = await buildProductLabCorpus();
  assert.equal(original.version, "atv-product-facts-synthetic/1.25.0");
  assert.equal(original.cases.length, 105);
  assert.equal(new Set(corpus.cases.map((item) => item.runId)).size, 7);
});

test("seven context categories preserve complete natal and dated samples without geometry diversity", () => {
  const reference = corpus.cases[0];
  for (const item of corpus.cases) {
    assert.deepEqual(item.input.birth, reference.input.birth);
    assert.equal(item.input.targetDate, "2026-09-29");
    assert.equal(item.calculation.data.endDate, "2026-10-05");
    assert.equal(Object.hasOwn(item.input, "partner"), false);
    assert.deepEqual(
      item.calculation.facts.filter((fact) => fact.kind === "calculated"),
      reference.calculation.facts.filter((fact) => fact.kind === "calculated"),
    );
    assert.deepEqual(
      withoutCalculationTimes(item.calculation.data.samples),
      withoutCalculationTimes(reference.calculation.data.samples),
    );
    assert.deepEqual(item.calculation.data.aspects, []);
    assert.deepEqual(item.calculation.data.events, []);
    assert.deepEqual(item.calculation.data.windows, []);
    assert.equal(item.input.consent.continuity, false);
    assert.equal(
      item.request.facts.editorialProfile,
      WEEK_READING_EDITORIAL_VERSION,
    );
    assert.equal(item.request.tier, "free");
    assert.equal(item.publication, "blocked");
    assert.ok(validateFacts(item.request.facts));
    assert.equal(
      item.request.facts.facts.length,
      item.input.context === undefined ? 88 : 89,
    );
    for (let day = 1; day <= 7; day++)
      assert.equal(
        item.request.facts.facts.filter((fact) =>
          fact.id.startsWith(`day-${day}-`),
        ).length,
        11,
      );
    assert.equal(item.factsDigest, corpusDigest(item.request.facts));
    assert.equal(item.inputDigest, corpusDigest(item.input));
    assert.equal(item.calculationDigest, corpusDigest(item.calculation));
    assert.ok(item.criteria[0].length > 100);
    for (const limit of weekReadingEditorialLimits)
      assert.ok(item.criteria.includes(limit));
    assert.ok(
      buildPrompt(item.request).prompt.length <= WEEK_READING_MAX_INPUT_CHARS,
    );
  }
  const absent = corpus.cases.find((item) => item.category === "incomplete");
  assert.equal(Object.hasOwn(absent.input, "context"), false);
  assert.equal(Object.hasOwn(absent.request, "context"), false);
  const boundary = corpus.cases.find((item) => item.category === "boundary");
  assert.equal(boundary.input.context.length, 1200);
  assert.equal(
    boundary.request.facts.facts.at(-1).display,
    boundary.input.context,
  );
  const hostile = corpus.cases.find((item) => item.category === "adversarial");
  assert.equal(hostile.request.facts.facts.at(-1).kind, "reported");
  assert.equal(
    hostile.request.facts.facts.at(-1).display,
    hostile.input.context,
  );
  assert.equal(hostile.request.facts.completeness, "partial");
});

test("21 complete mechanical specimens leave costs, tokens and editorial authority unknown", () => {
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
        (dimension) => dimension.score === null && dimension.evidence === null,
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

test("Week profile budget applies only through trusted case facts and rejects excess or incomplete coverage", () => {
  const item = corpus.cases[0];
  const sample = {
    caseId: item.id,
    promptVersion: manifest.promptVersion,
    model: "synthetic-only",
    repetition: 1,
    output: weekReadingEditorialTestFixture(item.request.facts),
    latencyMs: 0,
    inputTokens: 0,
    outputTokens: 4500,
  };
  const accepted = evaluateSample(sample, corpus);
  assert.equal(accepted.schemaPass, true);
  assert.equal(accepted.mechanicalPass, true);
  assert.equal(accepted.tokenUsagePass, true);
  assert.equal(accepted.costKnown, false);
  for (const tier of ["free", "premium"])
    assert.equal(
      evaluateSample({ ...sample, tier, outputTokens: 4501 }, corpus)
        .tokenUsagePass,
      false,
    );
  const invalidTier = evaluateSample({ ...sample, tier: "untrusted" }, corpus);
  assert.equal(invalidTier.schemaPass, false);
  assert.equal(invalidTier.tokenUsagePass, false);
  for (const mutate of [
    (reading) => reading.claims.pop(),
    (reading) => reading.claims[1].evidence.pop(),
    (reading) => {
      reading.claims[2].evidence = [...reading.claims[1].evidence];
    },
    (reading) => {
      reading.claims[1].text = reading.claims[2].text;
    },
    (reading) => reading.limits.pop(),
  ]) {
    const broken = structuredClone(sample);
    mutate(broken.output);
    assert.equal(evaluateSample(broken, corpus).mechanicalPass, false);
  }
});

test("review binds Week criteria, version and outputs and rejects a different corpus", async () => {
  const samples = capture(),
    template = productReviewTemplate(samples, corpus);
  for (const mutate of [
    (value) => {
      value.cases[0].criteria[0] += " Alterado.";
    },
    (value) => {
      value.version += "-changed";
    },
  ]) {
    const changed = structuredClone(corpus);
    mutate(changed);
    assert.throws(
      () => evaluateProductReview(samples, template, changed),
      /review_binding_mismatch|capture_corpus_mismatch/,
    );
  }
  samples.samples[0].output.title += " modificado";
  assert.throws(
    () => evaluateProductReview(samples, template, corpus),
    /review_binding_mismatch/,
  );
  const original = await buildProductLabCorpus();
  assert.throws(
    () => evaluateProductBenchmark(capture(), original),
    /capture_corpus_mismatch/,
  );
  const malformed = capture();
  malformed.samples[0].promptDigest = "0".repeat(64);
  assert.throws(
    () => evaluateProductBenchmark(malformed, corpus),
    /capture_request_or_prompt_mismatch/,
  );
});

test("existing CLIs carry Week opt-in through export, manifest, capture and pending review", () => {
  const flag = "--experimental-week-reading";
  const exported = cli(["scripts/product-lab-corpus.mjs", flag]);
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
    flag,
    "--manifest",
  ]);
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout), manifest);
  const folder = mkdtempSync(join(tmpdir(), "atv-week-reading-lab-"));
  const file = join(folder, "fixture.json"),
    reviewFile = join(folder, "review.json");
  try {
    writeFileSync(file, JSON.stringify(capture()));
    const evaluated = cli([
      "scripts/evaluate-product-benchmark.mjs",
      flag,
      file,
    ]);
    assert.equal(evaluated.status, 1, evaluated.stderr);
    assert.equal(JSON.parse(evaluated.stdout).summary.mechanicalPasses, 21);
    const blank = cli([
      "scripts/evaluate-product-benchmark.mjs",
      flag,
      "--review-template",
      file,
    ]);
    assert.equal(blank.status, 0, blank.stderr);
    writeFileSync(reviewFile, blank.stdout);
    const reviewed = cli([
      "scripts/evaluate-product-benchmark.mjs",
      flag,
      "--review",
      file,
      reviewFile,
    ]);
    assert.equal(reviewed.status, 1, reviewed.stderr);
    assert.equal(JSON.parse(reviewed.stdout).trustedReviews, 0);
    for (const args of [
      [file],
      ["--experimental-horoscope", file],
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
    [flag, "--experimental-horoscope"],
    ["--unknown"],
    ["constructor"],
  ])
    assert.equal(cli(["scripts/product-lab-corpus.mjs", ...args]).status, 2);
  assert.equal(
    cli([
      "scripts/evaluate-product-benchmark.mjs",
      flag,
      "--experimental-horoscope",
      "--manifest",
    ]).status,
    2,
  );
});

test("fresh Week corpus does not retain changed evidence or open unknown product scope", async () => {
  const changed = await buildProductLabCorpus({
    experimentalProduct: "week-reading",
  });
  changed.cases[0].request.facts.facts.splice(1, 1);
  assert.equal(validateFacts(changed.cases[0].request.facts), false);
  const fresh = await buildProductLabCorpus({
    experimentalProduct: "week-reading",
  });
  assert.deepEqual(productBenchmarkManifest(fresh), manifest);
  await assert.rejects(
    buildProductLabCorpus({ experimentalProduct: "unknown-week" }),
    /unknown_experimental_product/,
  );
});
