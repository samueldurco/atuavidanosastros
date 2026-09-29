import test from "node:test";
import assert from "node:assert/strict";
import {
  WEEK_TEMPORAL_EDITORIAL_VERSION,
  weekTemporalEditorialLimits,
  weekTemporalEvidence,
  weekTemporalOutputLimits,
  weekTemporalRoles,
} from "./week-temporal-reading.ts";
import {
  SCHEMA_VERSION,
  validateFacts,
  type EditorialRequest,
  type FactsEnvelope,
  type Reading,
} from "./contracts.ts";
import { inspectReading } from "./director.ts";
import { parseReading } from "./schema.ts";
import { buildPrompt } from "./prompt.ts";

const bodies = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];
const source = "fixture-engine;atv-week-reading-calculation/1.2.0";
const base: FactsEnvelope = {
  version: "atv-facts/1.0.0",
  capability: "cycle-context",
  completeness: "partial",
  editorialProfile: WEEK_TEMPORAL_EDITORIAL_VERSION,
  facts: [
    {
      id: "week-temporal-summary",
      kind: "calculated",
      source,
      display:
        "Busca experimental 2026-09-29: 10 contatos/cruzamentos nominais e 20 janelas candidatas em sete dias UTC. Grade horária; política explícita synthetic-policy@1. Cobertura e precisão não certificadas.",
    },
    ...bodies.map((body) => ({
      id: `week-temporal-${body}`,
      kind: "calculated" as const,
      source,
      display: `${body}: 1 contatos/cruzamentos nominais; 2 janelas candidatas. Sem classificação de favorabilidade, aplicação/separação ou completude contínua.`,
    })),
    {
      id: "personal-context",
      kind: "reported",
      source: "input.context",
      display: "Quero observar o ritmo da semana sem determinar eventos.",
    },
  ],
};
const reading = (facts: FactsEnvelope): Reading => ({
  schemaVersion: SCHEMA_VERSION,
  capability: "cycle-context",
  scope: "partial",
  title: "Fixture estrutural temporal, sem aprovação",
  claims: weekTemporalRoles.map((id) => ({
    id,
    kind: "hypothesis",
    evidence: weekTemporalEvidence(facts, id),
    text: `Possibilidade de observação reversível para ${id}; a contagem não é uma previsão.`,
  })),
  relations: [],
  synthesis: [
    {
      claimIds: [...weekTemporalRoles],
      text: "Panorama dos registros: observação sintética das contagens, sem prioridade atribuída.",
    },
    {
      claimIds: [...weekTemporalRoles],
      text: "Escolha reversível: observar e rever uma hipótese sem prever eventos.",
    },
  ],
  reflections: [
    "O que observar durante o intervalo UTC?",
    "Como o contexto declarado orienta uma pergunta, sem mudar o cálculo?",
    "Qual escolha reversível você pode rever depois?",
  ],
  limits: [...weekTemporalEditorialLimits],
});

test("temporal profile binds all 11 counts and optional reported context to a bounded partial draft", () => {
  for (const facts of [base, { ...base, facts: base.facts.slice(0, 11) }]) {
    assert.equal(validateFacts(facts), true);
    const output = reading(facts);
    assert.ok(parseReading(output, "free", WEEK_TEMPORAL_EDITORIAL_VERSION));
    assert.equal(
      inspectReading(output, facts).status,
      "needs_editorial_review",
    );
    assert.equal(
      new Set(output.claims.flatMap((claim) => claim.evidence)).size,
      facts.facts.length,
    );
    const request: EditorialRequest = {
      correlationId: "week-temporal-synthetic",
      tier: "free",
      dataClass: "synthetic",
      consentToProcess: true,
      facts,
    };
    const prompt = buildPrompt(request);
    assert.equal(
      prompt.maxOutputTokens,
      weekTemporalOutputLimits.maxOutputTokens,
    );
    assert.match(prompt.system, /Máximo de 3 afirmações e 0 relações/);
  }
});

test("temporal profile rejects changed totals, order, policy, scope and incomplete evidence", () => {
  const mutations: ((v: FactsEnvelope) => void)[] = [
    (v) => {
      v.facts[0]!.display = v.facts[0]!.display.replace(
        "10 contatos",
        "11 contatos",
      );
    },
    (v) => {
      v.facts[0]!.display = v.facts[0]!.display.replace(
        "2026-09-29",
        "2026-02-30",
      );
    },
    (v) => {
      const next = [...v.facts];
      [next[1], next[2]] = [next[2]!, next[1]!];
      v.facts = next;
    },
    (v) => {
      v.facts[3]!.source = "untrusted";
    },
    (v) => {
      v.facts[11]!.source = "calculated";
    },
    (v) => {
      v.completeness = "complete";
    },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(base);
    mutate(value);
    assert.equal(validateFacts(value), false);
  }
  const facts = structuredClone(base);
  const output = reading(facts);
  output.claims[1]!.evidence.pop();
  assert.equal(inspectReading(output, facts).status, "rejected");
  const missingLimit = reading(facts);
  missingLimit.limits.pop();
  assert.equal(inspectReading(missingLimit, facts).status, "rejected");
});
