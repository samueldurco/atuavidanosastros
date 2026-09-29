import test from "node:test";
import assert from "node:assert/strict";
import { CaelusEphemerisProvider } from "@atv/astrology";
import { WORKFLOW_VERSION } from "@atv/domain";
import { createWeekTemporalCalculators } from "./src/week-temporal-calculators.ts";
import {
  projectWeekTemporalSearch,
  validWeekTemporalProjection,
  weekTemporalProductContract,
} from "./src/week-temporal-projection.ts";
import { searchWeekTransits } from "./src/week-temporal-search.ts";
import {
  createProductCalculators,
  productCalculationCoverage,
} from "./src/product-runtime.ts";
import { validateCalculation } from "./src/product-processing.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";

const policy = () => ({
  id: "synthetic-five-rules-no-approval",
  version: "1",
  aspects: ["conjunction", "sextile", "square", "trine", "opposition"].map(
    (kind) => ({ kind, orbDegrees: 1 }),
  ),
});
const input = (extra = {}) => ({
  version: WORKFLOW_VERSION,
  productId: "week-reading",
  targetDate: "2026-09-29",
  birth: {
    localDateTime: "2000-01-01T12:00:00",
    utcInstant: "2000-01-01T12:00:00Z",
    timezone: "UTC",
    latitude: 0,
    longitude: 0,
    locationSource: "synthetic-temporal-test",
  },
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: false,
    continuity: false,
  },
  ...extra,
});
const context = (signal = new AbortController().signal) => ({
  runId: "00000000-0000-4000-8000-000000000001",
  signal,
});
const real = new CaelusEphemerisProvider();
const charts = new Map();
let calls = 0;
const provider = {
  name: real.name,
  version: real.version,
  async calculate(request) {
    calls++;
    const chart = await real.calculate(request);
    charts.set(request.utcInstant, structuredClone(chart));
    return chart;
  },
};
const selected = policy();
const calculate = createWeekTemporalCalculators(selected, provider)[
  "week-reading"
];
selected.aspects[0].orbDegrees = 10;
const snapshot = await calculate(
  input({ context: "Tema consentido, sem alterar geometria." }),
  context(),
);
const natal = charts.get("2000-01-01T12:00:00Z");
const sourceCharts = new Map(
  [...charts].filter(([key]) => key !== "2000-01-01T12:00:00Z"),
);
const search = await searchWeekTransits(
  "2026-09-29",
  natal.positions.map(({ body, longitude }) => ({ body, longitude })),
  policy(),
  async (instant) =>
    sourceCharts
      .get(instant)
      .positions.map(({ body, longitude }) => ({ body, longitude })),
  context().signal,
);

test("internal temporal opt-in preserves bounded real-engine evidence without approval", () => {
  assert.equal(snapshot.version, weekTemporalProductContract.version);
  assert.equal(snapshot.status, "experimental");
  assert.equal(snapshot.facts.length, 11);
  assert.equal(snapshot.data.rows.length, 336);
  assert.equal(snapshot.data.events.length, 86);
  assert.equal(snapshot.data.windows.length, 34);
  assert.equal(calls, 635);
  assert.equal(snapshot.data.policy.aspects[0].orbDegrees, 1);
  assert.equal(
    snapshot.data.declaredContext,
    "Tema consentido, sem alterar geometria.",
  );
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot)) < 200_000);
  assert.ok(validWeekTemporalProjection(snapshot));
  assert.ok(validateCalculation(snapshot, "week-reading"));
  assert.deepEqual(
    snapshot,
    projectWeekTemporalSearch(
      search,
      natal,
      sourceCharts,
      "Tema consentido, sem alterar geometria.",
    ),
  );
  assert.deepEqual(prepareProductFacts("week-reading", snapshot), {
    status: "blocked",
    reason: "calculation_invalid",
  });
});

test("guard rejects changed or omitted geometry, events, provenance and hidden fields", () => {
  const changed = (mutate) => {
    const value = structuredClone(snapshot);
    mutate(value);
    assert.equal(validWeekTemporalProjection(value), false);
  };
  changed((value) => {
    value.data.rows.splice(100, 1);
  });
  changed((value) => {
    value.data.rows[100][1][0] = 400;
  });
  changed((value) => {
    value.data.rows[100][2] = "bad";
  });
  changed((value) => {
    value.data.rows[100][3] = -1;
  });
  changed((value) => {
    value.data.events[0].from = value.data.events[0].to;
  });
  changed((value) => {
    value.data.windows[0].startClipped = !value.data.windows[0].startClipped;
  });
  changed((value) => {
    value.data.natalBasis.positions[0].longitude += 1;
  });
  changed((value) => {
    value.data.natalBasis.provenance.temporal.julianDayUt1Approx += 1;
  });
  changed((value) => {
    value.data.sourceCommon.providerVersion = "changed";
  });
  changed((value) => {
    value.data.policy.aspects[0].orbDegrees = 2;
  });
  changed((value) => {
    value.facts[0].display = "approved";
  });
  const hidden = structuredClone(snapshot);
  Object.defineProperty(hidden.data.rows[0], "secret", { value: "hidden" });
  assert.equal(validWeekTemporalProjection(hidden), false);
});

test("runtime remains default-off, modes exclusive, and invalid input fails before provider", async () => {
  assert.equal(createProductCalculators()["week-reading"], undefined);
  assert.equal(
    productCalculationCoverage().filter(
      (v) => v.productId === "week-reading",
    )[0].calculation,
    "unavailable",
  );
  assert.equal(
    typeof createProductCalculators({
      experimentalWeekTemporalPolicy: policy(),
    })["week-reading"],
    "function",
  );
  assert.throws(
    () =>
      createProductCalculators({
        experimentalWeekBase: true,
        experimentalWeekTemporalPolicy: policy(),
      }),
    /invalid_product_configuration/,
  );
  assert.throws(
    () =>
      createProductCalculators({
        experimentalWeekTransitPolicy: policy(),
        experimentalWeekTemporalPolicy: policy(),
      }),
    /invalid_product_configuration/,
  );
  const before = calls;
  await assert.rejects(calculate(input({ targetDate: "bad" }), context()), {
    code: "input_invalid",
  });
  await assert.rejects(calculate(input({ context: "" }), context()), {
    code: "input_invalid",
  });
  await assert.rejects(
    calculate(input({ productId: "horoscope" }), context()),
    { code: "input_invalid" },
  );
  assert.equal(calls, before);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(calculate(input(), context(controller.signal)), {
    name: "AbortError",
  });
  assert.equal(calls, before);
});
