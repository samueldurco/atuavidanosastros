import test from "node:test";
import { calculateTarot } from "@atv/domain";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { SCHEMA_VERSION } from "@atv/ai";
import { createPurposeCalculators } from "./src/purpose-calculators.ts";
import { createNatalCalculators } from "./src/natal-calculators.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";
import {
  careerEditorialTestFixture,
  threePillarsEditorialTestFixture,
  birthChartEditorialTestFixture,
  ascendantEditorialTestFixture,
  midheavenEditorialTestFixture,
  dailyCardEditorialTestFixture,
  tarotFocusEditorialTestFixture,
} from "../../scripts/helpers/career-editorial-test-fixture.mjs";
import {
  prepareProductDelivery,
  PRODUCT_DELIVERY_VERSION,
} from "./src/product-delivery.ts";

// Generic Tarot projection tests use Três Perguntas; single-card profiles are tested separately.
// Genuine deterministic calculation; interpretation and reviews remain synthetic fixtures.
const genericCalculation = await calculateTarot(
  {
    version: "atv-workflow/1.0.0",
    productId: "three-questions",
    questions: [
      "Que possibilidade posso observar?",
      "Que tensão posso considerar?",
      "Que alternativa posso explorar?",
    ],
    context: "Contexto sintético B",
    consent: {
      storage: true,
      policyVersion: "atv-input-consent/1",
      partner: false,
      continuity: false,
    },
  },
  "00000000-0000-4000-8000-000000000001",
  new AbortController().signal,
);
function draft() {
  return {
    runId: "00000000-0000-4000-8000-000000000001",
    revision: 3,
    productId: "three-questions",
    tier: "free",
    calculation: structuredClone(genericCalculation),
    output: {
      schemaVersion: SCHEMA_VERSION,
      capability: "tarot-reflection",
      scope: "partial",
      title: "Um recorte sintético",
      claims: [
        {
          id: "c1",
          kind: "fact",
          text: genericCalculation.facts[1].display,
          evidence: ["card-1"],
        },
        {
          id: "c2",
          kind: "interpretation",
          text: "Uma interpretação sintética para observar.",
          evidence: ["tarot-context"],
        },
        {
          id: "c3",
          kind: "hypothesis",
          text: "Uma hipótese a explorar, sem certeza.",
          evidence: ["card-1", "tarot-context"],
        },
      ],
      relations: [
        {
          kind: "tension",
          claimIds: ["c1", "c2"],
          text: "Relação sintética entre os dois recortes.",
        },
      ],
      synthesis: [
        {
          claimIds: ["c1", "c3"],
          text: "A síntese mantém abertas alternativas pessoais.",
        },
      ],
      reflections: [
        "Que possibilidade merece atenção?",
        "Qual pequeno experimento você escolheria?",
      ],
      limits: ["Fixture de projeção, não leitura aprovada."],
    },
  };
}
function contentTexts(content) {
  return content.sections.map((section) => section.text).join("\n");
}

