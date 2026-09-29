import test from "node:test";
import assert from "node:assert/strict";
import { CaelusEphemerisProvider } from "@atv/astrology";
import { WORKFLOW_VERSION } from "@atv/domain";
import { createWeekReadingCalculators } from "./src/week-reading-calculators.ts";
import { createWeekTransitCalculators } from "./src/week-transit-calculators.ts";
import {
  projectWeekTransits,
  validWeekTransitProjection,
  weekTransitProductContract,
} from "./src/week-transit-projection.ts";
import { validWeekReadingProjection } from "./src/week-reading-projection.ts";
import {
  createProductCalculators,
  createProductProcessor,
  productCalculationCoverage,
} from "./src/product-runtime.ts";
import { validateCalculation } from "./src/product-processing.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";

const policy = () => ({
  id: "synthetic-week-series",
  version: "1",
  aspects: [
    { kind: "conjunction", orbDegrees: 1 },
    { kind: "sextile", orbDegrees: 1 },
    { kind: "square", orbDegrees: 1 },
    { kind: "trine", orbDegrees: 1 },
    { kind: "opposition", orbDegrees: 1 },
  ],
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
    locationSource: "synthetic-week-transits",
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
  async calculate(request) {
    const chart = await real.calculate(request);
    chart.provenance.calculatedAt = "2026-09-29T00:00:00.000Z";
    await inspect(request, chart);
    return chart;
  },
});
const base = await createWeekReadingCalculators(provider())["week-reading"](
  input(),
  context(),
);
const reference = projectWeekTransits(base, policy());

test("versioned seven-sample series retains all bases, covers every ordered pair and remains experimental", async () => {
  const calls = [];
  const calculators = createWeekTransitCalculators(
    policy(),
    provider((request) => calls.push(request)),
  );
  const value = await calculators["week-reading"](input(), context());
  assert.ok(Object.isFrozen(calculators));
  assert.deepEqual(Object.keys(calculators), ["week-reading"]);
  assert.equal(calls.length, 8);
  assert.equal(
    calls.filter((v) => v.locationSource === "synthetic-week-transits").length,
    1,
  );
  assert.deepEqual(value, reference);
  assert.ok(validWeekTransitProjection(value));
  assert.equal(validWeekReadingProjection(value), false);
  assert.equal(value.version, weekTransitProductContract.version);
  assert.deepEqual(value.data.natalBasis, base.data.samples[0].data.first);
  for (const [i, sample] of value.data.samples.entries()) {
    const { facts: _facts, data, ...metadata } = base.data.samples[i];
    const { first: _first, ...sampleData } = data;
    assert.deepEqual(sample, { ...metadata, data: sampleData });
  }
  assert.deepEqual(value.facts.slice(0, 88), base.facts);
  assert.equal(value.facts.length, 189);
  assert.equal(new Set(value.facts.map((f) => f.id)).size, 189);
  assert.equal(value.data.series.length, 100);
  assert.equal(
    value.data.series.filter((s) => s.transitBody === s.natalBody).length,
    10,
  );
  assert.deepEqual(
    value.data.series.slice(0, 2).map((s) => [s.transitBody, s.natalBody]),
    [
      ["sun", "sun"],
      ["sun", "moon"],
    ],
  );
  for (const series of value.data.series) {
    assert.equal(series.separationsDegrees.length, 7);
    assert.equal(series.aspectKinds.length, 7);
    assert.equal(series.orbDegrees.length, 7);
    assert.equal(series.separationChangesDegrees.length, 6);
  }
  assert.deepEqual(value.data.events, []);
  assert.deepEqual(value.data.windows, []);
  assert.equal(value.data.projection.assumedLongitudeErrorDegrees, null);
  assert.equal(value.data.projection.aspectStability, "unknown-accuracy");
  assert.equal(value.data.projection.motion, "not-evaluated");
  assert.equal(value.data.projection.policyApproval, "not-established");
  assert.ok(validateCalculation(value, "week-reading"));
});

