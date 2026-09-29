import test from "node:test";
import assert from "node:assert/strict";
import { CaelusEphemerisProvider } from "@atv/astrology";
import { createCoupleDossierCalculators } from "./src/couple-dossier-calculators.ts";
import {
  coupleDossierProductContract,
  coupleDossierLimit,
  validCoupleDossierProjection,
} from "./src/couple-dossier-projection.ts";
import { createSynastryCalculators } from "./src/synastry-calculators.ts";
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
const input = () => ({
  version: "atv-workflow/1.0.0",
  productId: "couple-dossier",
  birth: { ...birth },
  partner: {
    ...birth,
    localDateTime: "2001-02-03T10:00:00",
    utcInstant: "2001-02-03T10:00:00Z",
  },
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: true,
    continuity: false,
  },
});
const policy = () => ({
  id: "qa-couple-dossier-explicit",
  version: "1.0.0",
  aspects: [
    { kind: "conjunction", orbDegrees: 5 },
    { kind: "sextile", orbDegrees: 3 },
    { kind: "square", orbDegrees: 5 },
    { kind: "trine", orbDegrees: 5 },
    { kind: "opposition", orbDegrees: 5 },
  ],
});
const context = (signal = new AbortController().signal) => ({
  runId: "00000000-0000-4000-8000-000000000001",
  signal,
});
const realProvider = new CaelusEphemerisProvider();
const fixedProvider = {
  name: realProvider.name,
  version: realProvider.version,
  async calculate(b) {
    const chart = await realProvider.calculate(b);
    chart.provenance.calculatedAt = "2026-09-29T00:00:00.000Z";
    return chart;
  },
};
const calculate = createCoupleDossierCalculators(policy(), fixedProvider)[
  "couple-dossier"
];

test("Dossier retains every original Synastry fact and provenance within the bounded envelope", async () => {
  const value = input();
  value.context = "Queremos conversar sobre autonomia e acordos.";
  value.consent.continuity = true;
  const result = await calculate(value, context());
  const original = await createSynastryCalculators(
    policy(),
    fixedProvider,
  ).synastry({ ...value, productId: "synastry" }, context());
  assert.deepEqual(result.data.base, original);
  assert.deepEqual(result.facts, original.facts);
  assert.equal(result.facts.length, 121);
  assert.equal(result.data.base.data.first.positions.length, 10);
  assert.equal(result.data.base.data.second.positions.length, 10);
  assert.equal(result.data.base.data.crossAspectStability.pairs.length, 100);
  assert.deepEqual(result.limits, [...original.limits, coupleDossierLimit]);
  assert.deepEqual(result.data.projection, coupleDossierProductContract);
  assert.equal(result.data.base.data.compatibilityScore, null);
  assert.deepEqual(result.data.base.data.events, []);
  assert.equal(result.data.base.data.sharing, "not-authorized");
  assert.equal(result.data.projection.continuity, "not-consulted");
  assert.equal(validCoupleDossierProjection(result), true);
  assert.ok(validateCalculation(result, "couple-dossier"));
  assert.ok(Buffer.byteLength(JSON.stringify(result)) < 200000);
  assert.equal(JSON.stringify(result).includes("synthetic"), false);
  assert.equal(JSON.stringify(result).includes("localDateTime"), false);
  result.facts[0].display = "mutated";
  assert.notEqual(result.data.base.facts[0].display, "mutated");
  assert.equal(validCoupleDossierProjection(result), false);
});

test("reported context is optional and cannot alter geometry or consult history", async () => {
  const plain = await calculate(input(), context());
  const value = input();
  value.context = "Gostaríamos de reparar um desacordo.";
  const contextual = await calculate(value, context());
  assert.equal(plain.facts.length, 120);
  assert.deepEqual(
    contextual.facts.filter((f) => f.kind === "calculated"),
    plain.facts,
  );
  assert.deepEqual(contextual.data.base.data, plain.data.base.data);
  assert.equal(contextual.facts.at(-1).source, "input.context");
  assert.equal(contextual.data.projection.interpretation, "not-produced");
});

