import test from "node:test";
import assert from "node:assert/strict";
import {
  createProductCalculators,
  createProductProcessor,
  productCalculationCoverage,
} from "./src/product-runtime.ts";
import { createNatalCalculators } from "./src/natal-calculators.ts";
import {
  createLifeAtlasCalculators,
  inspectLifeAtlasProjection,
  lifeAtlasContract,
} from "./src/life-atlas-calculators.ts";
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
const priorities = ["Trabalho", "Vínculos", "Rotina", "Descanso"];
const input = (latitude = 0) => ({
  version: "atv-workflow/1.0.0",
  productId: "life-atlas",
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: false,
    continuity: false,
  },
  birth: { ...birth, latitude },
  atlas: { priorities: [...priorities] },
  context: "Contexto sintético declarado pela pessoa",
});
const scope = () => ({
  runId: "synthetic",
  signal: new AbortController().signal,
});

test("Atlas is opt-in and the processor still needs a separate allowlist", () => {
  assert.equal(createProductCalculators()["life-atlas"], undefined);
  assert.equal(
    productCalculationCoverage().find((item) => item.productId === "life-atlas")
      ?.calculation,
    "unavailable",
  );
  assert.throws(
    () => createProductCalculators({ experimentalLifeAtlasBase: false }),
    /invalid_product_configuration/,
  );
  assert.throws(
    () =>
      createProductProcessor(async () => null, {
        enabledProducts: ["life-atlas"],
      }),
    /invalid_product_configuration/,
  );
  assert.equal(
    typeof createProductCalculators({ experimentalLifeAtlasBase: true })[
      "life-atlas"
    ],
    "function",
  );
  assert.deepEqual(
    createProductProcessor(async () => null, {
      experimentalLifeAtlasBase: true,
    }).products,
    [],
  );
});

test("Atlas preserves the entire validated natal projection and reports exactly four priorities", async () => {
  const value = await createLifeAtlasCalculators()["life-atlas"](
    input(),
    scope(),
  );
  const natalInput = input();
  natalInput.productId = "birth-chart";
  delete natalInput.atlas;
  const natal = await createNatalCalculators()["birth-chart"](
    natalInput,
    scope(),
  );
  assert.ok(validateCalculation(value, "life-atlas"));
  assert.equal(value.version, lifeAtlasContract.version);
  const embedded = structuredClone(value.data.natal);
  const direct = structuredClone(natal);
  delete embedded.data.provenance.calculatedAt;
  delete direct.data.provenance.calculatedAt;
  assert.deepEqual(embedded, direct);
  assert.deepEqual(value.data.priorities, priorities);
  assert.deepEqual(value.facts.slice(0, natal.facts.length), natal.facts);
  assert.deepEqual(
    value.facts.slice(natal.facts.length),
    priorities.map((priority, index) => ({
      id: `priority-${index + 1}`,
      kind: "reported",
      display: `Prioridade ${index + 1}: ${priority}`,
      source: `input.atlas.priorities[${index}]`,
    })),
  );
  assert.equal(value.data.projection.connection, "not-assessed");
  assert.equal(value.data.projection.path, "not-produced");
  assert.equal(inspectLifeAtlasProjection(value), "available");
  assert.deepEqual(prepareProductFacts("life-atlas", value), {
    status: "blocked",
    reason: "insufficient_facts",
  });
});

test("polar natal base remains unavailable and no replacement houses are invented", async () => {
  const value = await createLifeAtlasCalculators()["life-atlas"](
    input(90),
    scope(),
  );
  assert.equal(value.data.natal.data.houses.status, "not-applicable");
  assert.deepEqual(value.data.natal.data.houses.cusps, []);
  assert.equal(inspectLifeAtlasProjection(value), "unavailable");
  assert.deepEqual(prepareProductFacts("life-atlas", value), {
    status: "blocked",
    reason: "insufficient_facts",
  });
});

test("invalid Atlas intake is refused before the provider and forged projections fail closed", async () => {
  let calls = 0;
  const calculate = createLifeAtlasCalculators({
    async calculate() {
      calls++;
      assert.fail("provider called");
    },
  })["life-atlas"];
  for (const invalid of [
    { ...input(), consent: { ...input().consent, storage: false } },
    {
      ...input(),
      atlas: { priorities: ["Trabalho", "Trabalho", "Rotina", "Descanso"] },
    },
    { ...input(), birth: { ...birth, utcInstant: "2000-01-01T13:00:00Z" } },
    { ...input(), productId: "birth-chart" },
  ])
    await assert.rejects(() => calculate(invalid, scope()), /input_invalid/);
  assert.equal(calls, 0);

  const base = await createLifeAtlasCalculators()["life-atlas"](
    input(),
    scope(),
  );
  for (const mutate of [
    (value) => {
      value.data.priorities[0] = "Outra";
    },
    (value) => {
      value.data.natal.data.positions[0].longitude = 360;
    },
    (value) => {
      value.facts.at(-1).display = "Inventado";
    },
    (value) => {
      value.data.projection.connection = "assessed";
    },
    (value) => {
      value.data.natal.data.provenance.contract.productionPromotion = true;
    },
    (value) => {
      value.facts.push({
        id: "plan",
        kind: "calculated",
        display: "Plano",
        source: "invented",
      });
    },
  ]) {
    const forged = structuredClone(base);
    mutate(forged);
    assert.equal(inspectLifeAtlasProjection(forged), null);
    assert.deepEqual(prepareProductFacts("life-atlas", forged), {
      status: "blocked",
      reason: "calculation_invalid",
    });
  }
});
