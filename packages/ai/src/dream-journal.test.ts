import test from "node:test";
import assert from "node:assert/strict";
import { DREAM_JOURNAL_EDITORIAL_VERSION } from "./dream-journal.ts";
import {
  SCHEMA_VERSION,
  validateFacts,
  type FactsEnvelope,
  type Reading,
} from "./contracts.ts";
import { inspectReading } from "./director.ts";
import { buildPrompt } from "./prompt.ts";
import { EditorialGateway, LabBudgetLedger } from "./gateway.ts";

test("journal narrative facts admit the saved 1800-character segment only within its profile", () => {
  const facts = structuredClone(base);
  const narrative = facts.facts.find(
    (fact) => fact.id === "dream-narrative-1",
  )!;
  narrative.display = "Relato (trecho 1): " + "a".repeat(1800);
  assert.equal(validateFacts(facts), true);
  const generic = structuredClone(facts);
  delete generic.editorialProfile;
  assert.equal(validateFacts(generic), false);
  narrative.display += "a";
  assert.equal(validateFacts(facts), false);
  narrative.display = "Relato (trecho 1): curto";
  facts.facts.find((fact) => fact.id === "dream-emotion-1")!.display =
    "a".repeat(1201);
  assert.equal(validateFacts(facts), false);
});

