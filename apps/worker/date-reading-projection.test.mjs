import test from "node:test";
import assert from "node:assert/strict";
import { createContextCalculators } from "./src/context-calculators.ts";
import { validDateReadingProjection } from "./src/date-reading-projection.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";

const input = (targetDate = "2026-09-29", context) => ({
  version: "atv-workflow/1.0.0",
  productId: "date-reading",
  targetDate,
  birth: {
    localDateTime: "2000-01-01T09:00:00",
    utcInstant: "2000-01-01T12:00:00Z",
    timezone: "UTC-03:00",
    latitude: 70,
    longitude: -40,
    locationSource: "synthetic-projection-test",
  },
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: false,
    continuity: false,
  },
  ...(context === undefined ? {} : { context }),
});
const calculate = (value) =>
  createContextCalculators()["date-reading"](value, {
    runId: "00000000-0000-4000-8000-000000000150",
    signal: new AbortController().signal,
  });

test("date projection accepts UTC sample boundaries and preserves reported context independently of natal geometry", async () => {
  for (const date of ["1900-01-01", "2000-02-29", "2099-12-31"]) {
    const value = await calculate(input(date));
    assert.equal(validDateReadingProjection(value), true, date);
    assert.equal(
      prepareProductFacts("date-reading", value).status,
      "prepared",
      date,
    );
    assert.equal(value.data.first.provenance.temporal.offsetSeconds, -10800);
    assert.equal(
      value.data.second.provenance.temporal.utcInstant,
      `${date}T12:00:00.000Z`,
    );
  }
  const report = "  " + "🧭".repeat(596) + "\n\ttext";
  assert.equal(report.length, 1200);
  const plain = await calculate(input()),
    reported = await calculate(input("2026-09-29", report));
  assert.deepEqual(reported.facts.slice(0, -1), plain.facts);
  assert.deepEqual(reported.data.first.positions, plain.data.first.positions);
  assert.deepEqual(reported.data.second.positions, plain.data.second.positions);
  assert.equal(validDateReadingProjection(reported), true);
  const prepared = prepareProductFacts("date-reading", reported);
  assert.equal(prepared.status, "prepared");
  assert.equal(prepared.facts.facts.at(-1).display, report);
  assert.equal(prepared.facts.facts.at(-1).kind, "reported");
  assert.equal(prepared.facts.completeness, "partial");
});

