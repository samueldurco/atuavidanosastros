import test from "node:test";
import assert from "node:assert/strict";
import { bodies, CaelusEphemerisProvider } from "@atv/astrology";
import { createHoroscopeCalculators } from "./src/horoscope-calculators.ts";
import {
  horoscopeProductContract,
  validHoroscopeProjection,
} from "./src/horoscope-projection.ts";
import { createProductCalculators } from "./src/product-runtime.ts";
import { validateCalculation } from "./src/product-processing.ts";

const input = () => ({
  version: "atv-workflow/1.0.0",
  productId: "horoscope",
  birth: {
    localDateTime: "2000-01-01T12:00:00",
    utcInstant: "2000-01-01T12:00:00Z",
    timezone: "UTC",
    latitude: 0,
    longitude: 0,
    locationSource: "synthetic",
  },
  targetDate: "2026-09-29",
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: false,
    continuity: false,
  },
});
const policy = () => ({
  id: "qa-horoscope-explicit",
  version: "1",
  aspects: [{ kind: "conjunction", orbDegrees: 2 }],
});
const context = (signal) => ({
  runId: "00000000-0000-4000-8000-000000000001",
  signal: signal ?? new AbortController().signal,
});
const real = new CaelusEphemerisProvider();
const fixedProvider = () => ({
  name: real.name,
  version: real.version,
  async calculate(birth) {
    const chart = await real.calculate(birth);
    chart.provenance.calculatedAt = "2026-09-29T00:00:00.000Z";
    return chart;
  },
});

test("own partial contract, complete directed pairs and unchanged date basis", async () => {
  const calculators = createHoroscopeCalculators(policy(), fixedProvider());
  const value = await calculators.horoscope(input(), context());
  assert.ok(Object.isFrozen(calculators));
  assert.deepEqual(Object.keys(calculators), ["horoscope"]);
  assert.equal(createProductCalculators().horoscope, undefined);
  assert.equal(value.version, horoscopeProductContract.version);
  assert.equal(value.data.productId, "horoscope");
  assert.equal(value.data.base.data.productId, "date-reading");
  assert.deepEqual(value.facts.slice(0, 21), value.data.base.facts);
  assert.deepEqual(value.data.base.data.aspects, []);
  assert.deepEqual(value.data.base.data.events, []);
  assert.equal(value.data.base.data.sampleInstant, "2026-09-29T12:00:00.000Z");
  assert.equal(value.facts.length, 121);
  assert.equal(new Set(value.facts.map((f) => f.id)).size, 121);
  const expectedPairs = bodies.flatMap((a) =>
    bodies.map((b) => `transit-${a}-natal-${b}`),
  );
  assert.deepEqual(
    value.facts.slice(21).map((f) => f.id),
    expectedPairs,
  );
  assert.deepEqual(value.data.roleMapping, {
    first: "transit-sample",
    second: "natal",
    genericFirst: "person-a",
    genericSecond: "person-b",
  });
  assert.deepEqual(
    value.data.crossAspectStability.calculation.inputPositions.first,
    value.data.base.data.second.positions.map(({ body, longitude }) => ({
      body,
      longitude,
    })),
  );
  assert.deepEqual(
    value.data.crossAspectStability.calculation.inputPositions.second,
    value.data.base.data.first.positions.map(({ body, longitude }) => ({
      body,
      longitude,
    })),
  );
  assert.ok(
    value.data.crossAspectStability.pairs.every(
      (p) =>
        p.status === "unknown-accuracy" && p.separationIntervalDegrees === null,
    ),
  );
  assert.equal(value.data.crossAspectStability.calculation.pairsEvaluated, 100);
  assert.equal(value.status, "experimental");
  assert.ok(validHoroscopeProjection(value));
  assert.deepEqual(validateCalculation(value, "horoscope"), value);
  assert.deepEqual(await calculators.horoscope(input(), context()), value);
  assert.ok(value.limits.some((l) => l.includes("época comum")));
});

