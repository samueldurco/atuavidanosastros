import test from "node:test";
import assert from "node:assert/strict";
import { bodies, CaelusEphemerisProvider } from "@atv/astrology";
import {
  createSynastryCalculators,
  synastryProductContract,
} from "./src/synastry-calculators.ts";
import { createProductCalculators } from "./src/product-runtime.ts";
import { validateCalculation } from "./src/product-processing.ts";

const birth = {
  localDateTime: "2000-01-01T12:00:00",
  utcInstant: "2000-01-01T12:00:00Z",
  timezone: "UTC",
  latitude: 0,
  longitude: 0,
  locationSource: "synthetic",
};
const partner = {
  ...birth,
  localDateTime: "2001-02-03T10:00:00",
  utcInstant: "2001-02-03T10:00:00Z",
};
const policy = () => ({
  id: "qa-synastry-explicit",
  version: "1.0.0",
  aspects: [
    { kind: "conjunction", orbDegrees: 5 },
    { kind: "sextile", orbDegrees: 3 },
    { kind: "square", orbDegrees: 5 },
    { kind: "trine", orbDegrees: 5 },
    { kind: "opposition", orbDegrees: 5 },
  ],
});
const input = () => ({
  version: "atv-workflow/1.0.0",
  productId: "synastry",
  birth: { ...birth },
  partner: { ...partner },
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: true,
    continuity: false,
  },
});
const context = (signal) => ({
  runId: "00000000-0000-4000-8000-000000000001",
  signal: signal ?? new AbortController().signal,
});
const provider = new CaelusEphemerisProvider();

test("circular wrap and exact nominal orb boundary retain all pairs with unknown accuracy", async () => {
  for (const longitude of [1, 1.00000001]) {
    let calls = 0;
    const custom = {
      name: "synthetic",
      version: "1",
      async calculate(b) {
        const chart = await provider.calculate(b);
        calls++;
        chart.positions = chart.positions.map((p) => ({
          ...p,
          longitude: calls === 1 ? 359 : longitude,
        }));
        return chart;
      },
    };
    const explicit = {
      id: "qa-boundary",
      version: "1",
      aspects: [{ kind: "conjunction", orbDegrees: 2 }],
    };
    const request = input();
    request.context = "🌙".repeat(600);
    const value = await createSynastryCalculators(explicit, custom).synastry(
      request,
      context(),
    );
    const s = value.data.crossAspectStability;
    assert.equal(s.calculation.aspects.length, longitude === 1 ? 100 : 0);
    assert.equal(s.pairs.length, 100);
    assert.ok(s.pairs.every((p) => p.status === "unknown-accuracy"));
    assert.equal(value.facts.at(-1).display, request.context);
    assert.equal(value.facts.length, 121);
    if (longitude === 1)
      assert.ok(
        s.calculation.aspects.every(
          (a) => a.separationDegrees === 2 && a.orbDegrees === 2,
        ),
      );
    else
      assert.ok(
        value.facts
          .filter((f) => f.id.startsWith("cross-"))
          .every((f) => f.display.includes("nenhum aspecto")),
      );
  }
});