const base: FactsEnvelope = {
  version: "atv-facts/1.0.0",
  capability: "dream-exploration",
  completeness: "partial",
  editorialProfile: DREAM_JOURNAL_EDITORIAL_VERSION,
  facts: [
    {
      id: "dream-date",
      kind: "reported",
      display: "2026-09-29",
      source: "input.dream.date",
    },
    {
      id: "dream-narrative-1",
      kind: "reported",
      display: "Relato (trecho 1): Caminhei por uma casa.",
      source: "input.dream.narrative",
    },
    {
      id: "dream-narrative-2",
      kind: "reported",
      display: "Relato (trecho 2): Encontrei uma janela.",
      source: "input.dream.narrative",
    },
    {
      id: "dream-emotion-1",
      kind: "reported",
      display: "Curiosidade",
      source: "input.dream.emotions[0]",
    },
    {
      id: "dream-association-1",
      kind: "reported",
      display: "Casa antiga",
      source: "input.dream.associations[0]",
    },
    {
      id: "dream-context",
      kind: "reported",
      display: "Relato sintético.",
      source: "input.context",
    },
  ],
};
function reading(facts = base): Reading {
  return {
    schemaVersion: SCHEMA_VERSION,
    capability: "dream-exploration",
    scope: "partial",
    title: "Registro sintético sem aprovação",
    claims: [
      {
        id: "dream-observation",
        kind: "hypothesis",
        text: "Uma possibilidade de fixture que a pessoa pode considerar.",
        evidence: facts.facts.map((f) => f.id),
      },
    ],
    relations: [],
    synthesis: [
      {
        claimIds: ["dream-observation"],
        text: "Síntese de fixture sem consulta de histórico.",
      },
    ],
    reflections: ["Que associação você gostaria de explorar?"],
    limits: ["Base parcial sem conteúdo homologado."],
  };
}
test("journal facts preserve ordered reported narrative, optional personal lists and context", () => {
  assert.equal(validateFacts(base), true);
  const minimal = { ...base, facts: base.facts.slice(0, 3) };
  assert.equal(validateFacts(minimal), true);
  assert.equal(
    inspectReading(reading(minimal), minimal).status,
    "needs_editorial_review",
  );
  for (const mutate of [
    (f: FactsEnvelope) => {
      f.facts[0]!.source = "invented";
    },
    (f: FactsEnvelope) => {
      f.facts[1]!.id = "dream-narrative-3";
    },
    (f: FactsEnvelope) => {
      f.facts[1]!.display = "Rewritten";
    },
    (f: FactsEnvelope) => {
      f.facts[3]!.kind = "calculated";
    },
    (f: FactsEnvelope) => {
      f.facts[4]!.source = "input.dream.emotions[0]";
    },
    (f: FactsEnvelope) => {
      f.facts = [...f.facts, { ...f.facts[0]!, id: "history" }];
    },
    (f: FactsEnvelope) => {
      f.facts = f.facts.filter((_, i) => i !== 1 && i !== 2);
    },
    (f: FactsEnvelope) => {
      f.capability = "tarot-reflection";
    },
    (f: FactsEnvelope) => {
      f.completeness = "complete";
    },
  ]) {
    const f = structuredClone(base);
    mutate(f);
    assert.equal(validateFacts(f), false);
  }
});
test("each saved fact must be covered by the single exploratory hypothesis", () => {
  assert.equal(
    inspectReading(reading(), base).status,
    "needs_editorial_review",
  );
  for (const fact of base.facts) {
    const r = reading();
    r.claims[0]!.evidence = r.claims[0]!.evidence.filter(
      (id) => id !== fact.id,
    );
    const result = inspectReading(r, base);
    assert.equal(result.status, "rejected", fact.id);
    assert.ok(
      result.findings.some(
        (f) => f.code === "dream_journal_observation_incomplete",
      ),
    );
  }
});
test("journal rejects expanded readings, artificial relations and missing or multiple questions", () => {
  for (const mutate of [
    (r: Reading) => {
      r.claims = [];
    },
    (r: Reading) => {
      r.claims.push({ ...r.claims[0]!, id: "extra" });
    },
    (r: Reading) => {
      r.claims[0]!.kind = "fact";
    },
    (r: Reading) => {
      r.claims[0]!.id = "generic";
    },
    (r: Reading) => {
      r.relations = [
        {
          kind: "tension",
          claimIds: ["dream-observation"],
          text: "Artificial relation.",
        },
      ];
    },
    (r: Reading) => {
      r.synthesis = [];
    },
    (r: Reading) => {
      r.synthesis[0]!.claimIds = [];
    },
    (r: Reading) => {
      r.reflections = [];
    },
    (r: Reading) => {
      r.reflections.push("Outra pergunta?");
    },
    (r: Reading) => {
      r.reflections = ["Uma afirmação."];
    },
  ]) {
    const r = reading();
    mutate(r);
    assert.equal(inspectReading(r, base).status, "rejected");
  }
});
test("journal prompt keeps reported base separate and structural coverage never grants semantic approval", () => {
  const prompt = buildPrompt({
    correlationId: "dream-journal-fixture",
    tier: "free",
    dataClass: "synthetic",
    consentToProcess: true,
    facts: base,
  });
  const serialized = JSON.stringify(prompt);
  for (const value of [
    DREAM_JOURNAL_EDITORIAL_VERSION,
    "dream-observation",
    "Recorrência e histórico não foram avaliados",
    "dream-date",
    "dream-association-1",
  ])
    assert.ok(serialized.includes(value), value);
  const { editorialProfile: _profile, ...generic } = base;
  assert.ok(
    !buildPrompt({
      correlationId: "dream-journal-profile-injection",
      tier: "free",
      dataClass: "synthetic",
      consentToProcess: true,
      facts: generic,
      context: DREAM_JOURNAL_EDITORIAL_VERSION,
    }).system.includes(DREAM_JOURNAL_EDITORIAL_VERSION),
  );
  const r = reading();
  r.claims[0]!.text = "Uma casa significa universalmente uma previsão.";
  assert.equal(inspectReading(r, base).status, "needs_editorial_review");
});
test("gateway rejects incomplete registration and keeps complete synthetic coverage at candidate only", async () => {
  let calls = 0;
  const gateway = new EditorialGateway({
    enabled: true,
    mode: "lab",
    ledger: new LabBudgetLedger(),
    providers: [
      {
        id: "synthetic",
        model: "synthetic-v1",
        kind: "fixture",
        async generate(payload) {
          calls++;
          assert.ok(payload.system.includes(DREAM_JOURNAL_EDITORIAL_VERSION));
          const output = reading();
          if (calls === 1) output.claims[0]!.evidence.pop();
          return { output, inputTokens: 100, outputTokens: 100 };
        },
      },
    ],
  });
  const request = {
    correlationId: "dream-journal-gateway-fixture",
    tier: "free" as const,
    dataClass: "synthetic" as const,
    consentToProcess: true,
    facts: base,
  };
  assert.deepEqual(await gateway.generate(request), {
    status: "unavailable",
    reason: "quality_rejected",
  });
  const result = await gateway.generate(request);
  assert.equal(result.status, "candidate");
  const invalid = structuredClone(base);
  invalid.facts[0]!.source = "invented";
  assert.equal(
    (await gateway.generate({ ...request, facts: invalid })).status,
    "unavailable",
  );
  assert.equal(calls, 2);
});