test("career compass delivers recognizable headings while preserving every claim, question and reference", async () => {
  const input = draft();
  input.productId = "career-compass";
  input.calculation = await createPurposeCalculators()["career-compass"](
    {
      version: "atv-workflow/1.0.0",
      productId: input.productId,
      birth: {
        localDateTime: "2000-01-01T12:00:00",
        utcInstant: "2000-01-01T12:00:00Z",
        timezone: "UTC",
        latitude: 0,
        longitude: 0,
        locationSource: "synthetic",
      },
      context: "Contexto profissional sintético",
      consent: {
        storage: true,
        policyVersion: "atv-input-consent/1",
        partner: false,
        continuity: false,
      },
    },
    { runId: input.runId, signal: new AbortController().signal },
  );
  const facts = prepareProductFacts(input.productId, input.calculation);
  assert.equal(facts.status, "prepared");
  input.output = {
    ...input.output,
    capability: "purpose-direction",
    relations: [],
    ...careerEditorialTestFixture(facts.facts),
  };
  const captured = structuredClone(input);
  const pending = prepareProductDelivery(input);
  input.productId = "daily-card";
  const result = await pending;
  const expected = await prepareProductDelivery(captured);
  assert.deepEqual(result, expected);
  assert.equal(result.status, "prepared_for_review");
  assert.equal(result.publication, "blocked");
  assert.equal("promotionId" in result.content, false);
  assert.equal("reviewDigest" in result.content, false);
  assert.deepEqual(
    result.content.sections.map((section) => section.title),
    [
      "Seu Meio do Céu — Fato [mc]",
      "Direção pública e contribuição — Hipótese [public-direction]",
      "Ambientes e modos de trabalhar — Hipótese [work-possibilities]",
      "Tensão ou excesso possível — Hipótese [tension-or-excess]",
      "Síntese (1) e três perguntas práticas",
    ],
  );
  for (const [index, claim] of captured.output.claims.entries()) {
    assert.equal(result.content.sections[index].text, claim.text);
    assert.deepEqual(result.content.sections[index].evidence, claim.evidence);
  }
  const all = contentTexts(result.content);
  for (const question of captured.output.reflections)
    assert.equal(all.split(question).length, 2);
  assert.ok(all.includes(captured.output.synthesis[0].text));
  assert.ok(
    all.includes("public-direction, work-possibilities, tension-or-excess"),
  );
  // The new version requires a new final-delivery review, even when content otherwise matches.
  const legacy = { ...result.content, version: "atv-product-delivery/1.0.0" };
  const legacyDigest = createHash("sha256")
    .update(
      JSON.stringify({
        version: legacy.version,
        basisDigest: result.basisDigest,
        outputDigest: result.outputDigest,
        content: legacy,
      }),
    )
    .digest("hex");
  assert.notEqual(legacyDigest, result.deliveryDigest);
});

test("three pillars preserve complete content and bases under product headings, with a new delivery digest", async () => {
  const input = draft();
  input.productId = "three-pillars";
  input.calculation = await createNatalCalculators()["three-pillars"](
    {
      version: "atv-workflow/1.0.0",
      productId: input.productId,
      birth: {
        localDateTime: "2000-01-01T12:00:00",
        utcInstant: "2000-01-01T12:00:00Z",
        timezone: "UTC",
        latitude: 0,
        longitude: 0,
        locationSource: "synthetic",
      },
      consent: {
        storage: true,
        policyVersion: "atv-input-consent/1",
        partner: false,
        continuity: false,
      },
    },
    { runId: input.runId, signal: new AbortController().signal },
  );
  const facts = prepareProductFacts(input.productId, input.calculation);
  assert.equal(facts.status, "prepared");
  input.output = {
    ...input.output,
    capability: "natal-synthesis",
    ...threePillarsEditorialTestFixture(facts.facts),
  };
  const captured = structuredClone(input);
  const pending = prepareProductDelivery(input);
  input.productId = "daily-card";
  const result = await pending;
  assert.deepEqual(result, await prepareProductDelivery(captured));
  assert.equal(result.status, "prepared_for_review");
  assert.equal(result.publication, "blocked");
  assert.equal("promotionId" in result.content, false);
  assert.equal("reviewDigest" in result.content, false);
  assert.deepEqual(
    result.content.sections.map((s) => s.title),
    [
      "Seu Sol — Fato [pillar-0]",
      "Sua Lua — Fato [pillar-1]",
      "Seu Ascendente — Fato [pillar-2]",
      "Sol e Lua: intenção e necessidade — Hipótese [sun-moon-dynamics]",
      "Ascendente: abordagem e expressão — Hipótese [ascendant-expression]",
      "Relações (1)",
      "Síntese dos Três Pilares (1) e três perguntas práticas",
    ],
  );
  for (const [i, claim] of captured.output.claims.entries()) {
    assert.equal(result.content.sections[i].text, claim.text);
    assert.deepEqual(result.content.sections[i].evidence, claim.evidence);
  }
  const all = contentTexts(result.content);
  for (const part of [
    ...captured.output.relations,
    ...captured.output.synthesis,
  ])
    assert.ok(all.includes(part.text));
  for (const question of captured.output.reflections)
    assert.equal(all.split(question).length, 2);
  for (const section of result.content.sections.slice(5))
    assert.deepEqual(
      new Set(section.evidence),
      new Set(["position-sun", "position-moon", "angle-ascendant"]),
    );
  const legacy = { ...result.content, version: "atv-product-delivery/1.1.0" };
  const legacyDigest = createHash("sha256")
    .update(
      JSON.stringify({
        version: legacy.version,
        basisDigest: result.basisDigest,
        outputDigest: result.outputDigest,
        content: legacy,
      }),
    )
    .digest("hex");
  assert.notEqual(legacyDigest, result.deliveryDigest);
});

