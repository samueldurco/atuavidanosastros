import test from "node:test";
import assert from "node:assert/strict";
import { calculateTarot, tarotDeck } from "@atv/domain";
import { validDailyCardProjection } from "./src/symbolic-calculators.ts";
import { prepareProductFacts } from "./src/product-editorial.ts";

const input = {
  version: "atv-workflow/1.0.0",
  productId: "daily-card",
  questions: ["Que possibilidade posso observar?"],
  context: "Contexto sintético consentido.",
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
    "00000000-0000-4000-8000-000000000132",
    new AbortController().signal,
  );

test("daily-card preserves the saved draw and exact reported question/context without interpreting them", async () => {
  for (const value of [input, { ...input, context: undefined }]) {
    const calculation = await calculate(value),
      before = JSON.stringify(calculation);
    assert.equal(validDailyCardProjection(calculation), true);
    const prepared = prepareProductFacts("daily-card", calculation);
    assert.equal(prepared.status, "prepared");
    assert.deepEqual(prepared.calculation, calculation);
    assert.deepEqual(prepared.facts.facts, calculation.facts);
    assert.equal(prepared.facts.completeness, "partial");
    assert.equal(JSON.stringify(calculation), before);
  }
});

test("daily-card blocks inconsistent identity, question, position, provenance and policy before interpretation", async () => {
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
    cardCount: (c) => c.data.cards.push(structuredClone(c.data.cards[0])),
    missingCards: (c) => (c.data.cards = []),
    unknownCard: (c) => (c.data.cards[0].cardId = "unknown"),
    changedId: (c) =>
      (c.data.cards[0].cardId = tarotDeck.find(
        (card) => card.id !== c.data.cards[0].cardId,
      ).id),
    changedName: (c) =>
      (c.data.cards[0].name = "Nome que não corresponde ao ID"),
    position: (c) => (c.data.cards[0].position = 2),
    questionIndex: (c) => (c.data.cards[0].questionIndex = 1),
    orientation: (c) => (c.data.cards[0].orientation = "reversed"),
    extraCard: (c) => (c.data.cards[0].verdict = "yes"),
    questionCount: (c) => c.data.questions.push("Outra pergunta?"),
    emptyQuestion: (c) => (c.data.questions[0] = " "),
    questionMismatch: (c) => (c.data.questions[0] = "Uma pergunta diferente?"),
    questionId: (c) => (c.facts[0].id = "question-2"),
    questionKind: (c) => (c.facts[0].kind = "calculated"),
    questionSource: (c) => (c.facts[0].source = "inferred"),
    questionDisplay: (c) => (c.facts[0].display = "Texto diferente"),
    cardId: (c) => (c.facts[1].id = "card-2"),
    cardKind: (c) => (c.facts[1].kind = "calculated"),
    cardSource: (c) => (c.facts[1].source = "unknown/1"),
    cardDisplay: (c) => (c.facts[1].display = "Carta divergente"),
    contextId: (c) => (c.facts[2].id = "invented-context"),
    contextKind: (c) => (c.facts[2].kind = "calculated"),
    contextSource: (c) => (c.facts[2].source = "inferred"),
    emptyContext: (c) => (c.facts[2].display = " "),
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
  for (const [label, mutate] of Object.entries(mutations)) {
    const calculation = structuredClone(baseline);
    mutate(calculation);
    const before = JSON.stringify(calculation);
    assert.equal(validDailyCardProjection(calculation), false, label);
    assert.equal(
      prepareProductFacts("daily-card", calculation).status,
      "blocked",
      label,
    );
    assert.equal(JSON.stringify(calculation), before, label);
  }
});
