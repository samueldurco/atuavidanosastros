import test from "node:test";
import assert from "node:assert/strict";
import { createContextCalculators } from "./src/context-calculators.ts";
import { validPairPreviewProjection } from "./src/pair-preview-projection.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";

const birth = (
  date = "2000-01-01",
  time = "09:00:00",
  utc = "2000-01-01T12:00:00Z",
  timezone = "UTC-03:00",
) => ({
  localDateTime: date + "T" + time,
  utcInstant: utc,
  timezone,
  latitude: 70,
  longitude: -40,
  locationSource: "synthetic-pair-projection-test",
});
const input = (context) => ({
  version: "atv-workflow/1.0.0",
  productId: "pair-preview",
  birth: birth(),
  partner: birth("2001-02-03", "10:00:00", "2001-02-03T08:00:00Z", "UTC+02:00"),
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: true,
    continuity: false,
  },
  ...(context === undefined ? {} : { context }),
});
const calculate = (value) =>
  createContextCalculators()["pair-preview"](value, {
    runId: "00000000-0000-4000-8000-000000000153",
    signal: new AbortController().signal,
  });

test("pair projection keeps six separate positions, accepts both civil boundaries and preserves generic reported context independently of geometry", async () => {
  for (const date of ["1900-01-01", "2000-02-29", "2099-12-31"]) {
    const request = input();
    request.birth = birth(date, "00:00:00", date + "T00:00:00Z", "UTC");
    request.partner = birth(date, "23:59:59", date + "T23:59:59Z", "UTC");
    const value = await calculate(request);
    assert.equal(validPairPreviewProjection(value), true, date);
    assert.equal(
      prepareProductFacts("pair-preview", value).status,
      "prepared",
      date,
    );
    assert.deepEqual(
      value.facts.map((f) => f.id),
      [
        "person-a-moon",
        "person-a-venus",
        "person-a-mars",
        "person-b-moon",
        "person-b-venus",
        "person-b-mars",
      ],
    );
    assert.equal(value.data.targetDate, null);
    assert.equal(value.data.sampleInstant, null);
    assert.equal(value.data.compatibilityScore, null);
    assert.equal(value.data.sharing, "not-authorized");
  }
  const request = input();
  request.partner = birth(
    "2001-07-03",
    "10:00:00",
    "2001-07-03T13:00:00Z",
    "America/Sao_Paulo",
  );
  const iana = await calculate(request);
  assert.equal(validPairPreviewProjection(iana), true);
  assert.equal(iana.data.second.provenance.temporal.timezoneMode, "iana");
  assert.equal(iana.data.second.provenance.temporal.offsetSeconds, -10800);
  const report = "  " + "🧭".repeat(596) + "\n\ttext";
  assert.equal(report.length, 1200);
  const plain = await calculate(input()),
    reported = await calculate(input(report));
  assert.equal(plain.data.first.provenance.temporal.offsetSeconds, -10800);
  assert.equal(plain.data.second.provenance.temporal.offsetSeconds, 7200);
  assert.deepEqual(reported.facts.slice(0, -1), plain.facts);
  assert.deepEqual(reported.data.first.positions, plain.data.first.positions);
  assert.deepEqual(reported.data.second.positions, plain.data.second.positions);
  assert.equal(validPairPreviewProjection(reported), true);
  const prepared = prepareProductFacts("pair-preview", reported);
  assert.equal(prepared.status, "prepared");
  assert.equal(prepared.facts.facts.at(-1).display, report);
  assert.equal(prepared.facts.facts.at(-1).kind, "reported");
  assert.equal(prepared.facts.completeness, "partial");
});

test("pair projection rejects divergent persisted data, provenance, display and hidden metadata before normalization", async () => {
  const value = await calculate(input("Contexto sintético."));
  const mutations = [
    (v) => (v.version = "atv-context-product-calculation/9"),
    (v) => (v.status = "recorded"),
    (v) => (v.kind = "cycles"),
    (v) => (v.extra = true),
    (v) => (v.data.productId = "date-reading"),
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
    (v) => (v.data.first.role = "person-b"),
    (v) => (v.data.second.role = "person-a"),
    (v) => (v.data.first.input = { birth: "hidden" }),
    (v) => v.data.first.positions.pop(),
    (v) => v.data.second.positions.reverse(),
    (v) => (v.data.second.positions[0].body = "sun"),
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
      for (const fact of v.facts.slice(3, 6))
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
    (v) => (v.data.first.provenance.temporal.timezoneRules = "unversioned"),
    (v) => (v.data.first.provenance.temporal.inputScale = "TT"),
    (v) => (v.data.first.provenance.temporal.engineScale = "exact-UT1"),
    (v) => (v.data.first.provenance.temporal.deltaTSeconds = Infinity),
    (v) => (v.data.first.provenance.temporal.extra = true),
    (v) => (v.facts[0].display = "Base natal · Sol: 1.000000° de Áries"),
    (v) => (v.facts[0].source = "untrusted"),
    (v) => (v.facts[0].kind = "reported"),
    (v) => (v.facts[0].metadata = { approved: true }),
    (v) => v.facts.splice(5, 1),
    (v) => v.facts.push({ ...v.facts[0] }),
    (v) => v.facts.reverse(),
    (v) => (v.facts[5].display = "Compatibilidade garantida."),
    (v) => (v.facts[5].source = "input.partner"),
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
      validPairPreviewProjection(changed),
      false,
      `mutation ${index}`,
    );
    assert.deepEqual(
      prepareProductFacts("pair-preview", changed),
      { status: "blocked", reason: "calculation_invalid" },
      `mutation ${index}`,
    );
  }
});