test("ascendant delivery preserves every claim and question without inventing other factors or approval", async () => {
  const input = draft();
  input.productId = "ascendant";
  input.calculation = await createNatalCalculators().ascendant(
    {
      version: "atv-workflow/1.0.0",
      productId: "ascendant",
      birth: {
        localDateTime: "2000-01-01T12:00:00",
        utcInstant: "2000-01-01T12:00:00Z",
        timezone: "UTC",
        latitude: 0,
        longitude: 0,
        locationSource: "synthetic",
      },
      consent: {
        storage: true,
        policyVersion: "atv-input-consent/1",
        partner: false,
        continuity: false,
      },
    },
    { runId: input.runId, signal: new AbortController().signal },
  );
  const facts = prepareProductFacts(input.productId, input.calculation);
  assert.equal(facts.status, "prepared");
  input.output = {
    ...input.output,
    capability: "natal-synthesis",
    ...ascendantEditorialTestFixture(facts.facts),
  };
  const result = await prepareProductDelivery(input);
  assert.equal(result.status, "prepared_for_review");
  assert.equal(result.publication, "blocked");
  assert.equal("promotionId" in result.content, false);
  assert.equal("reviewDigest" in result.content, false);
  assert.deepEqual(
    result.content.sections.map((s) => s.title),
    [
      "Seu Ascendente — Fato [asc-fact]",
      "Abordagem e primeiro contato — Hipótese [ascendant-approach]",
      "Possibilidades de expressão — Hipótese [ascendant-possibilities]",
      "Tensão ou excesso possível — Hipótese [ascendant-tension]",
      "Síntese do Ascendente (1) e três perguntas práticas",
    ],
  );
  for (const [index, claim] of input.output.claims.entries()) {
    assert.equal(result.content.sections[index].text, claim.text);
    assert.deepEqual(result.content.sections[index].evidence, claim.evidence);
  }
  for (const question of input.output.reflections)
    assert.equal(contentTexts(result.content).split(question).length, 2);
  assert.ok(
    result.content.sections.every(
      (s) => s.evidence.join() === "angle-ascendant",
    ),
  );
  const legacy = { ...result.content, version: "atv-product-delivery/1.3.0" };
  const oldDigest = createHash("sha256")
    .update(
      JSON.stringify({
        version: legacy.version,
        basisDigest: result.basisDigest,
        outputDigest: result.outputDigest,
        content: legacy,
      }),
    )
    .digest("hex");
  assert.notEqual(oldDigest, result.deliveryDigest);
});