test("independent synthetic longitude oracle covers wrap, inclusive orb, opposition and signed sample changes", async () => {
  // Deliberately synthetic positions; this is an arithmetic oracle, not engine accuracy evidence.
  const longitudes = [0.5, 359.5, 179.5, 179.49999, 0, 60, 90];
  const value = await createWeekTransitCalculators(
    policy(),
    provider((request, chart) => {
      const sun = chart.positions.find((p) => p.body === "sun");
      sun.longitude =
        request.locationSource === "synthetic-week-transits"
          ? 359.5
          : longitudes[
              (Date.parse(request.utcInstant) -
                Date.parse("2026-09-29T12:00:00Z")) /
                86400000
            ];
    }),
  )["week-reading"](input(), context());
  const sun = value.data.series[0];
  const expected = [1, 0, 180, 179.99999, 0.5, 60.5, 90.5];
  expected.forEach((wanted, i) =>
    assert.ok(Math.abs(sun.separationsDegrees[i] - wanted) < 1e-10),
  );
  assert.deepEqual(sun.aspectKinds, [
    "conjunction",
    "conjunction",
    "opposition",
    "opposition",
    "conjunction",
    "sextile",
    "square",
  ]);
  assert.equal(sun.orbDegrees[0], 1);
  assert.equal(sun.orbDegrees[1], 0);
  assert.equal(sun.separationChangesDegrees[0], -1);
  assert.equal(sun.separationChangesDegrees[1], 180);
  assert.equal(sun.separationChangesDegrees[5], 30);
  assert.equal(sun.orbDegrees[5], 0.5);
});

test("raw numbers retain full precision and displayed rounding never feeds classification or changes", () => {
  for (const series of reference.data.series)
    for (let i = 1; i < 7; i++)
      assert.equal(
        series.separationChangesDegrees[i - 1],
        series.separationsDegrees[i] - series.separationsDegrees[i - 1],
      );
  assert.ok(
    reference.data.series.some((s) =>
      s.separationsDegrees.some((n) => n !== Number(n.toFixed(6))),
    ),
  );
  const zero = projectWeekTransits(base, {
    id: "synthetic-zero-orb",
    version: "1",
    aspects: [{ kind: "conjunction", orbDegrees: 0 }],
  });
  assert.ok(
    zero.data.series.every((s) => s.aspectKinds.every((kind) => kind === null)),
  );
});

test("all five rules, longest legal identifiers and full Unicode context remain inside unchanged transport limits", (t) => {
  const contextText = "😀".repeat(600);
  const contextual = { ...input(), context: contextText };
  const contextualBase = structuredClone(base);
  contextualBase.data.declaredContext = contextual.context;
  contextualBase.facts.push({
    id: "personal-context",
    kind: "reported",
    display: contextText,
    source: "input.context",
  });
  const longest = policy();
  longest.id = "i".repeat(80);
  longest.version = "v".repeat(80);
  longest.aspects.forEach((rule) => (rule.orbDegrees = 10));
  const value = projectWeekTransits(contextualBase, longest);
  assert.equal(value.facts.length, 190);
  assert.equal(value.facts.at(-1).display, contextText);
  assert.deepEqual(
    value.data.series,
    projectWeekTransits(base, longest).data.series,
  );
  assert.ok(
    value.facts.every(
      (f) => f.source.length <= 300 && f.display.length <= 2000,
    ),
  );
  assert.ok(new TextEncoder().encode(JSON.stringify(value)).length <= 200000);
  assert.ok(validateCalculation(value, "week-reading"));
  assert.ok(validWeekTransitProjection(value));
  t.diagnostic(
    JSON.stringify({
      bytes: new TextEncoder().encode(JSON.stringify(value)).length,
      facts: value.facts.length,
      maxDisplay: Math.max(...value.facts.map((f) => f.display.length)),
      maxSource: Math.max(...value.facts.map((f) => f.source.length)),
    }),
  );
});

test("one wide rule is explicit, may classify all pairs, and does not establish policy or scientific approval", () => {
  const value = projectWeekTransits(base, {
    id: "synthetic-wide",
    version: "1",
    aspects: [{ kind: "conjunction", orbDegrees: 180 }],
  });
  assert.ok(
    value.data.series.every((s) =>
      s.aspectKinds.every((kind) => kind === "conjunction"),
    ),
  );
  assert.ok(validateCalculation(value, "week-reading"));
  assert.equal(value.status, "experimental");
  assert.equal(value.data.projection.policyApproval, "not-established");
});

