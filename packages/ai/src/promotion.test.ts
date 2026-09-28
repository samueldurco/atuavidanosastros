import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { CONSTITUTION_VERSION, PROMPT_VERSION, SCHEMA_VERSION, dimensions, RUBRIC_VERSION } from "./index.ts";
import { goldenSeed } from "./lab/dataset.ts";
import { RELEASE_DATASET_VERSION, releaseCases } from "./lab/release-dataset.ts";
import { assessPromotion, promotedModels, type PromotionCandidate, type ReviewAuthority } from "./promotion.ts";
import { ARTIFACT_MANIFEST_VERSION, artifactKeys } from "./artifacts.ts";

const digest = createHash("sha256").update(JSON.stringify(goldenSeed)).digest("hex");
function candidate(): PromotionCandidate {
  return {
    id: "synthetic-test-only", capability: "purpose-direction", tier: "free", provider: "fixture", model: "fixture-1", resolvedModel: "fixture-1-001",
    versions: { constitution: CONSTITUTION_VERSION, prompt: PROMPT_VERSION, schema: SCHEMA_VERSION, rubric: RUBRIC_VERSION, dataset: RELEASE_DATASET_VERSION },
    artifactDigests: { prompt: digest, schema: digest, rubric: digest, dataset: digest },
    privacyReview: "synthetic-test", fallbackEvaluation: "synthetic-test", owner: "test-only",
    samples: releaseCases.filter((item) => item.request.facts.capability === "purpose-direction").flatMap((item) => [1, 2, 3].map((repetition) => ({
      caseId: item.id, provider: "fixture", executionId: `synthetic-${item.id}-${repetition}`,
      model: "fixture-1", resolvedModel: "fixture-1-001", repetition, promptVersion: PROMPT_VERSION,
      tier: "free" as const, output: goldenSeed, inputTokens: 1800, outputTokens: 800, latencyMs: 2000, costBrl: 0,
      costEvidence: { basis: "owner-confirmed-free-tier" as const, reference: "synthetic-test-only" },
      review: { rubricVersion: RUBRIC_VERSION, outputDigest: digest, reviewer: "test-only", source: "human" as const, calibrationId: null,
        scores: Object.fromEntries(dimensions.map((d) => [d, 10])) as Record<typeof dimensions[number], number>,
        evidence: Object.fromEntries(dimensions.map((d) => [d, "Synthetic fixture, never a real editorial review."])) as Record<typeof dimensions[number], string> },
    }))),
  };
}
const authority = { reviewers: ["test-only"], calibrations: [], artifacts: {
  version: ARTIFACT_MANIFEST_VERSION, commit: "1".repeat(40),
  artifactDigests: { prompt: digest, schema: digest, rubric: digest, dataset: digest },
} } satisfies ReviewAuthority;

test("promotion binds each sample to the candidate provider without normalizing identifiers", () => {
  for (const provider of [undefined, null, 123, "", " ", "fixture-other", "Fixture", "fixture "]) {
    const value = candidate(); value.samples[0]!.provider = provider as never;
    const decision = assessPromotion(value, authority);
    assert.equal(decision.status, "blocked");
    assert.ok(decision.reasons.includes("sample_provider_mismatch"));
  }
  const value = candidate(); value.provider = "another-provider";
  assert.ok(assessPromotion(value, authority).reasons.includes("sample_provider_mismatch"));
});

test("provider is a bounded canonical identifier, not an arbitrary label or credential URL", () => {
  for (const provider of [undefined, null, 123, "", " ", "Fixture", "fixture ", "a/b", "https://fixture", "á", "a".repeat(101), "_fixture"]) {
    const value = candidate(); value.provider = provider as never;
    for (const sample of value.samples) sample.provider = provider as never;
    const decision = assessPromotion(value, authority);
    assert.equal(decision.status, "blocked");
    assert.ok(decision.reasons.includes("provider_invalid"));
  }
  for (const provider of ["a", "fixture.v1_test-2", "a".repeat(100)]) {
    const value = candidate(); value.provider = provider;
    for (const sample of value.samples) sample.provider = provider;
    assert.equal(assessPromotion(value, authority).status, "eligible-for-release");
  }
});

test("every sample needs an opaque bounded execution reference; legacy candidates fail closed", () => {
  for (const executionId of [undefined, null, 123, "", " ", "ref with spaces", "https://fixture", "a/b", "á", "a".repeat(121), "_ref"]) {
    const value = candidate(); value.samples[0]!.executionId = executionId as never;
    const decision = assessPromotion(value, authority);
    assert.equal(decision.status, "blocked");
    assert.ok(decision.reasons.includes("execution_id_missing_or_invalid"));
  }
  for (const executionId of ["a", "capture.1_test-2", "a".repeat(120)]) {
    const value = candidate(); value.samples[0]!.executionId = executionId;
    assert.equal(assessPromotion(value, authority).status, "eligible-for-release");
  }
});

