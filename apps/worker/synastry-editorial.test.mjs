import test from "node:test";
import assert from "node:assert/strict";
import { createSynastryCalculators } from "./src/synastry-calculators.ts";
import {
  prepareProductFacts,
  evaluateProductDraft,
} from "./src/product-editorial.ts";
import {
  SYNASTRY_EDITORIAL_VERSION,
  SYNASTRY_MAX_INPUT_CHARS,
  synastryRoles,
  synastryEvidence,
  synastryBaseLimit,
  synastryConsentLimit,
  synastryScopeLimit,
  validateFacts,
  inspectReading,
  EditorialGateway,
  SCHEMA_VERSION,
  buildPrompt,
  tierLimits,
  parseReading,
} from "../../packages/ai/src/index.ts";

const birth = {
  localDateTime: "2000-01-01T12:00:00",
  utcInstant: "2000-01-01T12:00:00Z",
  timezone: "UTC",
  latitude: 0,
  longitude: 0,
  locationSource: "synthetic-editorial-test",
};
const policy = {
  id: "q".repeat(80),
  version: "v".repeat(80),
  aspects: [
    { kind: "conjunction", orbDegrees: 8 },
    { kind: "sextile", orbDegrees: 5 },
    { kind: "square", orbDegrees: 6 },
    { kind: "trine", orbDegrees: 6 },
    { kind: "opposition", orbDegrees: 8 },
  ],
};
async function calculation(context) {
  return createSynastryCalculators(policy).synastry(
    {
      version: "atv-workflow/1.0.0",
      productId: "synastry",
      birth,
      partner: {
        ...birth,
        localDateTime: "2001-07-03T12:00:00",
        utcInstant: "2001-07-03T12:00:00Z",
      },
      consent: {
        storage: true,
        partner: true,
        continuity: false,
        policyVersion: "atv-input-consent/1",
      },
      ...(context === undefined ? {} : { context }),
    },
    {
      runId: "synthetic-synastry-editorial",
      signal: new AbortController().signal,
    },
  );
}
// This is a transport/coverage specimen, never useful or approved product content.
function specimen(facts) {
  return {
    schemaVersion: SCHEMA_VERSION,
    capability: "relationship-dynamics",
    scope: "partial",
    title: "Fixture estrutural sem homologação",
    claims: synastryRoles.map((id) => ({
      id,
      kind: "hypothesis",
      text: `Fixture estrutural ${id}: na linguagem simbólica, estes fatores permitem explorar possibilidades de conversa; sem aprovação editorial.`,
      evidence: synastryEvidence(facts, id),
    })),
    relations: [],
    synthesis: [
      {
        claimIds: [...synastryRoles],
        text: "Possibilidades simbólicas de exploração consentida; fixture sem aprovação editorial.",
      },
    ],
    reflections: [
      "Que possibilidade de comunicação faz sentido explorar?",
      "Que escolha reversível preserva autonomia na reparação?",
      "Que pequeno experimento de negociação e crescimento pode ser consentido?",
    ],
    limits: [synastryBaseLimit, synastryConsentLimit, synastryScopeLimit],
  };
}
function request(facts, tier = "premium") {
  return {
    correlationId: "synastry-editorial-test",
    tier,
    facts,
    dataClass: "synthetic",
    consentToProcess: true,
  };
}
function gateway(output, observations) {
  return new EditorialGateway({
    enabled: true,
    mode: "lab",
    providers: [
      {
        id: "synthetic",
        model: "fixture-v1",
        kind: "fixture",
        async generate(payload) {
          observations.calls++;
          observations.payload = payload;
          return { output, inputTokens: 1, outputTokens: 1 };
        },
      },
    ],
    ledger: {
      async reserve() {
        observations.reservations++;
        return true;
      },
    },
  });
}

test("maximum policy and optional UTF-16 context preserve all 120/121 facts through a finite premium prompt", async () => {
  for (const context of [undefined, "😀".repeat(600)]) {
    const value = await calculation(context),
      original = structuredClone(value);
    const prepared = prepareProductFacts("synastry", value);
    assert.equal(prepared.status, "prepared");
    assert.equal(prepared.facts.editorialProfile, SYNASTRY_EDITORIAL_VERSION);
    assert.deepEqual(prepared.facts.facts, original.facts);
    assert.equal(validateFacts(prepared.facts), true);
    assert.deepEqual(value, original);
    assert.ok(prepared.facts.facts.some((fact) => fact.source.length > 160));
    const output = specimen(prepared.facts),
      input = request(prepared.facts),
      payload = buildPrompt(input),
      sent = JSON.parse(payload.prompt);
    assert.equal(sent.facts.facts.length, context === undefined ? 120 : 121);
    assert.deepEqual(
      sent.facts.facts.slice(0, 120),
      prepared.facts.facts.slice(0, 120),
    );
    assert.ok(payload.prompt.length > tierLimits.premium.maxInputChars);
    assert.ok(payload.prompt.length <= SYNASTRY_MAX_INPUT_CHARS);
    assert.ok(
      JSON.stringify(output).length <= tierLimits.premium.maxOutputChars,
    );
    assert.ok(parseReading(output, "premium"));
    const review = inspectReading(output, prepared.facts);
    assert.equal(
      review.status,
      "needs_editorial_review",
      JSON.stringify(review.findings),
    );
    const observations = { calls: 0, reservations: 0 };
    assert.equal(
      (await gateway(output, observations).generate(input)).status,
      "candidate",
    );
    assert.equal(observations.calls, 1);
    assert.equal(observations.reservations, 1);
    assert.deepEqual(JSON.parse(observations.payload.prompt).facts, sent.facts);
    assert.equal(
      observations.payload.maxOutputTokens,
      tierLimits.premium.maxOutputTokens,
    );
  }
});