test("synastry composes both real candidate maps and all directed pairs without runtime promotion", async () => {
  const calculators = createSynastryCalculators(policy());
  const request = input();
  request.context = "Contexto sintético consentido, sem alterar a geometria.";
  const value = await calculators.synastry(request, context());
  assert.ok(Object.isFrozen(calculators));
  assert.deepEqual(Object.keys(calculators), ["synastry"]);
  assert.equal(createProductCalculators().synastry, undefined);
  assert.equal(value.version, synastryProductContract.version);
  assert.equal(value.status, "experimental");
  assert.deepEqual(
    value.facts.slice(0, 20).map((f) => f.id),
    [
      ...bodies.map((b) => `person-a-${b}`),
      ...bodies.map((b) => `person-b-${b}`),
    ],
  );
  assert.equal(value.facts.length, 121);
  assert.equal(value.facts.at(-1).kind, "reported");
  assert.equal(value.facts.at(-1).display, request.context);
  const s = value.data.crossAspectStability,
    g = s.calculation;
  assert.equal(g.pairsEvaluated, 100);
  assert.equal(s.pairs.length, 100);
  assert.equal(new Set(value.facts.map((f) => f.id)).size, 121);
  assert.deepEqual(g.roles, ["person-a", "person-b"]);
  assert.deepEqual(g.policy, policy());
  assert.deepEqual(s.assumedLongitudeErrorDegrees, {
    first: null,
    second: null,
  });
  assert.ok(
    s.pairs.every(
      (p) =>
        p.status === "unknown-accuracy" && p.separationIntervalDegrees === null,
    ),
  );
  assert.equal(g.inputPrecision, "not-certified");
  assert.equal(g.motion, "not-evaluated");
  assert.equal(value.data.projection.policyApproval, "not-established");
  for (const side of ["first", "second"]) {
    const chart = await provider.calculate(
      request[side === "first" ? "birth" : "partner"],
    );
    assert.deepEqual(value.data[side].positions, chart.positions);
    const { calculatedAt, ...capturedProvenance } = value.data[side].provenance;
    const { calculatedAt: regeneratedAt, ...regeneratedProvenance } =
      chart.provenance;
    assert.ok(Number.isFinite(Date.parse(calculatedAt)));
    assert.ok(Number.isFinite(Date.parse(regeneratedAt)));
    assert.deepEqual(capturedProvenance, regeneratedProvenance);
    assert.equal(value.data[side].input, undefined);
    assert.equal(value.data[side].houses, undefined);
    assert.equal(
      value.data[side].provenance.contract.productionPromotion,
      false,
    );
  }
  for (const pair of s.pairs) {
    const a = g.inputPositions.first.find(
      (p) => p.body === pair.first,
    ).longitude;
    const b = g.inputPositions.second.find(
      (p) => p.body === pair.second,
    ).longitude;
    const separation = Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    const nominal = g.aspects.find(
      (p) => p.first === pair.first && p.second === pair.second,
    );
    const fact = value.facts.find(
      (f) => f.id === `cross-${pair.first}-${pair.second}`,
    );
    assert.ok(fact.display.includes(`${separation.toFixed(6)}°`));
    assert.equal(fact.display.includes("nenhum aspecto"), !nominal);
    assert.ok(fact.source.includes("qa-synastry-explicit@1.0.0"));
  }
  assert.equal(value.data.sharing, "not-authorized");
  assert.equal(value.data.compatibilityScore, null);
  assert.deepEqual(value.data.events, []);
  assert.equal(value.data.promotionId, undefined);
  assert.ok(value.limits.some((l) => l.includes("não autoriza compartilhar")));
  assert.deepEqual(validateCalculation(value, "synastry"), value);
  const withoutContext = await calculators.synastry(input(), context());
  assert.deepEqual(withoutContext.data.crossAspectStability, s);
  assert.equal(withoutContext.facts.length, 120);
});

test("one hundred nominal conjunctions survive the evidence budget with both same-body directions", async () => {
  const custom = {
    name: "synthetic",
    version: "1",
    async calculate(b) {
      const chart = await provider.calculate(b);
      chart.positions = [...chart.positions].reverse().map((p) => ({
        ...p,
        longitude: 0,
        injectedIdentity: "not-projected",
      }));
      return chart;
    },
  };
  const value = await createSynastryCalculators(policy(), custom).synastry(
    input(),
    context(),
  );
  assert.equal(value.data.crossAspectStability.calculation.aspects.length, 100);
  assert.equal(
    value.facts.filter((f) => f.id.startsWith("cross-")).length,
    100,
  );
  assert.ok(
    value.facts
      .filter((f) => f.id.startsWith("cross-"))
      .every((f) => f.display.includes("conjunção")),
  );
  assert.ok(value.facts.some((f) => f.id === "cross-sun-sun"));
  assert.ok(value.facts.some((f) => f.id === "cross-sun-moon"));
  assert.ok(value.facts.some((f) => f.id === "cross-moon-sun"));
  assert.ok(Buffer.byteLength(JSON.stringify(value)) < 200000);
  assert.ok(!JSON.stringify(value).includes("injectedIdentity"));
});