test("both consented inputs are validated before any provider work", async () => {
  let calls = 0;
  const provider = {
    name: "qa",
    version: "1",
    async calculate() {
      calls++;
      throw Error("unexpected work");
    },
  };
  const fn = createCoupleDossierCalculators(policy(), provider)[
    "couple-dossier"
  ];
  const changes = [
    (v) => {
      delete v.partner;
    },
    (v) => {
      v.consent.partner = false;
    },
    (v) => {
      v.consent.storage = false;
    },
    (v) => {
      v.birth.utcInstant = "1800-01-01T12:00:00Z";
      v.birth.localDateTime = "1800-01-01T12:00:00";
    },
    (v) => {
      v.partner.utcInstant = "1800-01-01T12:00:00Z";
      v.partner.localDateTime = "1800-01-01T12:00:00";
    },
    (v) => {
      v.productId = "synastry";
    },
    (v) => {
      v.aspectPolicy = policy();
    },
    (v) => {
      v.compatibilityScore = 100;
    },
    (v) => {
      v.partner.name = "private";
    },
  ];
  for (const change of changes) {
    const value = input();
    change(value);
    await assert.rejects(fn(value, context()), { code: "input_invalid" });
  }
  assert.equal(calls, 0);
  assert.throws(() =>
    createCoupleDossierCalculators({ ...policy(), aspects: [] }),
  );
  assert.equal(createProductCalculators()["couple-dossier"], undefined);
});

test("policy and input are captured before asynchronous provider work", async () => {
  const p = policy(),
    value = input(),
    real = new CaelusEphemerisProvider();
  let calls = 0;
  const provider = {
    name: real.name,
    version: real.version,
    async calculate(b) {
      calls++;
      if (calls === 1) {
        value.partner.utcInstant = "invalid";
        value.context = "late mutation";
      }
      return real.calculate(b);
    },
  };
  const fn = createCoupleDossierCalculators(p, provider)["couple-dossier"];
  p.id = "mutated";
  p.aspects[0].orbDegrees = 0;
  const result = await fn(value, context());
  assert.equal(calls, 2);
  assert.equal(result.facts.length, 120);
  assert.equal(
    result.data.base.data.crossAspectStability.calculation.policy.id,
    "qa-couple-dossier-explicit",
  );
  assert.equal(validCoupleDossierProjection(result), true);
});

test("abort fences and invalid provider results never become a Dossier", async () => {
  const aborted = new AbortController();
  aborted.abort();
  await assert.rejects(calculate(input(), context(aborted.signal)), {
    name: "AbortError",
  });
  let calls = 0;
  const abort = new AbortController(),
    real = new CaelusEphemerisProvider();
  const provider = {
    name: real.name,
    version: real.version,
    async calculate(b) {
      calls++;
      const chart = await real.calculate(b);
      abort.abort();
      return chart;
    },
  };
  await assert.rejects(
    createCoupleDossierCalculators(policy(), provider)["couple-dossier"](
      input(),
      context(abort.signal),
    ),
    { name: "AbortError" },
  );
  assert.equal(calls, 1);
  const invalid = {
    name: "invalid",
    version: "1",
    async calculate() {
      return {};
    },
  };
  await assert.rejects(
    createCoupleDossierCalculators(policy(), invalid)["couple-dossier"](
      input(),
      context(),
    ),
    { code: "calculation_invalid" },
  );
});

test("Dossier guard rejects composition substitutions and corruptions of the original base", async () => {
  const original = await calculate(input(), context());
  const changes = [
    (v) => {
      v.data.base.data.first.positions[0].longitude += 1;
    },
    (v) => {
      v.data.base.data.crossAspectStability.pairs.pop();
    },
    (v) => {
      v.data.base.data.compatibilityScore = 90;
    },
    (v) => {
      v.data.base.data.events.push({ instant: "2000-01-01T12:00:00Z" });
    },
    (v) => {
      v.data.base.facts[0].source = "dossier relabelled source";
    },
    (v) => {
      v.facts.pop();
    },
    (v) => {
      v.facts.reverse();
    },
    (v) => {
      v.facts[0].kind = "reported";
    },
    (v) => {
      v.limits.pop();
    },
    (v) => {
      v.data.projection.continuity = "consulted";
    },
    (v) => {
      v.data.projection.completeness = "complete";
    },
    (v) => {
      v.data.projection.approved = undefined;
    },
    (v) => {
      v.facts[0].private = undefined;
    },
    (v) => {
      v.data.base = null;
    },
    (v) => {
      v.data.history = [];
    },
    (v) => {
      v.data.productId = "synastry";
    },
    (v) => {
      v.version = "unknown";
    },
    (v) => {
      v.status = "recorded";
    },
    (v) => {
      v.approved = true;
    },
  ];
  for (const change of changes) {
    const value = structuredClone(original);
    change(value);
    assert.equal(validCoupleDossierProjection(value), false);
  }
  const reordered = structuredClone(original);
  reordered.data.projection = Object.fromEntries(
    Object.entries(reordered.data.projection).reverse(),
  );
  assert.equal(validCoupleDossierProjection(reordered), true);
  assert.equal(validCoupleDossierProjection(null), false);
});