test("one capture cannot count twice through new repetition numbers or a different case", () => {
  for (const target of [1, 3, 20]) {
    const value = candidate();
    value.samples[target]!.executionId = value.samples[0]!.executionId;
    const decision = assessPromotion(value, authority);
    assert.equal(decision.status, "blocked");
    assert.ok(decision.reasons.includes("execution_id_reused"));
    // Repetition numbers remain distinct within each case; coverage alone does not detect reuse.
    assert.ok(!decision.reasons.some((reason) => reason.startsWith("coverage:")));
  }
});

test("distinct synthetic capture references may have identical output; eligibility never promotes", () => {
  const value = candidate();
  assert.equal(new Set(value.samples.map((sample) => sample.executionId)).size, 21);
  assert.equal(new Set(value.samples.map((sample) => sample.review.outputDigest)).size, 1);
  const decision = assessPromotion(value, authority);
  assert.equal(decision.status, "eligible-for-release");
  assert.deepEqual(decision.reasons, []);
  assert.deepEqual(promotedModels, []);
});

test("release blocks missing/invalid independent manifest and every mismatched artifact", () => {
  for (const artifacts of [undefined, null, {}, { ...authority.artifacts, version: "stale" },
    { ...authority.artifacts, commit: "HEAD" }, { ...authority.artifacts, extra: "untrusted" },
    { ...authority.artifacts, artifactDigests: { ...authority.artifacts.artifactDigests, prompt: "bad" } }]) {
    const decision = assessPromotion(candidate(), { ...authority, artifacts: artifacts as never });
    assert.equal(decision.status, "blocked");
    assert.ok(decision.reasons.includes("artifact_manifest_missing_or_invalid"));
  }
  for (const key of artifactKeys) {
    const value = candidate(); value.artifactDigests[key] = "0".repeat(64);
    const decision = assessPromotion(value, authority);
    assert.equal(decision.status, "blocked");
    assert.ok(decision.reasons.includes(`artifact_mismatch:${key}`));
  }
  assert.deepEqual(promotedModels, []);
});
test("promotion exige corpus completo, identidade, custo, SLA e crítica autorizada", () => {
  assert.equal(releaseCases.length, 42);
  assert.equal(assessPromotion(candidate(), authority).status, "eligible-for-release");
  const mutations: ((c: PromotionCandidate) => void)[] = [
    (c) => { c.samples.pop(); c.samples.pop(); c.samples.pop(); },
    (c) => { c.samples[0]!.repetition = 2; },
    (c) => { c.samples[0]!.inputTokens = null; },
    (c) => { c.samples[0]!.latencyMs = NaN; },
    (c) => { c.samples[0]!.costBrl = 0.001; },
    (c) => { delete c.samples[0]!.costEvidence; },
    (c) => { c.samples[0]!.costEvidence!.reference = " "; },
    (c) => { c.samples[0]!.costEvidence!.basis = "invented" as never; },
    (c) => { c.samples[0]!.inputTokens = NaN; },
    (c) => { c.samples[0]!.outputTokens = 1.5; },
    (c) => { c.samples[0]!.tier = "invalid" as never; },
    (c) => { c.tier = "toString" as never; },
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

test("promotion distinguishes verified zero cost from unknown and paid receipts", () => {
  const value = candidate();
  for (const sample of value.samples) sample.costEvidence = { basis: "provider-receipt", reference: "synthetic-receipt-only" };
  assert.equal(assessPromotion(value, authority).status, "eligible-for-release");
  value.samples[0]!.costBrl = 0.001;
  const paid = assessPromotion(value, authority);
  assert.ok(paid.reasons.includes("zero_cost_policy"));
  assert.ok(!paid.reasons.includes("cost_evidence_missing_or_invalid"));
  value.samples[0]!.costBrl = 0;
  delete value.samples[0]!.costEvidence;
  assert.ok(assessPromotion(value, authority).reasons.includes("cost_evidence_missing_or_invalid"));
  assert.deepEqual(promotedModels, []);
});

test("non-serializable samples cannot interrupt the gate or reuse a valid review digest", () => {
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
  for (const output of [undefined, 1n, cyclic, { toJSON() { throw new Error("fixture only"); } }]) {
    const value = candidate(); value.samples[0]!.output = output;
    const decision = assessPromotion(value, authority);
    assert.equal(decision.status, "blocked");
    assert.ok(decision.reasons.includes(`output_rejected:${value.samples[0]!.caseId}`));
    assert.ok(decision.reasons.includes(`editorial_review:${value.samples[0]!.caseId}`));
  }
  assert.deepEqual(promotedModels, []);
});