test("synastry premium admission cannot widen another profile or bypass finite fact topology", async () => {
  const facts = prepareProductFacts(
    "synastry",
    await calculation("Contexto informado."),
  ).facts;
  const variants = [
    (f) => delete f.editorialProfile,
    (f) => (f.editorialProfile = "atv-pair-preview-editorial/1.0.0"),
    (f) => (f.completeness = "complete"),
    (f) => (f.capability = "natal-structure"),
    (f) => f.facts.splice(20, 1),
    (f) =>
      f.facts.push({
        id: "extra",
        kind: "calculated",
        display: "Extra",
        source: "extra",
      }),
    (f) => f.facts.reverse(),
    (f) => (f.facts[20].source = "s".repeat(301)),
    (f) => (f.facts[20].display = "Precisão aprovada."),
    (f) => (f.facts[20].display = "x".repeat(241)),
    (f) => (f.facts[0].display = "x".repeat(121)),
    (f) => (f.facts[120].kind = "calculated"),
    (f) => (f.facts[120].source = "engine"),
    (f) => (f.facts[120].display = "x".repeat(1201)),
    (f) => (f.facts[120].display = "bad\u0000context"),
  ];
  for (const mutate of variants) {
    const changed = structuredClone(facts);
    mutate(changed);
    assert.equal(validateFacts(changed), false);
  }
  for (const tier of ["free", "intermediate"]) {
    const observations = { calls: 0, reservations: 0 },
      result = await gateway(specimen(facts), observations).generate(
        request(facts, tier),
      );
    assert.equal(result.reason, "insufficient_tier");
    assert.equal(observations.calls, 0);
    assert.equal(observations.reservations, 0);
  }
});

test("all 100 ordered pairs and nine theme groups are bound without unsupported output relations", async () => {
  const facts = prepareProductFacts(
      "synastry",
      await calculation("Contexto de conversa."),
    ).facts,
    output = specimen(facts);
  const covered = new Set(
    output.claims
      .slice(0, 10)
      .flatMap((claim) =>
        claim.evidence.filter((id) => id.startsWith("cross-")),
      ),
  );
  assert.equal(covered.size, 100);
  assert.equal(output.claims.length, 19);
  for (const claim of output.claims) assert.ok(claim.evidence.length <= 40);
  for (const claim of output.claims.slice(0, 10))
    assert.equal(claim.evidence.includes("personal-context"), false);
  for (const claim of output.claims.slice(10))
    assert.equal(claim.evidence.includes("personal-context"), true);
  const variants = [
    (o) => o.claims.splice(10, 1),
    (o) => o.claims[0].evidence.pop(),
    (o) => (o.claims[10].evidence = o.claims[11].evidence),
    (o) => o.claims[10].evidence.pop(),
    (o) => (o.claims[0].kind = "interpretation"),
    (o) => o.claims.reverse(),
    (o) => o.synthesis[0].claimIds.pop(),
    (o) =>
      o.relations.push({
        kind: "convergence",
        claimIds: [synastryRoles[0], synastryRoles[1]],
        text: "Relação não recebida.",
      }),
    (o) => (o.reflections[1] = o.reflections[0]),
    (o) => o.limits.pop(),
    (o) => (o.scope = "integrated"),
  ];
  for (const mutate of variants) {
    const changed = structuredClone(output);
    mutate(changed);
    assert.equal(inspectReading(changed, facts).status, "rejected");
  }
});

test("the maximum admitted field lengths fit the product budget and extra request context remains bounded", async () => {
  const facts = structuredClone(
    prepareProductFacts("synastry", await calculation("😀".repeat(600))).facts,
  );
  // Envelope topology specimen, deliberately not a coherent persisted calculation.
  const suffix = ";atv-synastry-calculation/1.0.0",
    unknown = " Precisão não certificada; estabilidade desconhecida.";
  for (const [index, fact] of facts.facts.slice(0, 120).entries()) {
    fact.source = "s".repeat(300 - suffix.length) + suffix;
    fact.display =
      index < 20 ? "p".repeat(120) : "n".repeat(240 - unknown.length) + unknown;
  }
  assert.equal(validateFacts(facts), true);
  const payload = buildPrompt({ ...request(facts), context: "😀".repeat(600) });
  assert.ok(payload.prompt.length <= SYNASTRY_MAX_INPUT_CHARS);
  assert.ok(payload.prompt.length > tierLimits.premium.maxInputChars);
  const observations = { calls: 0, reservations: 0 };
  const result = await gateway(specimen(facts), observations).generate({
    ...request(facts),
    context: "x".repeat(1201),
  });
  assert.equal(result.reason, "input_limit");
  assert.equal(observations.calls, 0);
  assert.equal(observations.reservations, 0);
});

test("coverage and offline provider candidate do not grant trusted review or runtime publication", async () => {
  const value = await calculation(),
    facts = prepareProductFacts("synastry", value).facts;
  const assessment = await evaluateProductDraft({
    runId: "00000000-0000-4000-8000-000000000158",
    revision: 0,
    productId: "synastry",
    calculation: value,
    output: specimen(facts),
    tier: "premium",
  });
  assert.equal(assessment.status, "needs_editorial_review");
  assert.equal(assessment.publication, "blocked");
});
