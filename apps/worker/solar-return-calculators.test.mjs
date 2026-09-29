import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSolarReturnCalculators,
  solarReturnProductContract,
} from "./src/solar-return-calculators.ts";
import { createProductCalculators } from "./src/product-runtime.ts";
import { ProcessingError } from "./src/product-processing.ts";
import { buildSolarReturnCalendar } from "./src/solar-return-calendar.ts";

const birth = {
  localDateTime: "2000-09-09T12:00:00",
  utcInstant: "2000-09-09T15:00:00Z",
  timezone: "America/Sao_Paulo",
  latitude: -23.5,
  longitude: -46.6,
  locationSource: "synthetic",
};
const location = {
  city: "Recife",
  timezone: "America/Recife",
  latitude: -8.05,
  longitude: -34.9,
  locationSource: "synthetic-birthday-city",
};
const input = {
  version: "atv-workflow/1.0.0",
  productId: "solar-return",
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: false,
    continuity: false,
  },
  birth,
  targetDate: "2026-09-09",
  returnYear: 2026,
  returnLocation: location,
  context: "Prioridade declarada: descansar.",
};
const scope = () => ({
  runId: "synthetic",
  signal: new AbortController().signal,
});

test("solar return finds the natal Sun longitude at the declared birthday city", async () => {
  assert.equal(createProductCalculators()["solar-return"], undefined);
  assert.equal(
    typeof createProductCalculators({ experimentalSolarReturnBase: true })[
      "solar-return"
    ],
    "function",
  );
  const result = await createSolarReturnCalculators()["solar-return"](
    input,
    scope(),
  );
  assert.equal(result.version, solarReturnProductContract.version);
  assert.equal(result.status, "experimental");
  assert.equal(result.kind, "cycles");
  assert.equal(result.data.productId, "solar-return");
  assert.ok(result.data.returnInstant.startsWith("2026-09-"));
  assert.ok(result.data.residualDegrees <= 0.00002);
  assert.equal(
    result.data.returnProvenance.temporal.utcInstant,
    result.data.returnInstant,
  );
  assert.equal(result.data.positions.length, 10);
  assert.equal(result.data.calendarScaffold.months.length, 12);
  assert.equal(result.data.calendarScaffold.startDate, input.targetDate);
  assert.equal(result.data.calendarScaffold.endDateExclusive, "2027-09-09");
  assert.equal(
    result.facts.find((fact) => fact.id === "birthday-city")?.kind,
    "reported",
  );
  assert.equal(
    result.facts.find((fact) => fact.id === "personal-context")?.kind,
    "reported",
  );
  assert.ok(result.limits.some((limit) => limit.includes("não homologados")));
});

test("solar return rejects an incoherent anchor or unresolvable birthday timezone before ephemeris", async () => {
  let calls = 0;
  const provider = {
    name: "guard",
    version: "test",
    async calculate() {
      calls++;
      throw new Error("unexpected");
    },
  };
  const calculate = createSolarReturnCalculators(provider)["solar-return"];
  for (const bad of [
    { ...input, targetDate: "2026-09-10" },
    { ...input, targetDate: "1999-09-09", returnYear: 1999 },
    { ...input, returnLocation: { ...location, timezone: "Mars/Olympus" } },
    { ...input, returnLocation: { ...location, timezone: "UTC+15:00" } },
    { ...input, returnLocation: { ...location, longitude: 181 } },
  ])
    await assert.rejects(
      calculate(bad, scope()),
      (error) =>
        error instanceof ProcessingError && error.code === "input_invalid",
    );
  assert.equal(calls, 0);
  assert.throws(
    () => createProductCalculators({ experimentalSolarReturnBase: false }),
    /invalid_product_configuration/,
  );
});

test("leap-day birthday anchors to February 28 in a non-leap return year", async () => {
  const leap = {
    ...input,
    birth: {
      ...birth,
      localDateTime: "2000-02-29T12:00:00",
      utcInstant: "2000-02-29T15:00:00Z",
    },
    targetDate: "2027-02-28",
    returnYear: 2027,
  };
  const result = await createSolarReturnCalculators()["solar-return"](
    leap,
    scope(),
  );
  assert.ok(
    result.data.returnInstant.startsWith("2027-02-") ||
      result.data.returnInstant.startsWith("2027-03-"),
  );
  assert.ok(result.data.residualDegrees <= 0.00002);
});

test("birthday city changes the local chart without shifting the geocentric return instant", async () => {
  const calculate = createSolarReturnCalculators()["solar-return"];
  const recife = await calculate(input, scope());
  const london = await calculate(
    {
      ...input,
      returnLocation: {
        city: "London",
        timezone: "Europe/London",
        latitude: 51.5,
        longitude: -0.1,
        locationSource: "synthetic-birthday-city",
      },
    },
    scope(),
  );
  assert.equal(recife.data.returnInstant, london.data.returnInstant);
  assert.notEqual(recife.data.houses.midheaven, london.data.houses.midheaven);
  assert.notEqual(recife.data.localDateTime, london.data.localDateTime);
});

test("authorized important dates stay reported and do not change return geometry", async () => {
  const calculate = createSolarReturnCalculators()["solar-return"];
  const plain = await calculate(input, scope());
  const withDates = await calculate(
    {
      ...input,
      importantDates: {
        authorization: "atv-solar-important-dates/1",
        entries: [{ date: "2027-01-10", label: "Mudança planejada" }],
      },
    },
    scope(),
  );
  assert.equal(withDates.data.returnInstant, plain.data.returnInstant);
  assert.deepEqual(withDates.data.positions, plain.data.positions);
  assert.deepEqual(withDates.data.calendarScaffold.months[4].importantDateIds, [
    "important-date-1",
  ]);
  assert.deepEqual(
    withDates.facts.find((fact) => fact.id === "important-date-1"),
    {
      id: "important-date-1",
      kind: "reported",
      display: "2027-01-10: Mudança planejada",
      source: "input.importantDates.entries[0]",
    },
  );
});

test("civil month windows cover the cycle exactly and retain terminal dates outside month 12", () => {
  const calendar = buildSolarReturnCalendar("2026-01-31", [
    { date: "2026-02-28", label: "Marco no limite" },
    { date: "2026-03-31", label: "Marco no terceiro mês" },
    { date: "2027-01-31", label: "Marco no fim do ciclo" },
  ]);
  assert.equal(calendar.months[0].endDateExclusive, "2026-02-28");
  assert.equal(calendar.months[1].endDateExclusive, "2026-03-31");
  assert.deepEqual(calendar.months[1].importantDateIds, ["important-date-1"]);
  assert.deepEqual(calendar.months[2].importantDateIds, ["important-date-2"]);
  assert.deepEqual(calendar.boundaryImportantDateIds, ["important-date-3"]);
  assert.equal(calendar.months[11].endDateExclusive, "2027-01-31");
  for (let index = 1; index < 12; index++)
    assert.equal(
      calendar.months[index].startDate,
      calendar.months[index - 1].endDateExclusive,
    );
  const leap = buildSolarReturnCalendar("2028-02-29");
  assert.equal(leap.endDateExclusive, "2029-02-28");
  assert.equal(leap.months[1].startDate, "2028-03-29");
  assert.throws(() => buildSolarReturnCalendar("2026-02-30"));
  assert.throws(() =>
    buildSolarReturnCalendar("2026-01-31", [
      { date: "2026-02-31", label: "Data impossível" },
    ]),
  );
});
