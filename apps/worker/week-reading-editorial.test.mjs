import test from "node:test";
import assert from "node:assert/strict";
import { CaelusEphemerisProvider } from "@atv/astrology";
import { WORKFLOW_VERSION } from "@atv/domain";
import { createWeekReadingCalculators } from "./src/week-reading-calculators.ts";
import { validWeekReadingProjection } from "./src/week-reading-projection.ts";
import { validateCalculation } from "./src/product-processing.ts";
import {
  prepareProductFacts,
  evaluateProductDraft,
  PRODUCT_EDITORIAL_VERSION,
} from "./src/product-editorial.ts";
import {
  validateFacts,
  tierLimits,
  WEEK_READING_EDITORIAL_VERSION,
} from "../../packages/ai/src/index.ts";
import { weekReadingEditorialTestFixture } from "../../scripts/helpers/week-reading-editorial-test-fixture.mjs";

const provider = new CaelusEphemerisProvider();
let calls = 0;
const calculation = await createWeekReadingCalculators({
  name: provider.name,
  version: provider.version,
  async calculate(input) {
    calls++;
    return provider.calculate(input);
  },
})["week-reading"](
  {
    version: WORKFLOW_VERSION,
    productId: "week-reading",
    targetDate: "2026-09-29",
    birth: {
      localDateTime: "2000-01-01T12:00:00",
      utcInstant: "2000-01-01T12:00:00Z",
      timezone: "UTC",
      latitude: 0,
      longitude: 0,
      locationSource: "synthetic-week-editorial",
    },
    consent: {
      storage: true,
      partner: false,
      continuity: false,
      policyVersion: "atv-input-consent/1",
    },
    context: "  Relato consentido.\n",
  },
  {
    runId: "00000000-0000-4000-8000-000000000001",
    signal: new AbortController().signal,
  },
);

test("coherent Week uses its trusted profile without widening the generic budget or truncating facts", () => {
  const original = structuredClone(calculation);
  assert.equal(
    PRODUCT_EDITORIAL_VERSION,
    "atv-product-editorial-evidence/1.33.0",
  );
  assert.equal(calls, 8);
  assert.equal(calculation.facts.length, 89);
  assert.equal(validWeekReadingProjection(calculation), true);
  assert.ok(validateCalculation(calculation, "week-reading"));
  const prepared = prepareProductFacts("week-reading", calculation);
  assert.equal(prepared.status, "prepared");
  assert.equal(prepared.facts.editorialProfile, WEEK_READING_EDITORIAL_VERSION);
  assert.deepEqual(prepared.facts.facts, calculation.facts);
  assert.equal(validateFacts(prepared.facts), true);
  assert.deepEqual(calculation, original);
  assert.equal(calls, 8);
  assert.equal(
    validateFacts({
      version: "atv-facts/1.0.0",
      capability: "cycle-context",
      completeness: "partial",
      facts: calculation.facts,
    }),
    false,
  );
  assert.equal(tierLimits.free.maxOutputTokens, 1400);
});

test("Week guard sees original metadata erased by generic fact normalization", async (t) => {
  for (const [name, mutate] of [
    ["extra undefined fact field", (v) => (v.facts[0].extra = undefined)],
    ["extra fact field", (v) => (v.facts[0].editorialProfile = "invented")],
    [
      "non-enumerable original fact metadata",
      (v) => Object.defineProperty(v.facts[0], "extra", { value: "hidden" }),
    ],
    [
      "symbol original fact metadata",
      (v) => (v.facts[0][Symbol("extra")] = true),
    ],
  ])
    await t.test(name, () => {
      const changed = structuredClone(calculation);
      mutate(changed);
      const normalized = validateCalculation(changed, "week-reading");
      assert.ok(
        normalized,
        "generic storage guard permits this normalized shape",
      );
      assert.equal(validWeekReadingProjection(normalized), true);
      assert.equal(validWeekReadingProjection(changed), false);
      assert.deepEqual(prepareProductFacts("week-reading", changed), {
        status: "blocked",
        reason: "calculation_invalid",
      });
    });
});

test("Week preparation rejects changed range, child, provenance, source, geometry and limits before editorial budget", async (t) => {
  for (const [name, mutate] of [
    ["invented top metadata", (v) => (v.extra = undefined)],
    ["wrong range", (v) => (v.data.endDate = "2026-10-06")],
    ["missing day", (v) => v.data.samples.pop()],
    ["reordered dates", (v) => v.data.samples.reverse()],
    ["wrong contract", (v) => (v.data.projection.days = 8)],
    [
      "changed natal",
      (v) => (v.data.samples[1].data.first.positions[0].longitude += 1),
    ],
    [
      "changed sample provenance",
      (v) =>
        (v.data.samples[2].data.second.provenance.engineVersion = "changed"),
    ],
    ["wrong fact source", (v) => (v.facts[11].source = "input.context")],
    ["relabelled fact", (v) => (v.facts[11].kind = "reported")],
    ["missing fact", (v) => v.facts.splice(11, 1)],
    ["altered context", (v) => (v.data.declaredContext = "invented")],
    ["missing limitation", (v) => v.limits.pop()],
    ["invented windows", (v) => v.data.windows.push("favorable")],
  ])
    await t.test(name, () => {
      const changed = structuredClone(calculation);
      mutate(changed);
      assert.deepEqual(prepareProductFacts("week-reading", changed), {
        status: "blocked",
        reason: "calculation_invalid",
      });
    });
  assert.equal(calls, 8);
});

test("offline Director rejects invalid Week output and corrupt originals without provider work", async () => {
  const draft = {
    runId: "00000000-0000-4000-8000-000000000001",
    revision: 0,
    productId: "week-reading",
    tier: "free",
    calculation,
    output: {},
  };
  const result = await evaluateProductDraft(draft);
  assert.equal(result.reason, "invalid_schema");
  assert.equal(result.status, "rejected");
  assert.equal(result.publication, "blocked");
  assert.equal(result.basisDigest, null);
  const changed = structuredClone(calculation);
  changed.facts[0].extra = undefined;
  assert.equal(
    (await evaluateProductDraft({ ...draft, calculation: changed })).reason,
    "calculation_invalid",
  );
  assert.equal(calls, 8);
});

test("offline Week fixture preserves all facts, profile and basis digest but cannot publish", async () => {
  const prepared = prepareProductFacts("week-reading", calculation);
  assert.equal(prepared.status, "prepared");
  const output = weekReadingEditorialTestFixture(prepared.facts);
  const result = await evaluateProductDraft({
    runId: "00000000-0000-4000-8000-000000000001",
    revision: 0,
    productId: "week-reading",
    tier: "free",
    calculation,
    output,
  });
  assert.equal(result.status, "needs_editorial_review");
  assert.equal(result.publication, "blocked");
  assert.match(result.basisDigest, /^[a-f0-9]{64}$/);
  const changed = structuredClone(output);
  changed.claims[2].evidence = changed.claims[1].evidence;
  const rejected = await evaluateProductDraft({
    runId: "00000000-0000-4000-8000-000000000001",
    revision: 0,
    productId: "week-reading",
    tier: "free",
    calculation,
    output: changed,
  });
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.publication, "blocked");
  assert.equal(calls, 8);
});
