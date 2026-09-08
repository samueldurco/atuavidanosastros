import { createHash } from "node:crypto";
import { SCHEMA_VERSION, tierLimits } from "../contracts.ts";
import { RUBRIC_VERSION, inspectReading } from "../director.ts";
import { parseReading } from "../schema.ts";
import { DATASET_VERSION, labCases } from "./dataset.ts";

export interface BenchmarkSample {
  promptVersion: string;
  caseId: string;
  model: string;
  repetition: number;
  output: unknown;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
}
export function evaluateSample(sample: BenchmarkSample) {
  const item = labCases.find((c) => c.id === sample.caseId);
  if (!item) throw new Error("Unknown synthetic case");
  const reading = parseReading(sample.output, item.request.tier);
  const review = reading ? inspectReading(reading, item.request.facts) : null;
  return {
    caseId: sample.caseId,
    model: sample.model,
    repetition: sample.repetition,
    dataset: DATASET_VERSION,
    prompt: sample.promptVersion,
    schema: SCHEMA_VERSION,
    rubric: RUBRIC_VERSION,
    digest: createHash("sha256")
      .update(JSON.stringify(sample.output))
      .digest("hex"),
    schemaPass: Boolean(reading),
    mechanicalPass: review?.status === "needs_editorial_review",
    findings: review?.findings ?? [
      { code: "invalid_schema", location: "root" },
    ],
    editorialStatus: "not_calibrated" as const,
    latencyMs: sample.latencyMs,
    latencyPass: sample.latencyMs <= tierLimits[item.request.tier].timeoutMs,
    tokenUsageKnown:
      sample.inputTokens !== null && sample.outputTokens !== null,
    inputTokens: sample.inputTokens,
    outputTokens: sample.outputTokens,
    outputChars: JSON.stringify(sample.output)?.length ?? 0,
    costBrl: 0,
    costBasis: "owner-confirmed-free-tier" as const,
  };
}
