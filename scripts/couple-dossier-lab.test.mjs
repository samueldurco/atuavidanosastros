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
  COUPLE_DOSSIER_CORPUS_VERSION,
  coupleDossierLabCases,
} from "./helpers/couple-dossier-lab-cases.mjs";
import {
  CAPTURE_VERSION,
  productBenchmarkManifest,
  evaluateProductBenchmark,
} from "./helpers/product-benchmark.mjs";
import {
  productReviewTemplate,
  evaluateProductReview,
} from "./helpers/product-benchmark-review.mjs";
import { coupleDossierEditorialTestFixture } from "./helpers/couple-dossier-editorial-test-fixture.mjs";
import {
  createProductCalculators,
  productCalculationCoverage,
} from "../apps/worker/src/product-runtime.ts";
import {
  COUPLE_DOSSIER_EDITORIAL_VERSION,
  COUPLE_DOSSIER_MAX_INPUT_CHARS,
  buildPrompt,
  validateFacts,
} from "../packages/ai/src/index.ts";

const corpus = await buildProductLabCorpus({
  experimentalProduct: "couple-dossier",
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
      output: coupleDossierEditorialTestFixture(
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

test("Dossier corpus is explicit, synthetic and separate from the frozen default and runtime", async () => {
  assert.equal(corpus.version, COUPLE_DOSSIER_CORPUS_VERSION);
  assert.deepEqual(
    corpus.cases.map((item) => item.category),
    corpusCategories,
  );
  assert.deepEqual(
    coupleDossierLabCases.map((item) => item.category),
    corpusCategories,
  );
  assert.equal(
    corpus.scope,
    "experimental-couple-dossier-qa-policy-not-approved",
  );
  assert.equal(corpus.policyApproval, "not-established");
  assert.equal(corpus.geometricDiversity, "single-synthetic-pair");
  assert.equal(corpus.editorialReview, "not-reviewed");
  assert.equal(corpus.promotionEligible, false);
  assert.ok(corpus.unavailableProducts.includes("couple-dossier"));
  assert.equal(corpus.unavailableProducts.length, 12);
  assert.equal(createProductCalculators()["couple-dossier"], undefined);
  assert.equal(
    productCalculationCoverage().find(
      (item) => item.productId === "couple-dossier",
    ).calculation,
    "unavailable",
  );
  assert.equal(corpusProducts.includes("couple-dossier"), false);
  const original = await buildProductLabCorpus();
  assert.equal(original.version, "atv-product-facts-synthetic/1.25.0");
  assert.equal(original.cases.length, 105);
  assert.equal(new Set(corpus.cases.map((item) => item.runId)).size, 7);
});

test("context cases preserve all base facts and declared limits without adding geometric diversity", () => {
  const reference = corpus.cases[0];
  for (const item of corpus.cases) {
    assert.deepEqual(item.input.birth, reference.input.birth);
    assert.deepEqual(item.input.partner, reference.input.partner);
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
      COUPLE_DOSSIER_EDITORIAL_VERSION,
    );
    assert.equal(item.request.tier, "premium");
    assert.equal(item.publication, "blocked");
    assert.ok(validateFacts(item.request.facts));
    assert.equal(
      item.request.facts.facts.filter((fact) => fact.id.startsWith("cross-"))
        .length,
      100,
    );
    assert.ok(
      item.request.facts.facts
        .filter((fact) => fact.id.startsWith("cross-"))
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
        criterion.includes("acordos são hipóteses"),
      ),
    );
    assert.ok(
      buildPrompt(item.request).prompt.length <= COUPLE_DOSSIER_MAX_INPUT_CHARS,
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

test("review binds current Dossier criteria and rejects other corpus or modified outputs", async () => {
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

test("existing CLIs carry the explicit Dossier scope through manifest, capture and blank review", () => {
  const exported = cli([
    "scripts/product-lab-corpus.mjs",
    "--experimental-couple-dossier",
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
    "--experimental-couple-dossier",
    "--manifest",
  ]);
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(JSON.parse(listed.stdout), manifest);
  const folder = mkdtempSync(join(tmpdir(), "atv-couple-dossier-lab-"));
  const file = join(folder, "fixture.json");
  const reviewFile = join(folder, "review.json");
  try {
    writeFileSync(file, JSON.stringify(capture()));
    const evaluated = cli([
      "scripts/evaluate-product-benchmark.mjs",
      "--experimental-couple-dossier",
      file,
    ]);
    assert.equal(evaluated.status, 1, evaluated.stderr);
    assert.equal(JSON.parse(evaluated.stdout).summary.mechanicalPasses, 21);
    const blank = cli([
      "scripts/evaluate-product-benchmark.mjs",
      "--experimental-couple-dossier",
      "--review-template",
      file,
    ]);
    assert.equal(blank.status, 0, blank.stderr);
    writeFileSync(reviewFile, blank.stdout);
    const reviewed = cli([
      "scripts/evaluate-product-benchmark.mjs",
      "--experimental-couple-dossier",
      "--review",
      file,
      reviewFile,
    ]);
    assert.equal(reviewed.status, 1, reviewed.stderr);
    assert.equal(JSON.parse(reviewed.stdout).trustedReviews, 0);
    for (const args of [[file], ["--experimental-synastry", file]]) {
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
    ["--experimental-couple-dossier", "--experimental-synastry"],
    ["--unknown"],
    ["constructor"],
  ])
    assert.equal(cli(["scripts/product-lab-corpus.mjs", ...args]).status, 2);
  assert.equal(
    cli([
      "scripts/evaluate-product-benchmark.mjs",
      "--experimental-couple-dossier",
      "--experimental-synastry",
      "--manifest",
    ]).status,
    2,
  );
});
