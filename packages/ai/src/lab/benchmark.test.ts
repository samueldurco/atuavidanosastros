import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { BENCHMARK_POLICY_VERSION, evaluateSample, type BenchmarkSample } from "./benchmark.ts";
import { goldenSeed } from "./dataset.ts";
import { PROMPT_VERSION, tierLimits } from "../contracts.ts";

test("baseline externo é reproduzível e não confunde schema, fatos, latência e promoção", () => {
  const run = JSON.parse(
    readFileSync(
      new URL(
        "../../../../docs/intelligence/benchmarks/2026-09-08-baseline.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as { dataClass: string; samples: BenchmarkSample[] };
  assert.equal(run.dataClass, "synthetic");
  const rows = run.samples.map((sample) => evaluateSample(sample));
  assert.ok(rows.length >= 10);
  assert.ok(rows.every((r) => r.editorialStatus === "not_calibrated"));
  assert.ok(rows.every((r) => !r.tokenUsageKnown));
  assert.ok(rows.every((r) => !r.costKnown && r.costBrl === null && r.costBasis === "unknown"));
  const paraphrase = rows.find(
    (r) =>
      r.model === "gemini-3.1-flash-lite" &&
      r.caseId === "purpose-single" &&
      r.repetition === 1,
  )!;
  assert.equal(paraphrase.schemaPass, true);
  assert.equal(paraphrase.mechanicalPass, false);
  assert.ok(paraphrase.findings.some((f) => f.code === "altered_fact"));
  const slow = rows.find(
    (r) =>
      r.model === "gemini-3.5-flash-lite" &&
      r.caseId === "purpose-single" &&
      r.repetition === 1,
  )!;
  assert.equal(slow.mechanicalPass, true);
  assert.equal(slow.latencyPass, false);
});

const sample = (): BenchmarkSample => ({
  caseId: "purpose-single", model: "synthetic-only", repetition: 1,
  promptVersion: PROMPT_VERSION, output: goldenSeed, latencyMs: 100,
  inputTokens: 1800, outputTokens: 800,
});

test("benchmark never infers zero cost without bounded explicit evidence", () => {
  const base = sample();
  const missing = evaluateSample(base);
  assert.equal(missing.policyVersion, BENCHMARK_POLICY_VERSION);
  assert.equal(missing.costKnown, false);
  assert.equal(missing.costBrl, null);
  assert.equal(missing.costEvidenceReference, null);
  const evidence = { basis: "owner-confirmed-free-tier" as const, reference: "synthetic-cost-only" };
  const free = evaluateSample({ ...base, costBrl: 0, costEvidence: evidence });
  assert.equal(free.costKnown, true);
  assert.equal(free.costBrl, 0);
  assert.equal(free.costBasis, evidence.basis);
  assert.equal(free.costEvidenceReference, evidence.reference);
  for (const costBrl of [undefined, null, NaN, Infinity, -1, 0.01]) {
    const row = evaluateSample({ ...base, costBrl, costEvidence: evidence } as BenchmarkSample);
    assert.equal(row.costKnown, false);
    assert.equal(row.costBrl, null);
  }
  for (const costEvidence of [undefined, { ...evidence, reference: " " },
    { ...evidence, reference: "https://example.test/private" }, { ...evidence, reference: "x".repeat(121) },
    { ...evidence, basis: "invented" }, { ...evidence, rawReceipt: "not allowed" }]) {
    const row = evaluateSample({ ...base, costBrl: 0, costEvidence } as BenchmarkSample);
    assert.equal(row.costKnown, false);
    assert.equal(row.costBasis, "unknown");
    assert.equal(row.costEvidenceReference, null);
  }
  for (const costBrl of [0, 0.01]) {
    const row = evaluateSample({ ...base, costBrl, costEvidence: { ...evidence, basis: "provider-receipt" } });
    assert.equal(row.costKnown, true);
    assert.equal(row.costBrl, costBrl);
  }
});

test("token and latency metrics fail closed for missing, invalid and out-of-budget values", () => {
  const base = sample();
  assert.equal(evaluateSample(base).tokenUsagePass, true);
  for (const field of ["inputTokens", "outputTokens"] as const) {
    for (const value of [undefined, null, NaN, Infinity, -1, 0.1, Number.MAX_SAFE_INTEGER + 1]) {
      const row = evaluateSample({ ...base, [field]: value });
      assert.equal(row.tokenUsageKnown, false);
      assert.equal(row.tokenUsagePass, false);
      assert.equal(row[field], null);
    }
  }
  const over = evaluateSample({ ...base, outputTokens: tierLimits.free.maxOutputTokens + 1 });
  assert.equal(over.tokenUsageKnown, true);
  assert.equal(over.tokenUsagePass, false);
  for (const latencyMs of [NaN, Infinity, -1, tierLimits.free.timeoutMs + 1])
    assert.equal(evaluateSample({ ...base, latencyMs }).latencyPass, false);
  for (const tier of ["invalid", "toString"])
    assert.equal(evaluateSample({ ...base, tier: tier as never }).latencyPass, false);
});

test("non-JSON outputs reject safely without fabricated digests or raw exception messages", () => {
  const cycle: Record<string, unknown> = {}; cycle.self = cycle;
  for (const output of [undefined, Symbol("fixture"), () => undefined, 1n, cycle,
    { toJSON() { throw new Error("private fixture error"); } }]) {
    const row = evaluateSample({ ...sample(), output });
    assert.equal(row.outputSerialization, "unserializable");
    assert.equal(row.digest, null);
    assert.equal(row.outputChars, null);
    assert.equal(row.schemaPass, false);
    assert.equal(row.mechanicalPass, false);
    assert.deepEqual(row.findings, [{ code: "invalid_schema", location: "root" }]);
    assert.ok(!JSON.stringify(row).includes("private fixture error"));
  }
  const malformed = evaluateSample({ ...sample(), output: "not json" });
  assert.equal(malformed.outputSerialization, "serialized");
  assert.equal(malformed.schemaPass, false);
  assert.match(malformed.digest!, /^[a-f0-9]{64}$/);
});

test("one immutable snapshot drives schema, mechanical checks, character count and digest", () => {
  const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  let calls = 0;
  const output = { toJSON() { calls++; return calls === 1 ? goldenSeed : { changed: true }; } };
  const row = evaluateSample({ ...sample(), output });
  assert.equal(calls, 1);
  assert.equal(row.schemaPass, true);
  assert.equal(row.mechanicalPass, true);
  assert.equal(row.digest, digest(goldenSeed));
  assert.equal(row.outputChars, JSON.stringify(goldenSeed).length);
  // Historical object/string digest representations remain distinct and stable.
  for (const value of [goldenSeed, JSON.stringify(goldenSeed)]) {
    const report = evaluateSample({ ...sample(), output: value });
    assert.equal(report.digest, digest(value));
    assert.equal(report.schemaPass, true);
  }
});
