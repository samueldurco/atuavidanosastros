import test from "node:test";
import assert from "node:assert/strict";
import {
  CAREER_COMPASS_FULL_EDITORIAL_VERSION,
  careerCompassFullRoles,
} from "./career-compass-full.ts";
import { CAREER_COMPASS_EDITORIAL_VERSION } from "./career-compass.ts";
import { SCHEMA_VERSION, validateFacts, type FactsEnvelope, type Reading } from "./contracts.ts";
import { inspectReading } from "./director.ts";
import { EditorialGateway, LabBudgetLedger } from "./gateway.ts";
import { buildPrompt } from "./prompt.ts";
import { parseReading } from "./schema.ts";

const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
const calculated = (id: string) => ({ id, kind: "calculated" as const, display: `Fato sintético ${id}`, source: "synthetic-chart" });
const facts = (): FactsEnvelope => ({
  version: "atv-facts/1.0.0", capability: "purpose-direction", completeness: "complete",
  editorialProfile: CAREER_COMPASS_FULL_EDITORIAL_VERSION,
  facts: [
    ...planets.map((body) => calculated(`position-${body}`)),
    calculated("angle-ascendant"), calculated("angle-midheaven"),
    ...Array.from({ length: 12 }, (_, i) => calculated(`house-${i + 1}`)),
    calculated("career-mc-ruler"), calculated("compass-ruler-house"),
    calculated("career-aspect-0"),
    { id: "personal-context", kind: "reported", display: "Quero explorar sem sair do trabalho atual.", source: "input.context" },
  ],
});
const reading = (basis = facts()): Reading => {
  const display = (id: string) => basis.facts.find((fact) => fact.id === id)!.display;
  const factClaim = (id: string) => ({ id: `fact-${id}`, kind: "fact" as const, text: display(id), evidence: [id] });
  return {
    schemaVersion: SCHEMA_VERSION, capability: "purpose-direction", scope: "integrated",
    title: "Bússola sintética integral para revisão",
    claims: [
      ...["angle-midheaven", "career-mc-ruler", "compass-ruler-house", "personal-context"].map(factClaim),
      { id: "integrated-direction", kind: "hypothesis", text: "Uma contribuição pode ser examinada em uma tarefa concreta e acessível.", evidence: ["angle-midheaven", "career-mc-ruler", "compass-ruler-house", "position-sun", "personal-context"] },
      { id: "context-criterion", kind: "hypothesis", text: "A pergunta relatada pode ser comparada pelo resultado observado sem abandonar o trabalho atual.", evidence: ["angle-midheaven", "position-mercury", "personal-context"] },
      { id: "theme-contribution", kind: "hypothesis", text: "A contribuição possível depende de um resultado observado por outra pessoa.", evidence: ["angle-midheaven", "career-mc-ruler", "position-sun"] },
      { id: "theme-motivation", kind: "hypothesis", text: "O interesse pode variar depois da prática e merece ser registrado.", evidence: ["position-sun", "position-moon", "position-venus"] },
      { id: "theme-environment", kind: "hypothesis", text: "O ambiente pode oferecer tempo, orientação e retorno para comparar alternativas.", evidence: ["position-moon", "position-mercury", "position-saturn"] },
      { id: "theme-working-style", kind: "hypothesis", text: "Um modo de executar pode ser testado numa tarefa pequena com revisão.", evidence: ["position-mercury", "position-mars", "position-sun"] },
      { id: "theme-sustainability", kind: "hypothesis", text: "A continuidade precisa caber no tempo e na energia disponíveis.", evidence: ["position-jupiter", "position-saturn", "position-mars"] },
      { id: "selected-relation-1", kind: "hypothesis", text: "Dois fatores podem mudar o procedimento; compare sua ação no caso relatado.", evidence: ["career-aspect-0", "position-sun", "position-moon", "personal-context"] },
      { id: "selected-relation-2", kind: "hypothesis", text: "Comunicação e execução podem ser comparadas sem presumir um vínculo geométrico.", evidence: ["position-mercury", "position-mars", "personal-context"] },
      { id: "selected-relation-3", kind: "hypothesis", text: "Expansão e estrutura podem exigir condições diferentes no teste.", evidence: ["position-jupiter", "position-saturn", "personal-context"] },
      { id: "reversible-experiment", kind: "hypothesis", text: "Uma amostra curta pode comparar resultado, custo e indícios contrários à hipótese.", evidence: ["angle-midheaven", "position-mercury", "personal-context"] },
      { id: "decision-review", kind: "hypothesis", text: "Uma decisão futura deve depender da etapa executada, do custo e de evidências contrárias.", evidence: ["angle-midheaven", "position-saturn", "personal-context"] },
    ],
    relations: [
      { kind: "tension", claimIds: ["selected-relation-1", "theme-sustainability"], text: "Interesse e margem de energia podem divergir; compare ambos no mesmo ensaio." },
      { kind: "convergence", claimIds: ["selected-relation-2", "theme-working-style"], text: "Comunicação e execução podem se apoiar em uma tarefa observável." },
      { kind: "tension", claimIds: ["selected-relation-3", "theme-environment"], text: "Expansão e estrutura pedem condições diferentes no ambiente." },
    ],
    synthesis: [{ claimIds: [...careerCompassFullRoles], text: "As doze partes orientam uma hipótese situada, sujeita aos limites do relato e do teste." }],
    reflections: ["Que resultado seria observável?", "Qual condição material falta?", "Que evidência poderia contrariar a hipótese?"],
    limits: ["Método simbólico experimental; fatores sociais, acesso e escolhas concretas permanecem decisivos."],
  };
};