test("daily card delivery preserves the saved card, reported question and all coverage without granting publication", async () => {
  const input = draft();
  input.productId = "daily-card";
  input.calculation = await calculateTarot(
    {
      version: "atv-workflow/1.0.0",
      productId: "daily-card",
      questions: ["Que possibilidade posso observar?"],
      context: "Relato sintético consentido",
      consent: {
        storage: true,
        policyVersion: "atv-input-consent/1",
        partner: false,
        continuity: false,
      },
    },
    input.runId,
    new AbortController().signal,
  );
  const saved = structuredClone(input.calculation);
  const facts = prepareProductFacts(input.productId, input.calculation);
  assert.equal(facts.status, "prepared");
  input.output = {
    ...input.output,
    ...dailyCardEditorialTestFixture(facts.facts),
  };
  const result = await prepareProductDelivery(input);
  assert.equal(result.status, "prepared_for_review");
  assert.equal(result.publication, "blocked");
  assert.equal("promotionId" in result.content, false);
  assert.equal("reviewDigest" in result.content, false);
  assert.deepEqual(
    result.content.sections.map((s) => s.title),
    [
      "Carta registrada — Fato [daily-card-fact]",
      "Pergunta relatada — Fato [daily-question-fact]",
      "Possibilidade e observação do dia — Hipótese [daily-observation]",
      "Conexão com sua pergunta — Hipótese [daily-question]",
      "Um pequeno experimento — Hipótese [daily-practice]",
      "Síntese da Carta do Dia (1) e uma pergunta prática",
    ],
  );
  for (const [index, claim] of input.output.claims.entries()) {
    assert.equal(result.content.sections[index].text, claim.text);
    assert.deepEqual(result.content.sections[index].evidence, claim.evidence);
  }
  assert.deepEqual(result.content.sections[5].evidence, [
    "card-1",
    "question-1",
  ]);
  for (const question of input.output.reflections)
    assert.equal(contentTexts(result.content).split(question).length, 2);
  assert.deepEqual(input.calculation, saved);
  const again = await prepareProductDelivery(input);
  assert.equal(again.deliveryDigest, result.deliveryDigest);
  const legacy = { ...result.content, version: "atv-product-delivery/1.5.0" };
  const oldDigest = createHash("sha256")
    .update(
      JSON.stringify({
        version: legacy.version,
        basisDigest: result.basisDigest,
        outputDigest: result.outputDigest,
        content: legacy,
      }),
    )
    .digest("hex");
  assert.notEqual(oldDigest, result.deliveryDigest);
  for (const change of [
    (d) => {
      d.calculation.facts.find((f) => f.id === "card-1").display =
        "Carta incoerente";
    },
    (d) => {
      d.output.claims = d.output.claims.filter(
        (c) => c.id !== "daily-practice",
      );
    },
    (d) => {
      d.output.reflections.push("Outra pergunta?");
    },
  ]) {
    const invalid = structuredClone(input);
    change(invalid);
    assert.equal((await prepareProductDelivery(invalid)).status, "rejected");
  }
});

test("midheaven delivery preserves every claim and question without inventing other factors or approval", async () => {
  const input = draft();
  input.productId = "midheaven";
  input.calculation = await createNatalCalculators().midheaven(
    {
      version: "atv-workflow/1.0.0",
      productId: "midheaven",
      birth: {
        localDateTime: "2000-01-01T12:00:00",
        utcInstant: "2000-01-01T12:00:00Z",
        timezone: "UTC",
        latitude: 0,
        longitude: 0,
        locationSource: "synthetic",
      },
      consent: {
        storage: true,
        policyVersion: "atv-input-consent/1",
        partner: false,
        continuity: false,
      },
    },
    { runId: input.runId, signal: new AbortController().signal },
  );
  const facts = prepareProductFacts(input.productId, input.calculation);
  assert.equal(facts.status, "prepared");
  input.output = {
    ...input.output,
    capability: "purpose-direction",
    ...midheavenEditorialTestFixture(facts.facts),
  };
  const result = await prepareProductDelivery(input);
  assert.equal(result.status, "prepared_for_review");
  assert.equal(result.publication, "blocked");
  assert.equal("promotionId" in result.content, false);
  assert.equal("reviewDigest" in result.content, false);
  assert.deepEqual(
    result.content.sections.map((s) => s.title),
    [
      "Seu Meio do Céu — Fato [mc-fact]",
      "Direção pública e contribuição — Hipótese [midheaven-contribution]",
      "Ambientes e modos de trabalhar — Hipótese [midheaven-possibilities]",
      "Tensão ou excesso possível — Hipótese [midheaven-tension]",
      "Síntese do Meio do Céu (1) e três perguntas práticas",
    ],
  );
  for (const [index, claim] of input.output.claims.entries()) {
    assert.equal(result.content.sections[index].text, claim.text);
    assert.deepEqual(result.content.sections[index].evidence, claim.evidence);
  }
  for (const question of input.output.reflections)
    assert.equal(contentTexts(result.content).split(question).length, 2);
  assert.ok(
    result.content.sections.every(
      (s) => s.evidence.join() === "angle-midheaven",
    ),
  );
  const legacy = { ...result.content, version: "atv-product-delivery/1.4.0" };
  const oldDigest = createHash("sha256")
    .update(
      JSON.stringify({
        version: legacy.version,
        basisDigest: result.basisDigest,
        outputDigest: result.outputDigest,
        content: legacy,
      }),
    )
    .digest("hex");
  assert.notEqual(oldDigest, result.deliveryDigest);
});

