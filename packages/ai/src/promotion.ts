import { CONSTITUTION_VERSION } from "./constitutions.ts";
import { PROMPT_VERSION, SCHEMA_VERSION, tierLimits, type Capability, type Tier } from "./contracts.ts";
import { RUBRIC_VERSION, editorialDecision, type ScoredReview } from "./director.ts";
import { RELEASE_DATASET_VERSION, releaseCases } from "./lab/release-dataset.ts";
import { evaluateSample, type BenchmarkSample } from "./lab/benchmark.ts";
import { artifactKeys, validArtifactManifest, type ArtifactDigests, type ArtifactManifest } from "./artifacts.ts";

export const PROMOTION_POLICY_VERSION = "atv-promotion/1.4.0";
export interface EvaluatedSample extends BenchmarkSample {
  provider: string;
  /** Opaque reference to an independently captured invocation, not a provider secret or receipt. */
  executionId: string;
  resolvedModel: string;
  tier: Tier;
  costBrl: number;
  review: ScoredReview;
}
export interface PromotionCandidate {
  id: string;
  capability: Capability;
  tier: Tier;
  provider: string;
  model: string;
  resolvedModel: string;
  versions: { constitution: string; prompt: string; schema: string; rubric: string; dataset: string };
  /** Hashes must match the independently supplied trusted repository manifest. */
  artifactDigests: ArtifactDigests;
  samples: EvaluatedSample[];
  privacyReview: string;
  fallbackEvaluation: string;
  owner: string;
}
export interface ReviewAuthority {
  reviewers: readonly string[];
  calibrations: readonly string[];
  /** Independent trusted input, never copied from the candidate. Missing proof fails closed. */
  artifacts?: ArtifactManifest;
}

/** An evidence gate, not a signature verifier. Only trusted server/repository records may enter here. */
export function assessPromotion(candidate: PromotionCandidate, authority: ReviewAuthority) {
  const reasons = new Set<string>();
  const reject = (reason: string) => reasons.add(reason);
  const expected = {
    constitution: CONSTITUTION_VERSION, prompt: PROMPT_VERSION, schema: SCHEMA_VERSION,
    rubric: RUBRIC_VERSION, dataset: RELEASE_DATASET_VERSION,
  };
  for (const [key, version] of Object.entries(expected))
    if (candidate.versions[key as keyof typeof expected] !== version) reject(`stale_${key}`);
  const artifacts = validArtifactManifest(authority.artifacts) ? authority.artifacts : null;
  if (!artifacts) reject("artifact_manifest_missing_or_invalid");
  for (const key of artifactKeys) {
    if (!/^[a-f0-9]{64}$/.test(candidate.artifactDigests[key])) reject(`missing_${key}_digest`);
    if (artifacts && candidate.artifactDigests[key] !== artifacts.artifactDigests[key]) reject(`artifact_mismatch:${key}`);
  }
  if (!candidate.owner.trim() || !candidate.privacyReview.trim() || !candidate.fallbackEvaluation.trim())
    reject("operational_reviews_missing");
  if (typeof candidate.provider !== "string" || !/^[a-z0-9][a-z0-9._-]{0,99}$/.test(candidate.provider))
    reject("provider_invalid");
  if (!/^[a-z0-9._-]{1,100}$/.test(candidate.model) ||
      !/^[a-z0-9._-]{1,100}$/.test(candidate.resolvedModel) || /latest|preview/i.test(candidate.model + candidate.resolvedModel))
    reject("model_not_pinned");
  const cases = releaseCases.filter((item) => item.request.facts.capability === candidate.capability);
  if (!cases.length || !Object.hasOwn(tierLimits, candidate.tier)) return { policyVersion: PROMOTION_POLICY_VERSION,
    status: "blocked", reasons: [...reasons, "unknown_scope"] } as const;
  // Release policy: three independent repetitions for EVERY case in this capability.
  // Refusal cases are evaluated as model outputs too; the runtime still refuses insufficient facts before generation.
  for (const item of cases) {
    const samples = candidate.samples.filter((s) => s.caseId === item.id);
    const repetitions = new Set(samples.map((s) => s.repetition));
    if (samples.length < 3 || repetitions.size !== samples.length) reject(`coverage:${item.id}`);
  }
  const executions = new Set<string>();
  for (const sample of candidate.samples) {
    if (typeof sample.provider !== "string" || sample.provider !== candidate.provider)
      reject("sample_provider_mismatch");
    if (typeof sample.executionId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(sample.executionId)) {
      reject("execution_id_missing_or_invalid");
    } else {
      // A distinct repetition number cannot turn the same captured invocation into new evidence.
      // This checks trusted references only; it cannot authenticate an invented reference.
      if (executions.has(sample.executionId)) reject("execution_id_reused");
      executions.add(sample.executionId);
    }
    if (!cases.some((item) => item.id === sample.caseId)) { reject("foreign_case"); continue; }
    if (sample.model !== candidate.model || sample.resolvedModel !== candidate.resolvedModel ||
        sample.promptVersion !== candidate.versions.prompt || sample.tier !== candidate.tier ||
        !Number.isSafeInteger(sample.repetition) || sample.repetition < 1) reject("sample_identity_mismatch");
    const evaluation = evaluateSample(sample, { version: RELEASE_DATASET_VERSION, cases: releaseCases });
    if (!evaluation.schemaPass || !evaluation.mechanicalPass) reject(`output_rejected:${sample.caseId}`);
    if (!Number.isFinite(sample.latencyMs) || sample.latencyMs < 0 || sample.latencyMs > tierLimits[candidate.tier].timeoutMs)
      reject(`latency:${sample.caseId}`);
    if (![sample.inputTokens, sample.outputTokens].every((n) => n !== null && Number.isSafeInteger(n) && n >= 0) ||
        sample.outputTokens! > tierLimits[candidate.tier].maxOutputTokens) reject("usage_unknown_or_exceeded");
    if (!evaluation.costKnown) reject("cost_evidence_missing_or_invalid");
    if (evaluation.costBrl !== 0) reject("zero_cost_policy");
    const review = sample.review;
    if (!review || !authority.reviewers.includes(review.reviewer) ||
        (review.source === "calibrated-reviewer" && !authority.calibrations.includes(review.calibrationId ?? ""))) {
      reject("reviewer_not_authorized"); continue;
    }
    if (evaluation.digest === null || editorialDecision({ status: evaluation.mechanicalPass ? "needs_editorial_review" : "rejected",
      findings: evaluation.findings, rubricVersion: RUBRIC_VERSION }, review, evaluation.digest, candidate.tier) !== "approved")
      reject(`editorial_review:${sample.caseId}`);
  }
  return { policyVersion: PROMOTION_POLICY_VERSION, status: reasons.size ? "blocked" : "eligible-for-release",
    reasons: [...reasons] } as const;
}

/** No runtime model/prompt has been homologated. A feature flag cannot modify this registry. */
export const promotedModels: readonly Readonly<{
  promotionId: string; capability: Capability; tier: Tier; provider: string; model: string;
  resolvedModel: string; promptVersion: string; evidenceDigest: string;
}>[] = Object.freeze([]);
