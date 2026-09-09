import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { CONSTITUTION_VERSION, PROMPT_VERSION, SCHEMA_VERSION, dimensions, RUBRIC_VERSION } from "./index.ts";
import { goldenSeed } from "./lab/dataset.ts";
import { RELEASE_DATASET_VERSION, releaseCases } from "./lab/release-dataset.ts";
import { assessPromotion, promotedModels, type PromotionCandidate } from "./promotion.ts";

const digest = createHash("sha256").update(JSON.stringify(goldenSeed)).digest("hex");
function candidate(): PromotionCandidate {
  return {
    id: "synthetic-test-only", capability: "purpose-direction", tier: "free", provider: "fixture", model: "fixture-1", resolvedModel: "fixture-1-001",
    versions: { constitution: CONSTITUTION_VERSION, prompt: PROMPT_VERSION, schema: SCHEMA_VERSION, rubric: RUBRIC_VERSION, dataset: RELEASE_DATASET_VERSION },
    artifactDigests: { prompt: digest, schema: digest, rubric: digest, dataset: digest },
    privacyReview: "synthetic-test", fallbackEvaluation: "synthetic-test", owner: "test-only",
    samples: releaseCases.filter((item) => item.request.facts.capability === "purpose-direction").flatMap((item) => [1, 2, 3].map((repetition) => ({
      caseId: item.id, model: "fixture-1", resolvedModel: "fixture-1-001", repetition, promptVersion: PROMPT_VERSION,
      tier: "free" as const, output: goldenSeed, inputTokens: 1800, outputTokens: 800, latencyMs: 2000, costBrl: 0,
      review: { rubricVersion: RUBRIC_VERSION, outputDigest: digest, reviewer: "test-only", source: "human" as const, calibrationId: null,
        scores: Object.fromEntries(dimensions.map((d) => [d, 10])) as Record<typeof dimensions[number], number>,
        evidence: Object.fromEntries(dimensions.map((d) => [d, "Synthetic fixture, never a real editorial review."])) as Record<typeof dimensions[number], string> },
    }))),
  };
}
const authority = { reviewers: ["test-only"], calibrations: [] };
test("promotion exige corpus completo, identidade, custo, SLA e crítica autorizada", () => {
  assert.equal(releaseCases.length, 42);
  assert.equal(assessPromotion(candidate(), authority).status, "eligible-for-release");
  const mutations: ((c: PromotionCandidate) => void)[] = [
    (c) => { c.samples.pop(); c.samples.pop(); c.samples.pop(); },
    (c) => { c.samples[0]!.repetition = 2; },
    (c) => { c.samples[0]!.inputTokens = null; },
    (c) => { c.samples[0]!.latencyMs = NaN; },
    (c) => { c.samples[0]!.costBrl = 0.001; },
    (c) => { c.samples[0]!.review.outputDigest = "0".repeat(64); },
    (c) => { c.samples[0]!.review.reviewer = "self-appointed"; },
    (c) => { c.samples[0]!.review.source = "calibrated-reviewer"; c.samples[0]!.review.calibrationId = "invented"; },
    (c) => { c.samples[0]!.review.scores.factualFidelity = 9; },
    (c) => { c.versions.prompt = "stale"; },
    (c) => { c.artifactDigests.dataset = "missing"; },
    (c) => { c.samples[0]!.resolvedModel = "different"; },
  ];
  for (const mutate of mutations) { const value = candidate(); mutate(value); assert.equal(assessPromotion(value, authority).status, "blocked"); }
  assert.deepEqual(promotedModels, []);
});
