import { test } from "node:test";
import assert from "node:assert/strict";
import { WORKFLOW_VERSION } from "@atv/domain";
import {
  createDirectionJourneyCalculators,
  directionJourneyContract,
  validDirectionJourneyProjection,
} from "./src/direction-journey-calculators.ts";
import {
  createProductCalculators,
  createProductProcessor,
  productCalculationCoverage,
} from "./src/product-runtime.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";
import { validateCalculation } from "./src/product-processing.ts";

const input = (startDate = "2028-02-28") => ({
  version: WORKFLOW_VERSION,
  productId: "direction-journey",
  consent: { storage: true, policyVersion: "atv-input-consent/1", partner: false, continuity: false },
  journey: { goal: "Explorar uma direção profissional possível", startDate },
});
const context = () => ({ runId: "synthetic", signal: new AbortController().signal });

test("declared goal yields only a 30-day civil scaffold, including leap day", async () => {
  const calc = createDirectionJourneyCalculators()["direction-journey"];
  const value = await calc(input(), context());
  assert.equal(value.version, directionJourneyContract.version);
  assert.equal(value.status, "experimental");
  assert.deepEqual(value.data.milestones, [
    { day: 7, date: "2028-03-05" },
    { day: 14, date: "2028-03-12" },
    { day: 30, date: "2028-03-28" },
  ]);
  assert.equal(value.data.reading, "not-produced");
  assert.equal(value.data.checkIns, "not-recorded");
  assert.ok(validDirectionJourneyProjection(value));
  const jsonbOrder = {
    ...value,
    data: Object.fromEntries(Object.entries(value.data).reverse()),
  };
  assert.ok(validDirectionJourneyProjection(jsonbOrder));
  assert.ok(validateCalculation(value, "direction-journey"));
  assert.deepEqual(prepareProductFacts("direction-journey", value), {
    status: "blocked", reason: "insufficient_facts",
  });
  const yearEnd = await calc(input("2099-12-02"), context());
  assert.equal(yearEnd.data.milestones[2].date, "2099-12-31");
});

test("persisted projection rejects changed dates, claims, reported facts and extra fields", async () => {
  const value = await createDirectionJourneyCalculators()["direction-journey"](
    { ...input(), context: "Quero testar sem sair do trabalho atual." }, context());
  assert.ok(validDirectionJourneyProjection(value));
  for (const changed of [
    { ...value, data: { ...value.data, milestones: [{ day: 7, date: "2028-03-06" }, ...value.data.milestones.slice(1)] } },
    { ...value, data: { ...value.data, reading: "approved" } },
    { ...value, facts: value.facts.map((fact, index) => index ? fact : { ...fact, display: "Outra meta" }) },
    { ...value, facts: [...value.facts, { id: "fabricated", kind: "calculated", display: "Resultado", source: "test" }] },
    { ...value, limits: [] },
  ]) {
    assert.equal(validDirectionJourneyProjection(changed), false);
    assert.deepEqual(prepareProductFacts("direction-journey", changed), {
      status: "blocked", reason: "calculation_invalid",
    });
  }
});

test("direction journey needs separate internal opt-in and processor allowlist", () => {
  const rpc = async () => assert.fail("unselected transport contacted");
  assert.equal(createProductCalculators()["direction-journey"], undefined);
  assert.equal(productCalculationCoverage().find((p) => p.productId === "direction-journey").calculation, "unavailable");
  assert.throws(() => createProductCalculators({ experimentalDirectionJourneyBase: false }), /invalid_product_configuration/);
  assert.throws(() => createProductProcessor(rpc, { enabledProducts: ["direction-journey"] }), /invalid_product_configuration/);
  assert.equal(typeof createProductCalculators({ experimentalDirectionJourneyBase: true })["direction-journey"], "function");
  const processor = createProductProcessor(rpc, {
    experimentalDirectionJourneyBase: true,
    enabledProducts: ["direction-journey"],
  });
  assert.deepEqual(processor.products, ["direction-journey"]);
});
