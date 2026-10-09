import test from "node:test";
import assert from "node:assert/strict";
import { CaelusEphemerisProvider } from "@atv/astrology";
import { WORKFLOW_VERSION } from "@atv/domain";
import { createWeekReadingCalculators } from "./src/week-reading-calculators.ts";
import {
  projectWeekReading,
  validWeekReadingProjection,
  weekReadingProductContract,
  weekSampleDates,
} from "./src/week-reading-projection.ts";
import { validDateReadingProjection } from "./src/date-reading-projection.ts";
import {
  createProductCalculators,
  createProductProcessor,
  productCalculationCoverage,
} from "./src/product-runtime.ts";
import { validateCalculation } from "./src/product-processing.ts";

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
    locationSource: "synthetic",
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
const provider = (inspect = () => {}) => ({
  name: real.name,
  version: real.version,
  async calculate(birth) {
    const chart = await real.calculate(birth);
    chart.provenance.calculatedAt = "2026-09-29T00:00:00.000Z";
    inspect(birth, chart);
    return chart;
  },
});
const calculate = (p = provider()) =>
  createWeekReadingCalculators(p)["week-reading"];
const reference = await calculate()(input(), context());

test("own seven-day contract, canonical facts, natal calculated once, unchanged child contracts", async () => {
  const calls = [];
  const calculators = createWeekReadingCalculators(
    provider((birth) => calls.push({ ...birth })),
  );
  const value = await calculators["week-reading"](input(), context());
  assert.ok(Object.isFrozen(calculators));
  assert.deepEqual(Object.keys(calculators), ["week-reading"]);
  assert.equal(calls.length, 8);
  assert.equal(calls.filter((v) => v.locationSource === "synthetic").length, 1);
  assert.deepEqual(
    calls.slice(1).map((v) => v.utcInstant),
    weekSampleDates("2026-09-29").map((d) => `${d}T12:00:00Z`),
  );
  assert.equal(value.version, weekReadingProductContract.version);
  assert.equal(value.facts.length, 88);
  assert.equal(new Set(value.facts.map((f) => f.id)).size, 88);
  assert.equal(value.data.startDate, "2026-09-29");
  assert.equal(value.data.endDate, "2026-10-05");
  assert.deepEqual(value.data.projection, weekReadingProductContract);
  assert.ok(validWeekReadingProjection(value));
  for (const [day, base] of value.data.samples.entries()) {
    assert.ok(validDateReadingProjection(base));
    assert.equal(base.facts.length, 21);
    assert.deepEqual(base.data.first, value.data.samples[0].data.first);
    assert.equal(
      base.data.sampleInstant,
      `${weekSampleDates(value.data.startDate)[day]}T12:00:00.000Z`,
    );
    assert.deepEqual(base.data.aspects, []);
    assert.deepEqual(base.data.events, []);
    assert.deepEqual(base.limits, reference.data.samples[day].limits);
  }
  assert.deepEqual(value.data.aspects, []);
  assert.deepEqual(value.data.events, []);
  assert.deepEqual(value.data.windows, []);
  assert.ok(!JSON.stringify(value).includes('"localDateTime"'));
  assert.ok(!JSON.stringify(value).includes('"locationSource"'));
  assert.ok(Buffer.byteLength(JSON.stringify(value)) < 200000);
  assert.ok(validateCalculation(value, "week-reading"));
});

test("ordered UTC dates include leap day, year change and last complete engine week", () => {
  assert.deepEqual(weekSampleDates("2024-02-26"), [
    "2024-02-26",
    "2024-02-27",
    "2024-02-28",
    "2024-02-29",
    "2024-03-01",
    "2024-03-02",
    "2024-03-03",
  ]);
  assert.equal(weekSampleDates("2026-12-29")[6], "2027-01-04");
  assert.equal(weekSampleDates("2099-12-25")[6], "2099-12-31");
  assert.equal(weekSampleDates("1900-01-01")[0], "1900-01-01");
  for (const date of [
    "2099-12-26",
    "2099-12-31",
    "2026-02-29",
    "1899-12-31",
    "2026-1-01",
    null,
  ])
    assert.throws(() => weekSampleDates(date), /invalid_week_range/);
});

test("full real calculation crosses leap day and last supported date", async () => {
  for (const date of ["2024-02-26", "2099-12-25"]) {
    const value = await calculate()(input({ targetDate: date }), context());
    assert.ok(validWeekReadingProjection(value));
    assert.equal(value.data.endDate, weekSampleDates(date)[6]);
  }
});

test("context retained exactly once and cannot alter geometry", async () => {
  const prefix = "  Contexto consentido 🧭\n";
  const declared = prefix + "x".repeat(1200 - prefix.length);
  assert.equal(declared.length, 1200);
  const value = await calculate()(input({ context: declared }), context());
  assert.equal(value.facts.length, 89);
  assert.deepEqual(value.facts.at(-1), {
    id: "personal-context",
    kind: "reported",
    display: declared,
    source: "input.context",
  });
  assert.equal(value.data.declaredContext, declared);
  assert.deepEqual(value.data.samples, reference.data.samples);
  assert.ok(validWeekReadingProjection(value));
});

