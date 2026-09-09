import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { evaluateSample, type BenchmarkSample } from "./benchmark.ts";

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