test("explicit policy and both inputs are captured before asynchronous mutation", async () => {
  const configured = policy(),
    request = input(),
    originalPartner = { ...request.partner };
  request.context = "Contexto original";
  let calls = 0,
    retained;
  const custom = {
    name: "synthetic",
    version: "1",
    async calculate(b) {
      calls++;
      if (calls === 1) {
        const chart = await provider.calculate(b);
        retained = chart;
        request.partner.utcInstant = "2026-01-01T00:00:00Z";
        request.partner.longitude = 170;
        request.context = "Contexto mutado";
        configured.aspects[0].orbDegrees = 20;
        return chart;
      }
      assert.deepEqual(b, originalPartner);
      retained.positions[0].longitude = 100;
      return provider.calculate(b);
    },
  };
  const calculators = createSynastryCalculators(configured, custom);
  configured.id = "mutated-after-factory";
  const value = await calculators.synastry(request, context());
  assert.equal(calls, 2);
  assert.equal(value.facts.at(-1).display, "Contexto original");
  assert.equal(
    value.data.crossAspectStability.calculation.policy.id,
    "qa-synastry-explicit",
  );
  assert.equal(
    value.data.crossAspectStability.calculation.policy.aspects[0].orbDegrees,
    5,
  );
  assert.deepEqual(
    value.data.first.positions,
    (await provider.calculate(birth)).positions,
  );
});

test("missing consent, invalid records and client policy fail before provider work", async () => {
  let calls = 0;
  const calculators = createSynastryCalculators(policy(), {
    name: "spy",
    version: "1",
    async calculate() {
      calls++;
      throw Error("unexpected");
    },
  });
  const cases = [
    (v) => {
      v.consent.partner = false;
    },
    (v) => {
      v.consent.storage = false;
    },
    (v) => {
      delete v.partner;
    },
    (v) => {
      v.partner.utcInstant = "2100-01-01T00:00:00Z";
    },
    (v) => {
      v.birth.latitude = 91;
    },
    (v) => {
      v.partner.longitude = Infinity;
    },
    (v) => {
      v.productId = "pair-preview";
    },
    (v) => {
      v.policy = policy();
    },
  ];
  for (const change of cases) {
    const v = input();
    change(v);
    await assert.rejects(
      calculators.synastry(v, context()),
      (e) => e.code === "input_invalid",
    );
  }
  assert.equal(calls, 0);
  assert.throws(() => createSynastryCalculators(), RangeError);
  const overlapping = policy();
  overlapping.aspects[0].orbDegrees = 60;
  assert.throws(() => createSynastryCalculators(overlapping), RangeError);
});

test("invalid candidate coordinates, frames and excessive evidence fail closed", async () => {
  for (const mutate of [
    (c) => {
      c.positions[0].longitude = 360;
    },
    (c) => {
      c.provenance.referenceFrame = "incompatible";
    },
    (c) => {
      c.provenance.zodiac = "sidereal";
    },
    (c) => {
      c.provenance.provider = "x".repeat(400);
    },
  ]) {
    let calls = 0;
    const custom = {
      name: "synthetic",
      version: "1",
      async calculate(b) {
        calls++;
        const c = await provider.calculate(b);
        if (calls === 2) mutate(c);
        return c;
      },
    };
    await assert.rejects(
      createSynastryCalculators(policy(), custom).synastry(input(), context()),
      (e) => e.code === "calculation_invalid",
    );
  }
});

test("abort fences the pair before work and after the second candidate", async () => {
  const before = new AbortController();
  before.abort();
  let calls = 0;
  const custom = {
    name: "synthetic",
    version: "1",
    async calculate(b) {
      calls++;
      const c = await provider.calculate(b);
      if (calls === 2) after.abort();
      return c;
    },
  };
  const calculators = createSynastryCalculators(policy(), custom);
  await assert.rejects(calculators.synastry(input(), context(before.signal)), {
    name: "AbortError",
  });
  assert.equal(calls, 0);
  const after = new AbortController();
  await assert.rejects(calculators.synastry(input(), context(after.signal)), {
    name: "AbortError",
  });
  assert.equal(calls, 2);
});
