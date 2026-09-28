import { createHash } from "node:crypto";
import { SCHEMA_VERSION, tierLimits, type Tier } from "../contracts.ts";
import { RUBRIC_VERSION, inspectReading } from "../director.ts";
import { parseReading } from "../schema.ts";
import { DATASET_VERSION, labCases } from "./dataset.ts";
import type { LabCase } from "./dataset.ts";

export const BENCHMARK_POLICY_VERSION = "atv-benchmark/1.2.0";
export interface CostEvidence {
  basis: "owner-confirmed-free-tier" | "provider-receipt";
  /** Opaque repository evidence ID, verified by the release operator; no raw receipts or secrets. */
  reference: string;
}
export interface BenchmarkSample {
  promptVersion: string;
  caseId: string;
  model: string;
  repetition: number;
  output: unknown;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  tier?: Tier;
  costBrl?: number | null;
  costEvidence?: CostEvidence;
}
const validTokens = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function evaluateSample(sample: BenchmarkSample, corpus?: { version: string; cases: readonly LabCase[] }) {
  const item = (corpus?.cases ?? labCases).find((c) => c.id === sample.caseId);
  if (!item) throw new Error("Unknown synthetic case");
  const tier = sample.tier ?? item.request.tier;
  const limits = Object.hasOwn(tierLimits, tier) ? tierLimits[tier] : null;
  // Freeze the JSON representation once so validation and review digests cannot observe different outputs.
  // Preserve the historical JSON.stringify digest contract for both objects and JSON strings.
  let encoded: string | null = null;
  let snapshot: unknown;
  try {
    const value = JSON.stringify(sample.output);
    if (typeof value === "string") { snapshot = JSON.parse(value); encoded = value; }
  } catch { /* Non-JSON outputs are rejected evidence, not a crashed benchmark batch. */ }
  const reading = encoded !== null && limits ? parseReading(snapshot, tier) : null;
  const review = reading ? inspectReading(reading, item.request.facts) : null;
  const inputTokens = validTokens(sample.inputTokens) ? sample.inputTokens : null;
  const outputTokens = validTokens(sample.outputTokens) ? sample.outputTokens : null;
  const tokenUsageKnown = inputTokens !== null && outputTokens !== null;
  const evidence = sample.costEvidence;
  const costKnown = typeof sample.costBrl === "number" && Number.isFinite(sample.costBrl) && sample.costBrl >= 0 &&
    !!evidence && Object.keys(evidence).length === 2 &&
    typeof evidence.reference === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$/.test(evidence.reference) &&
    (evidence.basis === "provider-receipt" || (evidence.basis === "owner-confirmed-free-tier" && sample.costBrl === 0));
  return {
    policyVersion: BENCHMARK_POLICY_VERSION,
    caseId: sample.caseId,
    model: sample.model,
    repetition: sample.repetition,
    dataset: corpus?.version ?? DATASET_VERSION,
    prompt: sample.promptVersion,
    schema: SCHEMA_VERSION,
    rubric: RUBRIC_VERSION,
    outputSerialization: encoded === null ? "unserializable" as const : "serialized" as const,
    digest: encoded === null ? null : createHash("sha256").update(encoded).digest("hex"),
    schemaPass: Boolean(reading),
    mechanicalPass: review?.status === "needs_editorial_review",
    findings: review?.findings ?? [
      { code: "invalid_schema", location: "root" },
    ],
    editorialStatus: "not_calibrated" as const,
    latencyMs: sample.latencyMs,
    latencyPass: !!limits && Number.isFinite(sample.latencyMs) && sample.latencyMs >= 0 && sample.latencyMs <= limits.timeoutMs,
    tokenUsageKnown,
    tokenUsagePass: tokenUsageKnown && !!limits && outputTokens <= limits.maxOutputTokens,
    inputTokens,
    outputTokens,
    outputChars: encoded?.length ?? null,
    costKnown,
    costBrl: costKnown ? sample.costBrl! : null,
    costBasis: costKnown ? evidence!.basis : "unknown" as const,
    costEvidenceReference: costKnown ? evidence!.reference : null,
  };
}