test("birth chart delivery keeps eleven roles, twenty-four bases and three questions without granting publication", async () => {
  const input = draft();
  input.productId = "birth-chart";
  input.tier = "intermediate";
  input.calculation = await createNatalCalculators()[input.productId](
    {
      version: "atv-workflow/1.0.0",
      productId: input.productId,
      birth: {
        localDateTime: "2000-01-01T12:00:00",
        utcInstant: "2000-01-01T12:00:00Z",
        timezone: "UTC",
        latitude: 0,
        longitude: 0,
        locationSource: "synthetic",
      },
      consent: {
        storage: true,
        policyVersion: "atv-input-consent/1",
        partner: false,
        continuity: false,
      },
    },
    { runId: input.runId, signal: new AbortController().signal },
  );
  const facts = prepareProductFacts(input.productId, input.calculation);
  assert.equal(facts.status, "prepared");
  input.output = {
    ...input.output,
    capability: "natal-synthesis",
    ...birthChartEditorialTestFixture(facts.facts),
  };
  const result = await prepareProductDelivery(input);
  assert.equal(result.status, "prepared_for_review");
  assert.equal(result.publication, "blocked");
  assert.equal("promotionId" in result.content, false);
  assert.equal("reviewDigest" in result.content, false);
  assert.equal(result.content.sections.length, 13);
  assert.deepEqual(
    result.content.sections.slice(0, 11).map((s) => s.title),
    [
      "Sol: identidade e intenção — Hipótese [solar-identity]",
      "Lua: necessidades e acolhimento — Hipótese [lunar-needs]",
      "Mercúrio, Vênus e Marte: recursos pessoais — Hipótese [personal-resources]",
      "Júpiter e Saturno: expansão e estrutura — Hipótese [social-resources]",
      "Urano, Netuno e Plutão: símbolos coletivos — Hipótese [collective-symbols]",
      "Ascendente: abordagem e expressão — Hipótese [ascendant-approach]",
      "Meio do Céu: direção e contribuição — Hipótese [midheaven-contribution]",
      "Casas 1 a 3: presença, recursos e trocas — Hipótese [house-sectors-1-3]",
      "Casas 4 a 6: raízes, criação e cotidiano — Hipótese [house-sectors-4-6]",
      "Casas 7 a 9: vínculos, partilhas e horizontes — Hipótese [house-sectors-7-9]",
      "Casas 10 a 12: contribuição, redes e recolhimento — Hipótese [house-sectors-10-12]",
    ],
  );
  for (const [i, claim] of input.output.claims.entries()) {
    assert.equal(result.content.sections[i].text, claim.text);
    assert.deepEqual(result.content.sections[i].evidence, claim.evidence);
  }
  const synthesis = result.content.sections.at(-1);
  assert.equal(
    synthesis.title,
    "Síntese do Mapa Astral (1) e três perguntas práticas",
  );
  assert.equal(new Set(synthesis.evidence).size, 24);
  assert.deepEqual(
    new Set(synthesis.evidence),
    new Set(input.calculation.facts.map((f) => f.id)),
  );
  const all = contentTexts(result.content);
  for (const question of input.output.reflections)
    assert.equal(all.split(question).length, 2);
  for (const part of [...input.output.relations, ...input.output.synthesis])
    assert.ok(all.includes(part.text));
  const legacy = { ...result.content, version: "atv-product-delivery/1.2.0" };
  const legacyDigest = createHash("sha256")
    .update(
      JSON.stringify({
        version: legacy.version,
        basisDigest: result.basisDigest,
        outputDigest: result.outputDigest,
        content: legacy,
      }),
    )
    .digest("hex");
  assert.notEqual(legacyDigest, result.deliveryDigest);
  input.output.claims.find((c) => c.id === "house-sectors-10-12").evidence = [
    "house-10",
    "house-11",
  ];
  assert.equal((await prepareProductDelivery(input)).status, "rejected");
});

