import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createPersonalCalendarCalculators,
  personalCalendarProductContract,
} from "./src/personal-calendar-calculators.ts";
import {
  createProductCalculators,
  createProductProcessor,
} from "./src/product-runtime.ts";
import {
  prepareProductFacts,
  evaluateProductDraft,
} from "./src/product-editorial.ts";

const input = {
  version: "atv-workflow/1.0.0",
  productId: "personal-calendar",
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: false,
    continuity: false,
  },
  birth: {
    localDateTime: "2000-09-09T12:00:00",
    utcInstant: "2000-09-09T15:00:00Z",
    timezone: "America/Sao_Paulo",
    latitude: -23.5,
    longitude: -46.6,
    locationSource: "synthetic",
  },
  targetDate: "2026-09-01",
  context: "Anotação sintética do usuário.",
};
const scope = () => ({
  runId: "synthetic",
  signal: new AbortController().signal,
});

test("calendar has a complete bounded month, a sourced static natal reference, and no predicted events", async () => {
  const result = await createPersonalCalendarCalculators()["personal-calendar"](
    input,
    scope(),
  );
  assert.equal(result.version, personalCalendarProductContract.version);
  assert.equal(result.status, "experimental");
  assert.equal(result.data.monthStart, "2026-09-01");
  assert.equal(result.data.monthEndExclusive, "2026-10-01");
  assert.equal(result.data.dates.length, 30);
  assert.equal(result.data.dates[0], "2026-09-01");
  assert.equal(result.data.dates.at(-1), "2026-09-30");
  assert.match(result.facts[0].source, /caelus.*atv-personal-calendar/i);
  assert.equal(
    result.facts.filter((fact) => fact.id.startsWith("civil-day-")).length,
    30,
  );
  assert.equal(
    result.facts.find((fact) => fact.id === "reported-context").kind,
    "reported",
  );
  assert.equal(result.data.dailyEvents, "not-produced");
  assert.ok(
    result.limits.some((limit) => limit.includes("Nenhum trânsito diário")),
  );
  assert.deepEqual(prepareProductFacts("personal-calendar", result), {
    status: "blocked",
    reason: "insufficient_facts",
  });
  const forged = {
    ...result,
    version: "atv-personal-calendar-calculation/9.9.9",
    facts: [
      ...result.facts,
      {
        id: "best-day",
        kind: "calculated",
        display: "Melhor dia",
        source: "unsupported",
      },
    ],
  };
  assert.equal(
    prepareProductFacts("personal-calendar", forged).reason,
    "insufficient_facts",
  );
  const assessed = await evaluateProductDraft({
    runId: "00000000-0000-4000-8000-000000000001",
    revision: 1,
    productId: "personal-calendar",
    tier: "premium",
    calculation: result,
    output: {},
  });
  assert.equal(assessed.status, "rejected");
  assert.equal(assessed.reason, "insufficient_facts");
});

test("calendar includes February's leap day and never reaches into the following month", async () => {
  const calculate = createPersonalCalendarCalculators()["personal-calendar"];
  const leap = await calculate({ ...input, targetDate: "2028-02-01" }, scope());
  const ordinary = await calculate(
    { ...input, targetDate: "2027-02-01" },
    scope(),
  );
  const long = await calculate({ ...input, targetDate: "2026-12-01" }, scope());
  assert.equal(leap.data.dates.length, 29);
  assert.equal(leap.data.dates.at(-1), "2028-02-29");
  assert.equal(ordinary.data.dates.length, 28);
  assert.equal(ordinary.data.dates.at(-1), "2027-02-28");
  assert.equal(long.data.dates.length, 31);
  assert.equal(long.data.monthEndExclusive, "2027-01-01");
});

test("calendar rejects an ambiguous period before contacting the ephemeris", async () => {
  let calls = 0;
  const calculate = createPersonalCalendarCalculators({
    calculate: async () => {
      calls++;
      throw Error("unexpected provider call");
    },
  })["personal-calendar"];
  await assert.rejects(
    calculate({ ...input, targetDate: "2026-09-02" }, scope()),
    /input_invalid/,
  );
  assert.equal(calls, 0);
});

test("calendar registration needs explicit experimental opt-in and a separate processor allowlist", async () => {
  const rpc = async () => assert.fail("unselected transport contacted");
  assert.equal(createProductCalculators()["personal-calendar"], undefined);
  assert.throws(
    () => createProductCalculators({ experimentalPersonalCalendarBase: false }),
    /invalid_product_configuration/,
  );
  assert.throws(
    () =>
      createProductProcessor(rpc, { enabledProducts: ["personal-calendar"] }),
    /invalid_product_configuration/,
  );
  const calculators = createProductCalculators({
    experimentalPersonalCalendarBase: true,
  });
  assert.equal(typeof calculators["personal-calendar"], "function");
  const unselected = createProductProcessor(rpc, {
    experimentalPersonalCalendarBase: true,
  });
  assert.equal(await unselected.step(), "idle");
});
