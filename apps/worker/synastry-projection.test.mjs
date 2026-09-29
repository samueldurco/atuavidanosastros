import test from "node:test";
import assert from "node:assert/strict";
import { bodies, CaelusEphemerisProvider } from "@atv/astrology";
import { createSynastryCalculators } from "./src/synastry-calculators.ts";
import { validSynastryProjection } from "./src/synastry-projection.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";
import { validateCalculation } from "./src/product-processing.ts";

const birth = {
  localDateTime: "2000-01-01T12:00:00",
  utcInstant: "2000-01-01T12:00:00Z",
  timezone: "UTC",
  latitude: 0,
  longitude: 0,
  locationSource: "synthetic-projection-test",
};
const input = (context) => ({
  version: "atv-workflow/1.0.0",
  productId: "synastry",
  birth,
  partner: {
    ...birth,
    localDateTime: "2001-02-03T10:00:00",
    utcInstant: "2001-02-03T10:00:00Z",
  },
  consent: {
    storage: true,
    partner: true,
    continuity: false,
    policyVersion: "atv-input-consent/1",
  },
  ...(context === undefined ? {} : { context }),
});
const policy = {
  id: "qa-synastry-projection",
  version: "1.0.0",
  aspects: [
    { kind: "conjunction", orbDegrees: 5 },
    { kind: "sextile", orbDegrees: 3 },
    { kind: "square", orbDegrees: 5 },
    { kind: "trine", orbDegrees: 5 },
    { kind: "opposition", orbDegrees: 5 },
  ],
};
const calculate = createSynastryCalculators(policy).synastry;
const snapshot = (context) =>
  calculate(input(context), {
    runId: "synthetic-synastry-projection",
    signal: new AbortController().signal,
  });
const blocked = { status: "blocked", reason: "calculation_invalid" };

test("all 120/121 persisted facts are coherent without admission through the generic 40-fact budget", async () => {
  for (const context of [
    undefined,
    "Contexto consentido para explorar comunicação.",
    "😀".repeat(600),
  ]) {
    const value = await snapshot(context);
    assert.equal(validSynastryProjection(value), true);
    assert.equal(value.facts.length, context === undefined ? 120 : 121);
    assert.deepEqual(prepareProductFacts("synastry", value), {
      status: "blocked",
      reason: "facts_not_representable",
    });
  }
});

test("every original pair, position, policy, uncertainty, consent and limit is bound before normalization", async () => {
  const value = await snapshot("Contexto registrado.");
  const mutations = [
    ["missing fact", (s) => s.facts.splice(52, 1)],
    ["reordered fact", (s) => s.facts.reverse()],
    ["altered separation text", (s) => (s.facts[25].display += " alterado")],
    ["altered pair source", (s) => (s.facts[25].source = "outro")],
    ["extra original fact field", (s) => (s.facts[25].accuracy = "certified")],
    ["substituted role fact", (s) => (s.facts[0].id = "person-b-sun")],
    ["position order", (s) => s.data.first.positions.reverse()],
    ["missing position", (s) => s.data.second.positions.pop()],
    ["invalid position", (s) => (s.data.first.positions[0].longitude = 360)],
    [
      "position mismatch",
      (s) => (s.data.second.positions[0].longitude += 0.001),
    ],
    [
      "position private field",
      (s) => (s.data.first.positions[0].name = "synthetic-extra"),
    ],
    ["wrong role", (s) => (s.data.second.role = "person-a")],
    [
      "missing nominal absence assessment",
      (s) => s.data.crossAspectStability.pairs.pop(),
    ],
    [
      "reordered pair assessment",
      (s) => s.data.crossAspectStability.pairs.reverse(),
    ],
    [
      "false precision",
      (s) => (s.data.crossAspectStability.pairs[0].status = "robust"),
    ],
    [
      "invented assumed precision",
      (s) =>
        (s.data.crossAspectStability.assumedLongitudeErrorDegrees.first = 0),
    ],
    [
      "changed numerical guard",
      (s) => (s.data.crossAspectStability.numericalGuardDegrees = 0),
    ],
    [
      "changed algorithm",
      (s) =>
        (s.data.crossAspectStability.calculation.algorithmVersion =
          "unversioned"),
    ],
    [
      "changed pair cardinality",
      (s) => (s.data.crossAspectStability.calculation.pairsEvaluated = 99),
    ],
    [
      "changed coordinate basis",
      (s) =>
        (s.data.crossAspectStability.calculation.inputPositions.first[0].longitude += 0.1),
    ],
    [
      "changed policy",
      (s) =>
        (s.data.crossAspectStability.calculation.policy.aspects[0].orbDegrees = 0),
    ],
    [
      "overlapping policy",
      (s) =>
        (s.data.crossAspectStability.calculation.policy.aspects[0].orbDegrees = 180),
    ],
    [
      "extra policy field",
      (s) => (s.data.crossAspectStability.calculation.policy.approved = true),
    ],
    [
      "missing policy",
      (s) => delete s.data.crossAspectStability.calculation.policy,
    ],
    [
      "extra stability field",
      (s) => (s.data.crossAspectStability.approved = true),
    ],
    [
      "false projection authority",
      (s) => (s.data.projection.policyApproval = "approved"),
    ],
    ["missing partner consent", (s) => (s.data.consent.partner = false)],
    ["extra consent authority", (s) => (s.data.consent.sharing = true)],
    [
      "different consent policy",
      (s) => (s.data.consent.policyVersion = "unversioned"),
    ],
    ["compatibility score", (s) => (s.data.compatibilityScore = 100)],
    ["sharing grant", (s) => (s.data.sharing = "authorized")],
    ["extra event", (s) => s.data.events.push({ at: "synthetic" })],
    ["raw birth input", (s) => (s.data.birth = birth)],
    ["missing base limit", (s) => s.limits.splice(0, 1)],
    [
      "missing precision limit",
      (s) => (s.limits = s.limits.filter((l) => !l.includes("cem pares"))),
    ],
    ["missing consent limit", (s) => s.limits.pop()],
    ["blank context", (s) => (s.facts.at(-1).display = " ")],
    ["wrong context kind", (s) => (s.facts.at(-1).kind = "calculated")],
    ["wrong context source", (s) => (s.facts.at(-1).source = "inferred")],
    ["extra top-level authority", (s) => (s.approved = true)],
  ];
  for (const [name, mutate] of mutations) {
    const candidate = structuredClone(value);
    mutate(candidate);
    assert.equal(validSynastryProjection(candidate), false, name);
    assert.deepEqual(prepareProductFacts("synastry", candidate), blocked, name);
  }
  const extra = structuredClone(value);
  extra.facts[25].approved = true;
  assert.ok(
    validateCalculation(extra, "synastry"),
    "generic normalization accepts then removes extra fact metadata",
  );
  assert.equal(
    Object.hasOwn(validateCalculation(extra, "synastry").facts[25], "approved"),
    false,
  );
  assert.deepEqual(
    prepareProductFacts("synastry", extra),
    blocked,
    "original metadata is examined first",
  );
});