test("projects every Lab passage, semantic type, claim link and fact reference without granting publication", async () => {
  const input = draft(),
    result = await prepareProductDelivery(input);
  assert.equal(result.status, "prepared_for_review");
  assert.equal(result.publication, "blocked");
  assert.equal(result.reason, "delivery_review_and_promotion_required");
  const { content } = result;
  assert.equal(content.version, PRODUCT_DELIVERY_VERSION);
  assert.equal(content.title, input.output.title);
  assert.equal(content.sections.length, 5);
  assert.deepEqual(
    content.sections.slice(0, 3).map((s) => s.title),
    ["Fato [c1]", "Interpretação [c2]", "Hipótese [c3]"],
  );
  assert.deepEqual(
    content.sections.slice(0, 3).map((s) => s.text),
    input.output.claims.map((c) => c.text),
  );
  assert.deepEqual(
    content.sections.map((s) => s.evidence),
    [
      ["card-1"],
      ["tarot-context"],
      ["card-1", "tarot-context"],
      ["card-1", "tarot-context"],
      ["card-1", "tarot-context"],
    ],
  );
  const all = contentTexts(content);
  for (const text of [
    ...input.output.claims.map((c) => c.text),
    ...input.output.relations.map((r) => r.text),
    ...input.output.synthesis.map((s) => s.text),
    ...input.output.reflections,
  ])
    assert.equal(all.split(text).length, 2);
  assert.match(all, /Tensão entre afirmações: c1, c2/);
  assert.match(all, /Afirmações de base: c1, c3/);
  assert.match(all, /referências desta seção correspondem somente à síntese/);
  assert.deepEqual(content.limits, [
    "Escopo declarado: parcial.",
    ...input.output.limits,
  ]);
  assert.equal("promotionId" in content, false);
  assert.equal("reviewDigest" in content, false);
  assert.equal(
    result.deliveryDigest,
    createHash("sha256")
      .update(
        JSON.stringify({
          version: PRODUCT_DELIVERY_VERSION,
          basisDigest: result.basisDigest,
          outputDigest: result.outputDigest,
          content,
        }),
      )
      .digest("hex"),
  );
});