test("all dates, birth, context and consent fail before provider work", async () => {
  let calls = 0;
  const calc = calculate(provider(() => calls++));
  const invalid = [
    input({ targetDate: "2099-12-26" }),
    input({ targetDate: "2026-02-29" }),
    input({ productId: "horoscope" }),
    input({ birth: { ...input().birth, latitude: 91 } }),
    input({ birth: { ...input().birth, utcInstant: "2001-01-01T12:00:00Z" } }),
    input({ consent: { ...input().consent, storage: false } }),
    ...[
      " ",
      "x".repeat(1201),
      "a\u0000b",
      "a\u0085b",
      "a\ud800b",
      "a\udc00b",
    ].map((c) => input({ context: c })),
  ];
  for (const v of invalid)
    await assert.rejects(calc(v, context()), (e) => e.code === "input_invalid");
  assert.equal(calls, 0);
});

test("caller mutation after first await never changes captured input or context", async () => {
  const original = input({ context: "contexto original" });
  let release, entered;
  const gate = new Promise((r) => (release = r)),
    start = new Promise((r) => (entered = r));
  let first = true;
  const p = provider();
  const delayed = {
    ...p,
    async calculate(birth) {
      if (first) {
        first = false;
        entered();
        await gate;
      }
      return p.calculate(birth);
    },
  };
  const pending = calculate(delayed)(original, context());
  await start;
  original.birth.latitude = 60;
  original.targetDate = "2027-01-01";
  original.context = "alterado";
  original.consent.storage = false;
  release();
  const result = await pending;
  assert.equal(result.data.startDate, "2026-09-29");
  assert.equal(result.data.declaredContext, "contexto original");
  assert.deepEqual(result.data.samples, reference.data.samples);
});

test("abort before calculation makes no calls; mid-series stops without partial result", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(
    calculate(provider(() => calls++))(input(), context(controller.signal)),
    (e) => e.name === "AbortError",
  );
  assert.equal(calls, 0);
  const mid = new AbortController();
  const calc = calculate(
    provider(() => {
      calls++;
      if (calls === 4) mid.abort();
    }),
  );
  await assert.rejects(
    calc(input(), context(mid.signal)),
    (e) => e.name === "AbortError",
  );
  assert.equal(calls, 4);
});

test("cache and arrays belong to each run and concurrent runs do not share natal state", async () => {
  let calls = 0;
  const calc = calculate(provider(() => calls++));
  const [a, b] = await Promise.all([
    calc(input(), context()),
    calc(input({ birth: { ...input().birth, latitude: 10 } }), context()),
  ]);
  assert.equal(calls, 16);
  a.data.samples[0].data.first.positions[0].longitude = 0;
  assert.ok(validWeekReadingProjection(b));
  assert.notEqual(a.data.samples[1].data.first.positions[0].longitude, 0);
});

test("invalid or mixed provider chart stops safely without a seven-day substitute", async () => {
  for (const defect of [
    (c) => (c.input.latitude = 40),
    (c) => (c.positions[0].longitude = NaN),
    (c) => (c.provenance.accuracyStatus = "certified"),
    (c) => (c.provenance.providerVersion = "different-on-day-two"),
  ]) {
    let calls = 0;
    const p = provider((birth, c) => {
      calls++;
      if (calls === 3) defect(c);
    });
    await assert.rejects(
      calculate(p)(input(), context()),
      (e) => e.code === "calculation_invalid",
    );
    assert.ok(calls <= 8);
  }
});

test("pure projection rejects unordered, repeated, missing or inconsistent natal bases", () => {
  const bases = reference.data.samples;
  for (const mutate of [
    (b) => b.reverse(),
    (b) => (b[1] = b[0]),
    (b) => b.pop(),
    (b) => (b[1].data.first.positions[0].longitude += 1),
    (b) =>
      (b[1].data.first.provenance.calculatedAt = "2026-09-29T01:00:00.000Z"),
    (b) =>
      b[0].facts.push({
        id: "personal-context",
        kind: "reported",
        display: "contexto",
        source: "input.context",
      }),
  ]) {
    const altered = structuredClone(bases);
    mutate(altered);
    assert.throws(
      () => projectWeekReading(altered, reference.data.startDate),
      /invalid_week_basis/,
    );
  }
  assert.deepEqual(
    projectWeekReading(bases, reference.data.startDate),
    reference,
  );
});