test("wrap, orb boundary and nominal absence retain all 100 facts", async () => {
  for (const sampleLongitude of [1, 1.00000001]) {
    let calls = 0;
    const provider = fixedProvider();
    const custom = {
      ...provider,
      async calculate(b) {
        const chart = await provider.calculate(b);
        calls++;
        chart.positions = chart.positions.map((p) => ({
          ...p,
          longitude: calls === 1 ? 359 : sampleLongitude,
        }));
        return chart;
      },
    };
    const request = input();
    request.context = "🌙".repeat(600);
    const value = await createHoroscopeCalculators(policy(), custom).horoscope(
      request,
      context(),
    );
    assert.equal(calls, 2);
    assert.equal(
      value.data.crossAspectStability.calculation.aspects.length,
      sampleLongitude === 1 ? 100 : 0,
    );
    assert.equal(value.facts.length, 122);
    assert.equal(value.facts.at(-1).display, request.context);
    assert.equal(value.facts.at(-1).kind, "reported");
    assert.equal(value.facts.at(-1).source, "input.context");
    assert.ok(
      value.facts
        .slice(21, 121)
        .every((f) =>
          f.display.includes(
            sampleLongitude === 1 ? "conjunção" : "nenhum aspecto",
          ),
        ),
    );
    assert.ok(validHoroscopeProjection(value));
  }
});

test("original persisted snapshot rejects altered roles, facts, sample and geometry", async (t) => {
  const request = input();
  request.context = "Contexto consentido";
  const value = await createHoroscopeCalculators(
    policy(),
    fixedProvider(),
  ).horoscope(request, context());
  const mutations = [
    [
      "extra root",
      (v) => {
        v.approval = true;
      },
    ],
    [
      "extra fact",
      (v) => {
        v.facts[21].approved = true;
      },
    ],
    [
      "relabel",
      (v) => {
        v.data.productId = "date-reading";
      },
    ],
    [
      "complete",
      (v) => {
        v.data.projection.completeness = "complete";
      },
    ],
    [
      "swap roles",
      (v) => {
        v.data.roleMapping.first = "natal";
      },
    ],
    [
      "unknown role",
      (v) => {
        v.data.roleMapping.currentTimezone = "UTC";
      },
    ],
    [
      "missing pair",
      (v) => {
        v.facts.splice(21, 1);
      },
    ],
    [
      "extra pair",
      (v) => {
        v.facts.push({ ...v.facts[21], id: "invented" });
      },
    ],
    [
      "pair order",
      (v) => {
        [v.facts[21], v.facts[22]] = [v.facts[22], v.facts[21]];
      },
    ],
    [
      "display",
      (v) => {
        v.facts[21].display += " Janela favorável.";
      },
    ],
    [
      "source",
      (v) => {
        v.facts[21].source = "approved";
      },
    ],
    [
      "context kind",
      (v) => {
        v.facts.at(-1).kind = "calculated";
      },
    ],
    [
      "sample instant",
      (v) => {
        v.data.base.data.sampleInstant = "2026-09-29T15:00:00.000Z";
      },
    ],
    [
      "base geometry",
      (v) => {
        v.data.base.data.first.positions[0].longitude += 1;
      },
    ],
    [
      "base unknown key",
      (v) => {
        v.data.base.data.first.positions[0].house = 1;
      },
    ],
    [
      "accuracy",
      (v) => {
        v.data.crossAspectStability.assumedLongitudeErrorDegrees.first = 0;
      },
    ],
    [
      "stability",
      (v) => {
        v.data.crossAspectStability.pairs[0].status = "stable-under-budget";
      },
    ],
    [
      "geometry roles",
      (v) => {
        v.data.crossAspectStability.calculation.roles.reverse();
      },
    ],
    [
      "geometry inputs",
      (v) => {
        v.data.crossAspectStability.calculation.inputPositions.first[0].longitude += 1;
      },
    ],
    [
      "nominal absence",
      (v) => {
        v.data.crossAspectStability.calculation.aspects.push({
          first: "sun",
          second: "sun",
          kind: "conjunction",
          separationDegrees: 0,
          orbDegrees: 0,
          exactAngleDegrees: 0,
        });
      },
    ],
    [
      "policy",
      (v) => {
        v.data.crossAspectStability.calculation.policy.approved = true;
      },
    ],
    [
      "limits",
      (v) => {
        v.limits.pop();
      },
    ],
    [
      "base provenance",
      (v) => {
        v.data.base.data.first.provenance.referenceFrame = "heliocentric";
      },
    ],
  ];
  for (const [name, mutate] of mutations)
    await t.test(name, () => {
      const changed = structuredClone(value);
      mutate(changed);
      assert.equal(validHoroscopeProjection(changed), false);
    });
});