test("invalid schemas, unsafe passages and false references never produce delivery content", async () => {
  for (const mutate of [
    (d) => (d.output.extra = true),
    (d) => (d.output.claims[0].text = "Fato alterado"),
    (d) => (d.output.claims[1].evidence = ["unknown"]),
    (d) => (d.output.relations[0].claimIds = ["c1", "unknown"]),
    (d) => (d.output.synthesis[0].claimIds = ["unknown"]),
    (d) => (d.output.claims[1].id = "c1"),
    (d) => (d.output.scope = "integrated"),
    (d) => (d.output.reflections[0] = "<script>ação</script>"),
    (d) => (d.output.limits[0] = "Seu futuro está garantido"),
    (d) => (d.tier = "__proto__"),
    (d) => (d.productId = "unknown"),
    (d) => (d.revision = -1),
  ]) {
    const input = draft();
    mutate(input);
    const result = await prepareProductDelivery(input);
    assert.equal(result.status, "rejected");
    assert.equal(result.publication, "blocked");
    assert.equal("content" in result, false);
  }
  assert.equal((await prepareProductDelivery(null)).reason, "invalid_input");
});

test("a Lab-valid limit that cannot fit the reader is rejected, never truncated or relabelled", async () => {
  const input = draft();
  input.output.limits = ["x".repeat(1201)];
  const before = structuredClone(input);
  assert.equal(
    (await prepareProductDelivery(input)).reason,
    "delivery_not_representable",
  );
  assert.deepEqual(input, before);
});

function premium() {
  const input = draft();
  input.tier = "premium";
  input.output.claims = Array.from({ length: 24 }, (_, i) => ({
    id: `c${i}`,
    kind: "interpretation",
    text: `Recorte ${i}: possibilidade contextual.`,
    evidence: [i % 2 ? "tarot-context" : "card-1"],
  }));
  input.output.relations = Array.from({ length: 16 }, (_, i) => ({
    kind: i % 2 ? "tension" : "convergence",
    claimIds: ["c0", "c1"],
    text: `Relação ${i}: ${"a".repeat(1250)}`,
  }));
  input.output.synthesis = Array.from({ length: 6 }, (_, i) => ({
    claimIds: ["c0", "c1"],
    text: `Síntese ${i}: observação aberta.`,
  }));
  input.output.reflections = Array.from(
    { length: 6 },
    (_, i) => `Pergunta ${i}: ${"b".repeat(1600)}?`,
  );
  return input;
}

test("maximum premium counts fit bounded groups with all ordered relations and reflections intact", async () => {
  const input = premium(),
    result = await prepareProductDelivery(input);
  assert.equal(result.status, "prepared_for_review");
  const { content } = result;
  assert.ok(content.sections.length <= 40);
  assert.ok(content.sections.every((s) => s.text.length <= 20000));
  const all = contentTexts(content);
  let previous = -1;
  for (const relation of input.output.relations) {
    const at = all.indexOf(relation.text);
    assert.ok(at > previous);
    previous = at;
  }
  for (const question of input.output.reflections)
    assert.ok(content.sections.at(-1).text.includes(question));
  assert.ok(
    content.sections.filter((s) => s.title.startsWith("Relações")).length > 1,
  );
});

test("UTF-8 byte budget is independent of the Lab character limit and refuses oversized delivery", async () => {
  const input = premium();
  input.output.claims.forEach(
    (claim, i) => (claim.text = `Recorte ${i}: ${"界".repeat(1000)}`),
  );
  input.output.relations.forEach(
    (relation, i) => (relation.text = `Relação ${i}: ${"語".repeat(500)}`),
  );
  input.output.reflections = ["Qual associação aparece?"];
  assert.ok(JSON.stringify(input.output).length < 40000);
  assert.equal(
    (await prepareProductDelivery(input)).reason,
    "delivery_not_representable",
  );
});

test("digest binds exact delivery and original run, calculation provenance, revision and tier", async () => {
  const original = await prepareProductDelivery(draft());
  for (const mutate of [
    (d) => (d.runId = "00000000-0000-4000-8000-000000000002"),
    (d) => d.revision++,
    (d) => (d.tier = "premium"),
    (d) =>
      (d.calculation.facts.find((f) => f.id === "tarot-context").display =
        "Outro contexto consentido"),
    (d) => (d.output.claims[1].text += " Outro ponto."),
    (d) => (d.output.relations[0].kind = "convergence"),
    (d) => d.output.reflections.reverse(),
    (d) => d.output.limits.push("Outro limite editorial."),
  ]) {
    const input = draft();
    mutate(input);
    const result = await prepareProductDelivery(input);
    assert.equal(result.status, "prepared_for_review");
    assert.notEqual(result.deliveryDigest, original.deliveryDigest);
  }
});