test("persisted original keys, range, all facts and all seven provenances resist tampering", () => {
  const edits = [
    (v) => (v.extra = "metadata"),
    (v) => (v.version = "2"),
    (v) => (v.kind = "natal"),
    (v) => (v.status = "approved"),
    (v) => (v.facts[0].display += " favorable"),
    (v) => (v.facts[0].hidden = undefined),
    (v) => (v.facts[15].source = "forged"),
    (v) => (v.facts[20].id = v.facts[19].id),
    (v) => v.facts.reverse(),
    (v) => v.facts.pop(),
    (v) => (v.data.startDate = "2026-09-30"),
    (v) => (v.data.endDate = "2026-10-06"),
    (v) => (v.data.projection.days = 8),
    (v) => (v.data.samples[6].data.second.positions[0].longitude += 1),
    (v) =>
      (v.data.samples[5].data.second.provenance.temporal.utcInstant =
        "2026-10-04T13:00:00.000Z"),
    (v) => (v.data.samples[4].data.second.provenance.providerVersion = "other"),
    (v) =>
      (v.data.samples[3].data.first.provenance.calculatedAt =
        "2026-09-29T01:00:00.000Z"),
    (v) => (v.data.declaredContext = "invented"),
    (v) => v.data.windows.push("good day"),
    (v) => v.data.events.push("exact transit"),
    (v) => v.data.aspects.push("trine"),
    (v) => v.limits.pop(),
    (v) => (v.data.extra = undefined),
    (v) => (v.data[Symbol("hidden")] = "data"),
    (v) =>
      Object.defineProperty(v.data, "hidden", {
        value: "secret",
        enumerable: false,
      }),
    (v) =>
      Object.defineProperty(v.data, "startDate", {
        get() {
          throw Error("getter must not run");
        },
        enumerable: true,
      }),
    (v) => (v.data.samples.extra = "metadata"),
    (v) => (v.data.samples[0] = undefined),
  ];
  for (const edit of edits) {
    const v = structuredClone(reference);
    edit(v);
    assert.equal(validWeekReadingProjection(v), false, edit.toString());
  }
  assert.equal(validWeekReadingProjection(null), false);
  assert.equal(validWeekReadingProjection({}), false);
  const reordered = Object.fromEntries(Object.entries(reference).reverse());
  assert.ok(validWeekReadingProjection(reordered));
});

test("Week registration and processor allowlist are independent explicit server opt-ins", async () => {
  assert.equal(createProductCalculators()["week-reading"], undefined);
  assert.equal(
    productCalculationCoverage().filter((v) => v.calculation === "partial-base")
      .length,
    9,
  );
  assert.ok(
    productCalculationCoverage().every((v) => v.publication === "blocked"),
  );
  assert.equal(
    typeof createProductCalculators({ experimentalWeekBase: true })[
      "week-reading"
    ],
    "function",
  );
  assert.equal(
    createProductCalculators({ experimentalWeekBase: true }).horoscope,
    undefined,
  );
  for (const option of [false, "true", 1, null])
    assert.throws(
      () => createProductCalculators({ experimentalWeekBase: option }),
      /invalid_product_configuration/,
    );
  let calls = 0;
  const rpc = async () => {
    calls++;
    return null;
  };
  assert.throws(
    () => createProductProcessor(rpc, { enabledProducts: ["week-reading"] }),
    /invalid_product_configuration/,
  );
  const unselected = createProductProcessor(rpc, {
    experimentalWeekBase: true,
  });
  assert.deepEqual(unselected.products, []);
  assert.equal(await unselected.step(), "idle");
  assert.equal(calls, 0);
  const selected = createProductProcessor(rpc, {
    experimentalWeekBase: true,
    enabledProducts: ["week-reading"],
  });
  assert.deepEqual(selected.products, ["week-reading"]);
  await selected.step();
  assert.equal(calls, 1);
});

test("configured runtime persists complete Week once and routes saved calculation to editorial without recalculation", async () => {
  const claimed = {
    status: "claimed",
    runId: context().runId,
    productId: "week-reading",
    token: "00000000-0000-4000-8000-000000000002",
    revision: 1,
    state: "QUEUED",
    input: input(),
    calculation: null,
    attempt: 1,
    leaseUntil: "2099-01-01T00:00:00Z",
  };
  let saved;
  const events = [],
    calls = [];
  const rpc = async (name, args) => {
    calls.push(name);
    if (name === "claim_product_run_work") {
      assert.deepEqual(args.p_products, ["week-reading"]);
      return structuredClone(claimed);
    }
    assert.equal(name, "complete_product_run_work");
    assert.equal(args.p_id, claimed.runId);
    assert.equal(args.p_token, claimed.token);
    assert.equal(args.p_revision, claimed.revision);
    saved = structuredClone(args.p_calculation);
    return {
      state: saved ? "CALCULATED" : "AWAITING_EDITORIAL",
      revision: claimed.revision + 1,
    };
  };
  const runtime = createProductProcessor(rpc, {
    experimentalWeekBase: true,
    enabledProducts: ["week-reading"],
    emit: (e) => events.push(e),
  });
  assert.equal(await runtime.step(), "calculated");
  assert.ok(validWeekReadingProjection(saved));
  assert.equal(saved.facts.length, 88);
  claimed.state = "CALCULATED";
  claimed.revision = 2;
  claimed.calculation = saved;
  assert.equal(await runtime.step(), "awaiting_editorial");
  assert.equal(saved, null);
  assert.deepEqual(calls, [
    "claim_product_run_work",
    "complete_product_run_work",
    "claim_product_run_work",
    "complete_product_run_work",
  ]);
  assert.deepEqual(
    events.map((e) => e.outcome),
    ["calculated", "awaiting_editorial"],
  );
  assert.ok(events.every((e) => Object.keys(e).length === 4));
});