test("the full editorial profile accepts a complete factual basis and keeps the MC-only profile unchanged", () => {
  const basis = facts();
  assert.equal(validateFacts(basis), true);
  assert.equal(validateFacts({ ...basis, editorialProfile: CAREER_COMPASS_EDITORIAL_VERSION }), false);
  assert.equal(validateFacts({ ...basis, completeness: "partial" }), false);
  assert.equal(validateFacts({ ...basis, facts: basis.facts.filter((fact) => fact.id !== "position-moon") }), false);
  assert.equal(validateFacts({ ...basis, facts: basis.facts.filter((fact) => fact.id !== "house-8") }), false);
  const polar = structuredClone(basis);
  polar.facts = polar.facts.filter((fact) => fact.id !== "angle-ascendant" && !fact.id.startsWith("house-"));
  polar.facts = [...polar.facts, calculated("ascendant-unavailable")];
  assert.equal(validateFacts(polar), true);
  const expanded = structuredClone(basis);
  expanded.facts = [...expanded.facts, ...Array.from({ length: 20 }, (_, i) => calculated(`career-aspect-${i + 1}`))];
  assert.ok(expanded.facts.length > 40);
  assert.equal(validateFacts(expanded), true);
  const oversized = structuredClone(basis);
  oversized.facts = [...oversized.facts, ...Array.from({ length: 70 }, (_, i) => calculated(`career-aspect-${i + 1}`))];
  assert.equal(validateFacts(oversized), false);
});

test("integrated reading coverage is checked before editorial review", () => {
  const basis = facts();
  const complete = reading(basis);
  assert.equal(parseReading(complete, "premium", basis.editorialProfile)?.scope, "integrated");
  assert.equal(inspectReading(complete, basis).status, "needs_editorial_review");
  const missing = structuredClone(complete);
  missing.claims = missing.claims.filter((claim) => claim.id !== "theme-sustainability");
  assert.equal(inspectReading(missing, basis).status, "rejected");
  const noContext = structuredClone(complete);
  noContext.claims.find((claim) => claim.id === "reversible-experiment")!.evidence = ["angle-midheaven", "position-mercury"];
  assert.ok(inspectReading(noContext, basis).findings.some((finding) => finding.code === "career_full_experiment_context_missing"));
  const noRelation = structuredClone(complete);
  noRelation.relations = [];
  assert.equal(inspectReading(noRelation, basis).status, "rejected");
  const noCalculatedRelation = structuredClone(complete);
  noCalculatedRelation.claims.find((claim) => claim.id === "selected-relation-1")!.evidence = ["position-sun", "position-moon", "personal-context"];
  assert.ok(inspectReading(noCalculatedRelation, basis).findings.some((finding) => finding.code === "career_full_selected_relation_evidence_missing"));
  const noContextIntegration = structuredClone(complete);
  noContextIntegration.claims.find((claim) => claim.id === "integrated-direction")!.evidence = ["angle-midheaven", "career-mc-ruler", "compass-ruler-house", "position-sun"];
  assert.ok(inspectReading(noContextIntegration, basis).findings.some((finding) => finding.code === "career_full_context_integration_missing"));
  const noAspects = structuredClone(basis);
  noAspects.facts = noAspects.facts.filter((fact) => fact.id !== "career-aspect-0");
  const comparison = reading(noAspects);
  comparison.claims.find((claim) => claim.id === "selected-relation-1")!.evidence = ["position-sun", "position-moon", "personal-context"];
  assert.equal(inspectReading(comparison, noAspects).status, "needs_editorial_review");
});

test("the full prompt selects version two instructions without replacing the historical instructions", () => {
  const basis = facts();
  const full = buildPrompt({ correlationId: "synthetic-career", tier: "premium", facts: basis, dataClass: "synthetic", consentToProcess: true });
  assert.match(full.system, /atv-career-compass-editorial\/2\.0\.0/);
  assert.match(full.system, /reversible-experiment/);
  assert.doesNotMatch(full.system, /VERIFICAÇÃO FINAL DA BÚSSOLA:/);
  const partial = buildPrompt({ correlationId: "synthetic-career", tier: "premium", facts: {
    ...basis, completeness: "partial", editorialProfile: CAREER_COMPASS_EDITORIAL_VERSION,
    facts: [calculated("angle-midheaven")],
  }, dataClass: "synthetic", consentToProcess: true });
  assert.match(partial.system, /VERIFICAÇÃO FINAL DA BÚSSOLA:/);
  assert.doesNotMatch(partial.system, /atv-career-compass-editorial\/2\.0\.0/);
});

test("the full profile needs premium and lab review before any candidate exists", async () => {
  let calls = 0;
  const provider = {
    id: "synthetic", model: "fixture", kind: "fixture" as const,
    generate: async (payload: { system: string }) => {
      calls++;
      assert.match(payload.system, /atv-career-compass-editorial\/2\.0\.0/);
      return { output: reading(), inputTokens: 100, outputTokens: 100 };
    },
  };
  const gateway = new EditorialGateway({
    enabled: true, mode: "lab", ledger: new LabBudgetLedger(), providers: [provider],
  });
  const request = { correlationId: "synthetic-career", tier: "intermediate" as const,
    facts: facts(), dataClass: "synthetic" as const, consentToProcess: true };
  assert.deepEqual(await gateway.generate(request), {
    status: "unavailable", reason: "insufficient_tier",
  });
  assert.equal(calls, 0);
  const result = await gateway.generate({ ...request, tier: "premium" });
  assert.equal(result.status, "candidate");
  assert.equal(calls, 1);
  assert.deepEqual(await new EditorialGateway({
    enabled: true, mode: "production", ledger: new LabBudgetLedger(), providers: [provider],
  }).generate({ ...request, tier: "premium" }), {
    status: "unavailable", reason: "promotion_required",
  });
});