test("invalid intake fails before any provider work", async (t) => {
  let calls = 0;
  const provider = {
    name: "synthetic",
    version: "1",
    calculate() {
      calls++;
      throw Error("must not calculate");
    },
  };
  const calc = createHoroscopeCalculators(policy(), provider).horoscope;
  const mutations = [
    [
      "wrong product",
      (v) => {
        v.productId = "date-reading";
      },
    ],
    [
      "missing consent",
      (v) => {
        v.consent.storage = false;
      },
    ],
    [
      "impossible date",
      (v) => {
        v.targetDate = "2026-02-30";
      },
    ],
    [
      "out of range",
      (v) => {
        v.targetDate = "2100-01-01";
      },
    ],
    [
      "civil mismatch",
      (v) => {
        v.birth.utcInstant = "2000-01-01T13:00:00Z";
      },
    ],
    [
      "extra partner",
      (v) => {
        v.partner = { ...v.birth };
      },
    ],
    [
      "too long context",
      (v) => {
        v.context = "a".repeat(1201);
      },
    ],
    [
      "invalid unicode",
      (v) => {
        v.context = "\ud800";
      },
    ],
    [
      "control",
      (v) => {
        v.context = "a\u0000b";
      },
    ],
  ];
  for (const [name, mutate] of mutations)
    await t.test(name, async () => {
      const value = input();
      mutate(value);
      await assert.rejects(
        calc(value, context()),
        (e) => e.code === "input_invalid",
      );
    });
  assert.equal(calls, 0);
});

test("input and operator policy are captured before provider await", async () => {
  const request = input();
  request.context = "Original";
  const explicit = policy();
  const calcProvider = fixedProvider();
  let calls = 0;
  const provider = {
    ...calcProvider,
    async calculate(b) {
      calls++;
      if (calls === 1) {
        request.birth.utcInstant = "2001-01-01T12:00:00Z";
        request.targetDate = "2027-01-01";
        request.context = "Alterado";
        explicit.aspects[0].orbDegrees = 180;
        explicit.id = "changed";
      }
      return calcProvider.calculate(b);
    },
  };
  const value = await createHoroscopeCalculators(explicit, provider).horoscope(
    request,
    context(),
  );
  assert.equal(value.data.base.data.targetDate, "2026-09-29");
  assert.equal(value.facts.at(-1).display, "Original");
  assert.equal(
    value.data.crossAspectStability.calculation.policy.id,
    "qa-horoscope-explicit",
  );
  assert.equal(
    value.data.crossAspectStability.calculation.policy.aspects[0].orbDegrees,
    2,
  );
  assert.equal(calls, 2);
});

test("abort and invalid provider cannot yield a partial substitute", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  const provider = fixedProvider();
  const aborting = {
    ...provider,
    async calculate(b) {
      calls++;
      const c = await provider.calculate(b);
      controller.abort();
      return c;
    },
  };
  const calc = createHoroscopeCalculators(policy(), aborting).horoscope;
  await assert.rejects(calc(input(), context(controller.signal)), {
    name: "AbortError",
  });
  assert.equal(calls, 0);
  const during = new AbortController();
  const abortDuring = {
    ...provider,
    async calculate(b) {
      calls++;
      const c = await provider.calculate(b);
      during.abort();
      return c;
    },
  };
  await assert.rejects(
    createHoroscopeCalculators(policy(), abortDuring).horoscope(
      input(),
      context(during.signal),
    ),
    { name: "AbortError" },
  );
  assert.equal(calls, 1);
  const invalid = {
    ...provider,
    async calculate(b) {
      const c = await provider.calculate(b);
      c.positions[0].longitude = NaN;
      return c;
    },
  };
  await assert.rejects(
    createHoroscopeCalculators(policy(), invalid).horoscope(input(), context()),
    (e) => e.code === "calculation_invalid",
  );
});

test("operator must supply a finite nonoverlapping policy", () => {
  for (const p of [
    undefined,
    { ...policy(), aspects: [] },
    { ...policy(), aspects: [{ kind: "conjunction", orbDegrees: NaN }] },
    {
      ...policy(),
      aspects: [
        { kind: "conjunction", orbDegrees: 70 },
        { kind: "sextile", orbDegrees: 1 },
      ],
    },
  ]) {
    assert.throws(() => createHoroscopeCalculators(p));
  }
});
