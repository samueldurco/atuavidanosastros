import test from "node:test";
import assert from "node:assert/strict";
import { calculateTarot, tarotDeck } from "@atv/domain";
import { validThreeQuestionsProjection } from "./src/symbolic-calculators.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";
const input = {
  version: "atv-workflow/1.0.0",
  productId: "three-questions",
  questions: [
    "Que possibilidade posso observar?",
    "Que limite devo considerar?",
    "Que alternativa posso experimentar?",
  ],
  context: "Relato sintético consentido.",
  consent: {
    storage: true,
    policyVersion: "atv-input-consent/1",
    partner: false,
    continuity: false,
  },
};
const calculate = (value) =>
  calculateTarot(
    value,
    "00000000-0000-4000-8000-000000000141",
    new AbortController().signal,
  );

test("three-questions preserves all three saved pairs and optional reported context without approval", async () => {
  for (const value of [input, { ...input, context: undefined }]) {
    const c = await calculate(value),
      before = JSON.stringify(c),
      p = prepareProductFacts("three-questions", c);
    assert.equal(validThreeQuestionsProjection(c), true);
    assert.equal(p.status, "prepared");
    assert.deepEqual(p.calculation, c);
    assert.deepEqual(p.facts.facts, c.facts);
    assert.equal(p.facts.completeness, "partial");
    assert.equal(p.facts.editorialProfile, "atv-three-questions-editorial/1.0.0");
    assert.equal(c.facts.length, value.context ? 7 : 6);
    assert.equal(new Set(c.data.cards.map((card) => card.cardId)).size, 3);
    assert.equal(c.data.productPolicy, undefined);
    assert.equal(JSON.stringify(c), before);
  }
});

test("three-questions blocks inconsistent saved cardinality, identity, provenance and every positional pair", async () => {
  const baseline = await calculate(input);
  const mutations = {
    version: (c) => (c.version = "unknown/1"),
    status: (c) => (c.status = "experimental"),
    deck: (c) => (c.data.deckVersion = "unknown/1"),
    spread: (c) => (c.data.spreadVersion = "unknown/1"),
    algorithm: (c) => (c.data.drawAlgorithm = "unknown/1"),
    seed: (c) => (c.data.seedSource = "client"),
    replacement: (c) => (c.data.replacement = true),
    reversals: (c) => (c.data.reversals = true),
    review: (c) => (c.data.reviewStatus = "approved"),
    extraData: (c) => (c.data.binaryVerdict = true),
    policy: (c) => (c.data.productPolicy = { approved: true }),
    cardCount: (c) => c.data.cards.pop(),
    extraCard: (c) => c.data.cards.push(structuredClone(c.data.cards[0])),
    questionCount: (c) => c.data.questions.pop(),
    extraQuestion: (c) => c.data.questions.push("Outra pergunta?"),
    missingFact: (c) => c.facts.splice(3, 1),
    order: (c) => ([c.facts[0], c.facts[2]] = [c.facts[2], c.facts[0]]),
    contextId: (c) => (c.facts[6].id = "invented-context"),
    contextKind: (c) => (c.facts[6].kind = "calculated"),
    contextSource: (c) => (c.facts[6].source = "inferred"),
    emptyContext: (c) => (c.facts[6].display = " "),
    extraFact: (c) =>
      c.facts.push({
        id: "invented",
        kind: "reported",
        display: "Extra",
        source: "unknown",
      }),
    missingLimit: (c) => c.limits.pop(),
    approvedLimit: (c) => (c.limits[0] = "Leitura homologada."),
  };
  for (let i = 0; i < 3; i++) {
    const other = (i + 1) % 3;
    Object.assign(mutations, {
      [`duplicate-${i}`]: (c) =>
        (c.data.cards[i] = {
          ...c.data.cards[other],
          position: i + 1,
          questionIndex: i,
        }),
      [`unknown-${i}`]: (c) => (c.data.cards[i].cardId = "unknown"),
      [`changed-id-${i}`]: (c) =>
        (c.data.cards[i].cardId = tarotDeck.find(
          (card) => !c.data.cards.some((drawn) => drawn.cardId === card.id),
        ).id),
      [`changed-name-${i}`]: (c) => (c.data.cards[i].name = "Nome divergente"),
      [`position-${i}`]: (c) => (c.data.cards[i].position = other + 1),
      [`question-index-${i}`]: (c) => (c.data.cards[i].questionIndex = other),
      [`orientation-${i}`]: (c) => (c.data.cards[i].orientation = "reversed"),
      [`card-field-${i}`]: (c) => (c.data.cards[i].verdict = "yes"),
      [`empty-question-${i}`]: (c) => (c.data.questions[i] = " "),
      [`question-mismatch-${i}`]: (c) =>
        (c.data.questions[i] = "Texto divergente?"),
      [`question-id-${i}`]: (c) =>
        (c.facts[i * 2].id = `question-${other + 1}`),
      [`question-kind-${i}`]: (c) => (c.facts[i * 2].kind = "calculated"),
      [`question-source-${i}`]: (c) =>
        (c.facts[i * 2].source = `input.questions[${other}]`),
      [`question-display-${i}`]: (c) =>
        (c.facts[i * 2].display = "Texto divergente"),
      [`fact-card-id-${i}`]: (c) =>
        (c.facts[i * 2 + 1].id = `card-${other + 1}`),
      [`card-kind-${i}`]: (c) => (c.facts[i * 2 + 1].kind = "calculated"),
      [`card-source-${i}`]: (c) => (c.facts[i * 2 + 1].source = "unknown/1"),
      [`card-display-${i}`]: (c) =>
        (c.facts[i * 2 + 1].display = "Carta divergente"),
    });
  }
  for (const [label, mutate] of Object.entries(mutations)) {
    const c = structuredClone(baseline);
    mutate(c);
    const before = JSON.stringify(c);
    assert.equal(validThreeQuestionsProjection(c), false, label);
    assert.equal(
      prepareProductFacts("three-questions", c).status,
      "blocked",
      label,
    );
    assert.equal(JSON.stringify(c), before, label);
  }
});

test("three-questions keeps the draw when reported questions/context change for the same server UUID", async () => {
  const first = await calculate(input),
    second = await calculate({
      ...input,
      questions: [
        "Outra possibilidade?",
        "Outro limite?",
        "Outra alternativa?",
      ],
      context: "Outro relato sintético.",
    });
  assert.deepEqual(second.data.cards, first.data.cards);
  assert.equal(validThreeQuestionsProjection(second), true);
  const prepared = prepareProductFacts("three-questions", second);
  assert.equal(prepared.status, "prepared");
  for (let i = 0; i < 3; i++)
    assert.equal(prepared.facts.facts[i * 2].display, second.data.questions[i]);
  assert.equal(prepared.facts.facts[6].display, "Outro relato sintético.");
});