test("caller mutation during hashing and returned-content mutation cannot change the captured source", async () => {
  const input = draft(),
    baseline = await prepareProductDelivery(input),
    pending = prepareProductDelivery(input);
  input.revision++;
  input.calculation.data.provenance = "changed";
  input.output.claims[0].text = "changed";
  const result = await pending;
  assert.deepEqual(result, baseline);
  result.content.sections[0].text = "changed";
  result.content.limits.push("changed");
  assert.deepEqual(await prepareProductDelivery(draft()), baseline);
});

test("tarot focus delivery preserves the saved card, reported question and all coverage without granting publication", async () => {
  const input = draft();
  input.productId = "tarot-focus";
  input.calculation = await calculateTarot(
    {
      version: "atv-workflow/1.0.0",
      productId: "tarot-focus",
      questions: ["Que possibilidade posso observar?"],
      context: "Relato sintético consentido",
      consent: {
        storage: true,
        policyVersion: "atv-input-consent/1",
        partner: false,
        continuity: false,
      },
    },
    input.runId,
    new AbortController().signal,
  );
  const saved = structuredClone(input.calculation);
  const facts = prepareProductFacts(input.productId, input.calculation);
  assert.equal(facts.status, "prepared");
  input.output = {
    ...input.output,
    ...tarotFocusEditorialTestFixture(facts.facts),
  };
  const result = await prepareProductDelivery(input);
  assert.equal(result.status, "prepared_for_review");
  assert.equal(result.publication, "blocked");
  assert.equal("promotionId" in result.content, false);
  assert.equal("reviewDigest" in result.content, false);
  assert.deepEqual(
    result.content.sections.map((s) => s.title),
    [
      "Carta registrada — Fato [tarot-focus-fact]",
      "Pergunta relatada — Fato [focus-question-fact]",
      "Possibilidade, tensão e alternativa — Hipótese [focus-symbol]",
      "Conexão com sua pergunta — Hipótese [focus-question]",
      "Um pequeno experimento — Hipótese [focus-practice]",
      "Síntese do Foco Agora (1) e uma pergunta prática",
    ],
  );
  for (const [index, claim] of input.output.claims.entries()) {
    assert.equal(result.content.sections[index].text, claim.text);
    assert.deepEqual(result.content.sections[index].evidence, claim.evidence);
  }
  assert.deepEqual(result.content.sections[5].evidence, [
    "card-1",
    "question-1",
    "tarot-context",
  ]);
  for (const question of input.output.reflections)
    assert.equal(contentTexts(result.content).split(question).length, 2);
  assert.deepEqual(input.calculation, saved);
  const again = await prepareProductDelivery(input);
  assert.equal(again.deliveryDigest, result.deliveryDigest);
  const legacy = { ...result.content, version: "atv-product-delivery/1.6.0" };
  const oldDigest = createHash("sha256")
    .update(
      JSON.stringify({
        version: legacy.version,
        basisDigest: result.basisDigest,
        outputDigest: result.outputDigest,
        content: legacy,
      }),
    )
    .digest("hex");
  assert.notEqual(oldDigest, result.deliveryDigest);
  for (const change of [
    (d) => {
      d.calculation.facts.find((f) => f.id === "card-1").display =
        "Carta incoerente";
    },
    (d) => {
      d.output.claims = d.output.claims.filter(
        (c) => c.id !== "focus-practice",
      );
    },
    (d) => {
      d.output.reflections.push("Outra pergunta?");
    },
  ]) {
    const invalid = structuredClone(input);
    change(invalid);
    assert.equal((await prepareProductDelivery(invalid)).status, "rejected");
  }
});