test("all derived fields, facts, provenance, limits and ordering are reconstructed before admission", () => {
  const changes = [
    (v) => (v.version = base.version),
    (v) => (v.status = "recorded"),
    (v) => (v.data.endDate = "2026-10-06"),
    (v) => (v.data.series[0].separationsDegrees[0] += 0.01),
    (v) => (v.data.series[0].separationChangesDegrees[0] += 0.01),
    (v) => (v.data.series[0].aspectKinds[0] = "conjunction"),
    (v) => (v.data.series[0].orbDegrees[0] = 0),
    (v) => v.data.series.reverse(),
    (v) => v.data.series.pop(),
    (v) => v.data.samples.reverse(),
    (v) => (v.data.samples[0].facts = []),
    (v) => (v.data.samples[0].data.first = structuredClone(v.data.natalBasis)),
    (v) => (v.data.natalBasis.positions[0].longitude += 1),
    (v) =>
      (v.data.samples[0].data.second.provenance.referenceFrame =
        "invented-frame"),
    (v) => (v.data.projection.assumedLongitudeErrorDegrees = 0),
    (v) => (v.data.projection.motion = "applying"),
    (v) => v.data.events.push({ time: "2026-09-29T12:00:00Z" }),
    (v) => v.data.windows.push({ favorable: true }),
    (v) => (v.data.policy.aspects[0].orbDegrees = -1),
    (v) => (v.facts[90].source += ";approved"),
    (v) => (v.facts[90].display += " favorável"),
    (v) => (v.facts[11].source += ";changed"),
    (v) => (v.facts[11].display = "Invented sample position"),
    (v) => (v.facts[1].display = "Invented natal position"),
    (v) => v.limits.pop(),
    (v) => (v.extra = true),
    (v) => (v.data.extra = true),
  ];
  changes.forEach((change, index) => {
    const value = structuredClone(reference);
    change(value);
    assert.equal(validWeekTransitProjection(value), false, `mutation ${index}`);
  });
});

test("non-JSON descriptors, sparse arrays, symbols and prototypes are refused without invoking accessors", () => {
  let accessed = 0;
  const changes = [
    (v) => Object.defineProperty(v.facts[0], "hidden", { value: true }),
    (v) => (v.data.series[0][Symbol("metadata")] = true),
    (v) =>
      Object.defineProperty(v.data.series[0], "extra", {
        enumerable: true,
        get() {
          accessed++;
          return true;
        },
      }),
    (v) => delete v.data.series[0].separationsDegrees[1],
    (v) => (v.data.series[0].separationsDegrees.extra = true),
    (v) => Object.setPrototypeOf(v.data.policy, { approved: true }),
    (v) => (v.data.series[0].separationsDegrees[0] = NaN),
    (v) => (v.data.series[0].separationsDegrees[0] = Infinity),
  ];
  for (const change of changes) {
    const value = structuredClone(reference);
    change(value);
    assert.equal(validWeekTransitProjection(value), false);
  }
  assert.equal(accessed, 0);
});

test("operator policy is captured before an awaited provider and outputs cannot mutate later calculations", async () => {
  const mutablePolicy = policy();
  const mutableInput = input({ context: "Contexto sintético original" });
  let calls = 0;
  const calculate = createWeekTransitCalculators(
    mutablePolicy,
    provider(() => {
      if (++calls === 1) {
        mutablePolicy.id = "modified";
        mutablePolicy.aspects[0].orbDegrees = 180;
        mutableInput.targetDate = "2027-01-01";
        mutableInput.context = "Alterado";
      }
    }),
  )["week-reading"];
  const value = await calculate(mutableInput, context());
  assert.deepEqual(value.data.policy, policy());
  assert.equal(value.data.startDate, "2026-09-29");
  assert.equal(value.facts.at(-1).display, "Contexto sintético original");
  value.data.policy.id = "output-modified";
  value.data.series[0].separationsDegrees[0] = 0;
  const next = await calculate(input(), context());
  assert.deepEqual(next, reference);
});

