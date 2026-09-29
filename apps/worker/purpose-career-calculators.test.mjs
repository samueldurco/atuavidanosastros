import test from "node:test";
import assert from "node:assert/strict";
import { CaelusEphemerisProvider } from "@atv/astrology";
import {
  createProductCalculators,
  createProductProcessor,
} from "./src/product-runtime.ts";
import {
  createPurposeCareerCalculators,
  inspectPurposeCareerProjection,
  purposeCareerContract,
} from "./src/purpose-career-calculators.ts";
import { validateCalculation } from "./src/product-processing.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";

const birth = {
  localDateTime: "2000-01-01T12:00:00",
  utcInstant: "2000-01-01T12:00:00Z",
  timezone: "UTC",
  latitude: 0,
  longitude: 0,
  locationSource: "synthetic",
};
const input = (latitude = 0) => ({
  version: "atv-workflow/1.0.0",
  productId: "purpose-career",
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: false,
    continuity: false,
  },
  birth: { ...birth, latitude },
  context: "Contexto profissional sintético",
});
const scope = () => ({
  runId: "synthetic",
  signal: new AbortController().signal,
});

test("purpose-career is internal opt-in and still needs a separate processing allowlist", () => {
  assert.equal(createProductCalculators()["purpose-career"], undefined);
  assert.throws(
    () => createProductCalculators({ experimentalPurposeCareerBase: false }),
    /invalid_product_configuration/,
  );
  assert.throws(
    () =>
      createProductProcessor(async () => assert.fail("RPC"), {
        enabledProducts: ["purpose-career"],
      }),
    /invalid_product_configuration/,
  );
  const calculators = createProductCalculators({
    experimentalPurposeCareerBase: true,
  });
  assert.equal(typeof calculators["purpose-career"], "function");
  assert.deepEqual(
    createProductProcessor(async () => null, {
      experimentalPurposeCareerBase: true,
    }).products,
    [],
  );
});

test("MC and house 2/6/10 are exact bounded projections of one validated chart", async () => {
  const chart = await new CaelusEphemerisProvider().calculate(birth);
  assert.equal(chart.houses.status, "ok");
  const value = await createPurposeCareerCalculators()["purpose-career"](
    input(),
    scope(),
  );
  assert.ok(validateCalculation(value, "purpose-career"));
  assert.equal(value.version, purposeCareerContract.version);
  assert.deepEqual(value.data.angles, {
    ascendant: null,
    midheaven: chart.houses.midheaven,
  });
  assert.deepEqual(value.data.positions, []);
  assert.deepEqual(
    value.data.houses.cusps,
    [2, 6, 10].map((house) => ({
      house,
      longitude: chart.houses.cusps[house - 1],
    })),
  );
  assert.deepEqual(
    value.facts.map((fact) => fact.id),
    ["angle-midheaven", "house-2", "house-6", "house-10", "personal-context"],
  );
  assert.equal(value.facts.at(-1).kind, "reported");
  assert.equal(inspectPurposeCareerProjection(value), "available");
  assert.deepEqual(prepareProductFacts("purpose-career", value), {
    status: "blocked",
    reason: "insufficient_facts",
  });
});

test("unavailable Placidus omits all cusps and remains unavailable for editorial", async () => {
  const value = await createPurposeCareerCalculators()["purpose-career"](
    input(90),
    scope(),
  );
  assert.equal(value.data.houses.status, "not-applicable");
  assert.deepEqual(value.data.houses.cusps, []);
  assert.deepEqual(
    value.facts.map((fact) => fact.id),
    ["angle-midheaven", "personal-context"],
  );
  assert.equal(inspectPurposeCareerProjection(value), "unavailable");
  assert.deepEqual(prepareProductFacts("purpose-career", value), {
    status: "blocked",
    reason: "insufficient_facts",
  });
});

test("invalid input is refused before the provider and forged persisted geometry fails closed", async () => {
  let calls = 0;
  const calculate = createPurposeCareerCalculators({
    async calculate() {
      calls++;
      assert.fail("provider called");
    },
  })["purpose-career"];
  for (const invalid of [
    { ...input(), consent: { ...input().consent, storage: false } },
    { ...input(), birth: { ...birth, utcInstant: "2000-01-01T13:00:00Z" } },
    { ...input(), productId: "career-compass" },
  ])
    await assert.rejects(() => calculate(invalid, scope()), /input_invalid/);
  assert.equal(calls, 0);
  const base = await createPurposeCareerCalculators()["purpose-career"](
    input(),
    scope(),
  );
  for (const mutate of [
    (value) => value.data.houses.cusps.splice(1, 1),
    (value) => (value.data.houses.cusps[0].house = 1),
    (value) => (value.data.houses.cusps[0].longitude = 360),
    (value) => (value.facts[1].display = "invented"),
    (value) => (value.data.projection.interpretation = "produced"),
    (value) => (value.data.provenance.contract.productionPromotion = true),
    (value) =>
      value.facts.push({
        id: "career-promise",
        kind: "calculated",
        display: "Promessa",
        source: "invented",
      }),
  ]) {
    const forged = structuredClone(base);
    mutate(forged);
    assert.equal(inspectPurposeCareerProjection(forged), null);
    assert.deepEqual(prepareProductFacts("purpose-career", forged), {
      status: "blocked",
      reason: "calculation_invalid",
    });
  }
});