test("both independent provider and temporal provenances are checked without source-authentication claims", async () => {
  const value = await snapshot();
  for (const side of ["first", "second"])
    for (const [name, mutate] of [
      ["missing provider", (p) => delete p.provider],
      ["false contract", (p) => (p.contract.productionPromotion = true)],
      ["false accuracy", (p) => (p.accuracyStatus = "certified")],
      ["wrong zodiac", (p) => (p.zodiac = "sidereal")],
      ["wrong frame", (p) => (p.referenceFrame = "heliocentric")],
      ["unversioned timestamp", (p) => (p.calculatedAt = "yesterday")],
      ["empty manifest", (p) => (p.dataManifest = {})],
      ["private provenance key", (p) => (p.name = "synthetic")],
      ["empty warnings", (p) => (p.warnings = [])],
      ["changed JD", (p) => (p.temporal.julianDayUt1Approx += 1)],
      ["false DUT1", (p) => (p.temporal.dut1Seconds = 0)],
      ["false timescale", (p) => (p.temporal.engineScale = "TT")],
      ["changed timezone", (p) => (p.temporal.timezoneRules = "unknown")],
      ["extra temporal field", (p) => (p.temporal.birthName = "synthetic")],
      ["invalid deltaT", (p) => (p.temporal.deltaTSeconds = "unknown")],
      ["invalid offset", (p) => (p.temporal.offsetSeconds = 86401)],
    ]) {
      const candidate = structuredClone(value);
      mutate(candidate.data[side].provenance);
      assert.equal(
        validSynastryProjection(candidate),
        false,
        side + ": " + name,
      );
      assert.deepEqual(prepareProductFacts("synastry", candidate), blocked);
    }
  const reordered = structuredClone(value);
  reordered.data.crossAspectStability = Object.fromEntries(
    Object.entries(reordered.data.crossAspectStability).reverse(),
  );
  reordered.data.crossAspectStability.calculation.policy = Object.fromEntries(
    Object.entries(
      reordered.data.crossAspectStability.calculation.policy,
    ).reverse(),
  );
  assert.equal(
    validSynastryProjection(reordered),
    true,
    "object-key order is not evidence",
  );
});

test("100 nominal absences remain unknown and malformed original policy fails closed", async () => {
  const base = new CaelusEphemerisProvider();
  const provider = {
    calculate: async (v) => {
      const chart = await base.calculate(v);
      return {
        ...chart,
        positions: bodies.map((body) => ({
          body,
          longitude: 0,
          latitude: 0,
          distanceAu: 1,
          retrograde: false,
        })),
      };
    },
  };
  const value = await createSynastryCalculators(
    {
      id: "qa-absence",
      version: "1",
      aspects: [{ kind: "trine", orbDegrees: 0 }],
    },
    provider,
  ).synastry(input(), {
    runId: "synthetic-absence",
    signal: new AbortController().signal,
  });
  assert.equal(value.data.crossAspectStability.calculation.aspects.length, 0);
  assert.equal(value.data.crossAspectStability.pairs.length, 100);
  assert.equal(validSynastryProjection(value), true);
  for (const bad of [
    null,
    {},
    [],
    { id: "bad", version: "1", aspects: [{ kind: "invalid", orbDegrees: 1 }] },
  ]) {
    const candidate = structuredClone(value);
    candidate.data.crossAspectStability.calculation.policy = bad;
    assert.equal(validSynastryProjection(candidate), false);
    assert.deepEqual(prepareProductFacts("synastry", candidate), blocked);
  }
});