test("date projection rejects divergent persisted data, provenance, display and hidden metadata before normalization", async () => {
  const value = await calculate(input("2026-09-29", "Contexto sintético."));
  const mutations = [
    (v) => (v.version = "atv-context-product-calculation/9"),
    (v) => (v.status = "recorded"),
    (v) => (v.kind = "relationship"),
    (v) => (v.extra = true),
    (v) => (v.data.productId = "pair-preview"),
    (v) => (v.data.extra = true),
    (v) => delete v.data.sharing,
    (v) => (v.data.projection.dateSampling = "whole-day"),
    (v) => (v.data.projection.extra = true),
    (v) => (v.data.targetDate = "2026-02-30"),
    (v) => (v.data.targetDate = "2026-09-30"),
    (v) => (v.data.sampleInstant = "2026-09-29T09:00:00.000Z"),
    (v) => (v.data.sharing = "authorized"),
    (v) => (v.data.compatibilityScore = 90),
    (v) => v.data.aspects.push({ type: "conjunction" }),
    (v) => v.data.events.push({ at: "12:00" }),
    (v) => (v.data.first.role = "sample"),
    (v) => (v.data.second.role = "natal"),
    (v) => (v.data.first.input = { birth: "hidden" }),
    (v) => v.data.first.positions.pop(),
    (v) => v.data.second.positions.reverse(),
    (v) => (v.data.second.positions[0].body = "moon"),
    (v) => (v.data.first.positions[0].longitude = 360),
    (v) => (v.data.second.positions[1].longitude += 1),
    (v) => (v.data.first.positions[0].latitude = 91),
    (v) => (v.data.first.positions[0].distanceAu = 0),
    (v) => (v.data.first.positions[0].retrograde = "false"),
    (v) => (v.data.first.positions[0].house = 1),
    (v) => (v.data.first.provenance.provider = "other-provider"),
    (v) => (v.data.second.provenance.providerVersion = "9"),
    (v) => (v.data.second.provenance.algorithmVersion = "other-adapter"),
    (v) => (v.data.first.provenance.contract.productionPromotion = true),
    (v) => (v.data.first.provenance.accuracyStatus = "homologated"),
    (v) => (v.data.first.provenance.zodiac = "sidereal"),
    (v) => (v.data.first.provenance.referenceFrame = "heliocentric"),
    (v) => (v.data.first.provenance.houseSystem = "whole-sign"),
    (v) => (v.data.first.provenance.calculatedAt = "invalid"),
    (v) => (v.data.first.provenance.dataManifest = {}),
    (v) =>
      (v.data.second.provenance.dataManifest = {
        ...v.data.second.provenance.dataManifest,
        extra: true,
      }),
    (v) => {
      v.data.second.provenance.provider = "other-provider";
      for (const fact of v.facts.slice(10, 20))
        fact.source = fact.source.replace(
          v.data.first.provenance.provider,
          "other-provider",
        );
    },
    (v) => (v.data.first.provenance.warnings = []),
    (v) =>
      (v.data.first.provenance.temporal.utcInstant =
        "2026-02-30T12:00:00.000Z"),
    (v) =>
      (v.data.first.provenance.temporal.utcInstant =
        "1899-12-31T12:00:00.000Z"),
    (v) =>
      (v.data.second.provenance.temporal.utcInstant =
        "2026-09-30T12:00:00.000Z"),
    (v) => (v.data.second.provenance.temporal.julianDayUt1Approx += 1),
    (v) => (v.data.second.provenance.temporal.dut1Seconds = 0.1),
    (v) => (v.data.second.provenance.temporal.timezoneMode = "iana"),
    (v) => (v.data.second.provenance.temporal.offsetSeconds = -10800),
    (v) => (v.data.first.provenance.temporal.timezoneRules = "unversioned"),
    (v) => (v.data.first.provenance.temporal.inputScale = "TT"),
    (v) => (v.data.first.provenance.temporal.engineScale = "exact-UT1"),
    (v) => (v.data.first.provenance.temporal.deltaTSeconds = Infinity),
    (v) => (v.data.first.provenance.temporal.extra = true),
    (v) => (v.facts[0].display = "Base natal · Sol: 1.000000° de Áries"),
    (v) => (v.facts[0].source = "untrusted"),
    (v) => (v.facts[0].kind = "reported"),
    (v) => (v.facts[0].metadata = { approved: true }),
    (v) => v.facts.splice(20, 1),
    (v) => v.facts.push({ ...v.facts[0] }),
    (v) => v.facts.reverse(),
    (v) => (v.facts[20].display = "Dia inteiro favorável."),
    (v) => (v.facts[20].source = "input.targetDate"),
    (v) => (v.facts.at(-1).kind = "calculated"),
    (v) => (v.facts.at(-1).source = "provider"),
    (v) => (v.facts.at(-1).metadata = { approved: true }),
    (v) => (v.facts.at(-1).display = " "),
    (v) => (v.facts.at(-1).display = "a".repeat(1201)),
    (v) => (v.facts.at(-1).display = "a\u0085b"),
    (v) => (v.facts.at(-1).display = "a\ud800b"),
    (v) => v.limits.pop(),
    (v) => v.limits.shift(),
    (v) => v.limits.push("Homologado."),
  ];
  for (const [index, mutate] of mutations.entries()) {
    const changed = structuredClone(value);
    mutate(changed);
    assert.equal(
      validDateReadingProjection(changed),
      false,
      `mutation ${index}`,
    );
    assert.deepEqual(
      prepareProductFacts("date-reading", changed),
      { status: "blocked", reason: "calculation_invalid" },
      `mutation ${index}`,
    );
  }
});