test("invalid policies fail at construction before any provider call", () => {
  let calls = 0;
  for (const invalid of [
    undefined,
    null,
    {},
    { ...policy(), aspects: [] },
    { ...policy(), id: "bad id" },
    { ...policy(), aspects: [{ kind: "square", orbDegrees: -1 }] },
    {
      ...policy(),
      aspects: [
        { kind: "square", orbDegrees: 30 },
        { kind: "trine", orbDegrees: 0 },
      ],
    },
  ])
    assert.throws(() =>
      createWeekTransitCalculators(
        invalid,
        provider(() => calls++),
      ),
    );
  assert.equal(calls, 0);
});

test("invalid input and pre-aborted calculations cause zero provider calls; cancellation after a provider stops the sequence", async () => {
  let calls = 0;
  const calculate = createWeekTransitCalculators(
    policy(),
    provider(() => calls++),
  )["week-reading"];
  for (const invalid of [
    input({ targetDate: "2099-12-26" }),
    input({ productId: "horoscope" }),
    input({ context: "bad\u0000context" }),
  ])
    await assert.rejects(
      calculate(invalid, context()),
      (e) => e.code === "input_invalid",
    );
  const aborted = new AbortController();
  aborted.abort();
  await assert.rejects(calculate(input(), context(aborted.signal)));
  assert.equal(calls, 0);
  const controller = new AbortController();
  await assert.rejects(
    createWeekTransitCalculators(
      policy(),
      provider(() => {
        calls++;
        controller.abort();
      }),
    )["week-reading"](input(), context(controller.signal)),
  );
  assert.equal(calls, 1);
});

test("independent opt-ins preserve thirteen defaults, legacy base and publication gates; ambiguous configuration fails", async () => {
  assert.equal(createProductCalculators()["week-reading"], undefined);
  assert.equal(
    productCalculationCoverage().filter((p) => p.calculation === "partial-base")
      .length,
    13,
  );
  assert.ok(
    productCalculationCoverage().every((p) => p.publication === "blocked"),
  );
  const configured = createProductCalculators({
    experimentalWeekTransitPolicy: policy(),
  });
  assert.equal(typeof configured["week-reading"], "function");
  assert.equal(configured.horoscope, undefined);
  assert.throws(
    () =>
      createProductCalculators({
        experimentalWeekBase: true,
        experimentalWeekTransitPolicy: policy(),
      }),
    /invalid_product_configuration/,
  );
  const legacy = await createProductCalculators({ experimentalWeekBase: true })[
    "week-reading"
  ](input(), context());
  assert.ok(validWeekReadingProjection(legacy));
  assert.equal(legacy.version, base.version);
  let calls = 0;
  const rpc = async () => {
    calls++;
    return null;
  };
  const unselected = createProductProcessor(rpc, {
    experimentalWeekTransitPolicy: policy(),
  });
  assert.deepEqual(unselected.products, []);
  assert.equal(await unselected.step(), "idle");
  assert.equal(calls, 0);
});

test("configured processor saves the new bounded snapshot and reopens it without recalculation", async () => {
  const claim = {
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
  const writes = [];
  const runtime = createProductProcessor(
    async (name, args) => {
      if (name === "claim_product_run_work") return structuredClone(claim);
      assert.equal(name, "complete_product_run_work");
      writes.push(args.p_calculation);
      if (args.p_calculation) saved = structuredClone(args.p_calculation);
      return {
        state: args.p_calculation ? "CALCULATED" : "AWAITING_EDITORIAL",
        revision: claim.revision + 1,
      };
    },
    {
      experimentalWeekTransitPolicy: policy(),
      enabledProducts: ["week-reading"],
    },
  );
  assert.equal(await runtime.step(), "calculated");
  assert.ok(validWeekTransitProjection(saved));
  claim.state = "CALCULATED";
  claim.calculation = saved;
  claim.revision++;
  assert.equal(await runtime.step(), "awaiting_editorial");
  assert.deepEqual(writes[1], null);
});

test("new series cannot enter the legacy editorial profile or be downgraded by its caller", () => {
  assert.equal(prepareProductFacts("week-reading", base).status, "prepared");
  assert.deepEqual(prepareProductFacts("week-reading", reference), {
    status: "blocked",
    reason: "calculation_invalid",
  });
  const downgraded = structuredClone(reference);
  downgraded.version = base.version;
  assert.deepEqual(prepareProductFacts("week-reading", downgraded), {
    status: "blocked",
    reason: "calculation_invalid",
  });
});
