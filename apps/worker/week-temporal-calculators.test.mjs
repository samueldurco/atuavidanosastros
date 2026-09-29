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
import { prepareProductDelivery } from "./src/product-delivery.ts";
import {
  SCHEMA_VERSION,
  WEEK_TEMPORAL_EDITORIAL_VERSION,
  validateFacts,
  weekTemporalEditorialLimits,
  weekTemporalEvidence,
  weekTemporalRoles,
} from "@atv/ai";

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
  const prepared = prepareProductFacts("week-reading", snapshot);
  assert.equal(prepared.status, "prepared");
  assert.equal(
    prepared.facts.editorialProfile,
    WEEK_TEMPORAL_EDITORIAL_VERSION,
  );
  assert.equal(prepared.facts.facts.length, 12);
  assert.equal(prepared.facts.facts[11].display, snapshot.data.declaredContext);
  assert.equal(validateFacts(prepared.facts), true);
});

test("temporal editorial draft projects counts, context and limits for independent review", async () => {
  const prepared = prepareProductFacts("week-reading", snapshot);
  assert.equal(prepared.status, "prepared");
  const facts = prepared.facts;
  const output = {
    schemaVersion: SCHEMA_VERSION,
    capability: "cycle-context",
    scope: "partial",
    title: "Fixture estrutural de contagens da Semana, sem aprovação",
    claims: weekTemporalRoles.map((id) => ({
      id,
      kind: "hypothesis",
      evidence: weekTemporalEvidence(facts, id),
      text: `Possibilidade de observar ${id} sem prever acontecimentos.`,
    })),
    relations: [],
    synthesis: [
      {
        claimIds: [...weekTemporalRoles],
        text: "Panorama dos registros: observar as contagens sem atribuir prioridade.",
      },
      {
        claimIds: [...weekTemporalRoles],
        text: "Escolha reversível: revisar a hipótese após a observação.",
      },
    ],
    reflections: [
      "O que você observou durante o intervalo UTC?",
      "Como seu contexto declarado orienta uma pergunta?",
      "Qual escolha reversível você pode revisar depois?",
    ],
    limits: [...weekTemporalEditorialLimits],
  };
  const draft = {
    runId: "00000000-0000-4000-8000-000000000001",
    revision: 1,
    productId: "week-reading",
    tier: "free",
    calculation: snapshot,
    output,
  };
  const result = await prepareProductDelivery(draft);
  assert.equal(result.status, "prepared_for_review", result.reason);
  assert.equal(result.publication, "blocked");
  assert.equal(result.content.sections.length, 8);
  const registered = result.content.sections.filter((part) =>
    part.title.endsWith("— Fatos registrados"),
  );
  assert.deepEqual(
    registered.flatMap((part) => part.evidence),
    facts.facts.map((fact) => fact.id),
  );
  assert.match(result.content.sections[0].title, /Panorama da busca/);
  assert.match(
    result.content.sections[3].title,
    /Panorama dos registros temporais/,
  );
  assert.match(result.content.sections[6].title, /Panorama dos registros/);
  assert.ok(result.content.limits.includes(weekTemporalEditorialLimits[2]));
  const changed = structuredClone(draft);
  changed.output.claims[1].evidence.pop();
  assert.equal((await prepareProductDelivery(changed)).status, "rejected");
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
