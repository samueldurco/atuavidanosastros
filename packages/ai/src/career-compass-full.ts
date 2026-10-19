import type { FactsEnvelope, Reading } from "./contracts.ts";
import type { Finding } from "./director.ts";

/** A separate editorial contract. The public MC-only profile remains 1.0.0. */
export const CAREER_COMPASS_FULL_EDITORIAL_VERSION =
  "atv-career-compass-editorial/2.0.0";

export const careerCompassFullRoles = [
  "integrated-direction",
  "context-criterion",
  "theme-contribution",
  "theme-motivation",
  "theme-environment",
  "theme-working-style",
  "theme-sustainability",
  "selected-relation-1",
  "selected-relation-2",
  "selected-relation-3",
  "reversible-experiment",
  "decision-review",
] as const;

const planetIds = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn",
  "uranus", "neptune", "pluto",
] as const;

const themeEvidence: Readonly<Record<string, readonly string[]>> = {
  "theme-contribution": ["angle-midheaven", "career-mc-ruler"],
  "theme-motivation": ["position-sun", "position-moon", "position-venus"],
  "theme-environment": ["position-moon", "position-mercury", "position-saturn"],
  "theme-working-style": ["position-mercury", "position-mars", "position-sun"],
  "theme-sustainability": ["position-jupiter", "position-saturn", "position-mars"],
};

export const careerCompassFullInstructions = [
  `Produto: Bússola de Carreira integral. ${CAREER_COMPASS_FULL_EDITORIAL_VERSION}.`,
  "A leitura deve articular Meio do Céu, seu regente moderno, posições natais, casas quando disponíveis e relações calculadas. Nunca deduza Ascendente ou casa onde a base os declara indisponíveis.",
  "Use scope=integrated. Inclua afirmações factuais com cópia exata do Meio do Céu, regente e casa do regente; se houver contexto, copie o relato como fato separado, sem tratá-lo como cálculo ou como diagnóstico.",
  "Crie hipóteses distintas para integrated-direction, context-criterion e os cinco temas theme-contribution, theme-motivation, theme-environment, theme-working-style e theme-sustainability. Em context-criterion, transforme somente a pergunta relatada em critérios observáveis; se não houver relato, explicite que a pergunta permanece aberta. Explique a função de cada fator em uma situação profissional verificável.",
  "Crie selected-relation-1, selected-relation-2 e selected-relation-3 como relações distintas. Cada uma compara duas posições; associe aspectos natais calculados distintos às relações enquanto houver até três disponíveis. Se faltarem aspectos, compare fatores sem inventar geometria. Conecte cada relação a um dos cinco temas em relations e inclua as três na síntese. Contatos ao MC são evidência adicional, não substituem aspectos natais disponíveis.",
  "Adapte a pergunta e as prioridades ao contexto somente se personal-context estiver presente. Não acrescente intenção de mudar de emprego, profissão ou restrição que a pessoa não declarou. Evidência simbólica não prova aptidão nem causa de sobrecarga.",
  "Crie reversible-experiment como hipótese: tarefa curta, acessível e reversível, horizonte de até 30 dias, resultado observável, custo ou limite e evidência que poderia contrariar a hipótese. Com sobrecarga, descanso, adiamento ou redução da tarefa são resultados válidos.",
  "Crie decision-review para distinguir plano de etapa realmente executada, registrar limite/custo e uma evidência que contrarie a hipótese. A síntese deve combinar direção, critério contextual, cinco temas, três relações, experimento e revisão de decisão. Ofereça três perguntas práticas distintas e uma referência técnica nos limites: método, base disponível, ausência de previsão e dependência de condições materiais.",
  "Não prescreva demissão, formação paga, profissão, renda ou prazo de contratação. Não transforme orbe, regência, casa ou aspecto em certeza sobre a pessoa.",
].join("\n");

/** Structural intake after a trusted calculator has bound each display to a chart. */
export function validCareerCompassFullFacts(facts: FactsEnvelope): boolean {
  if (
    facts.capability !== "purpose-direction" ||
    facts.completeness !== "complete" ||
    facts.editorialProfile !== CAREER_COMPASS_FULL_EDITORIAL_VERSION
  ) return false;
  const byId = new Map(facts.facts.map((fact) => [fact.id, fact]));
  if (byId.size !== facts.facts.length) return false;
  const required = [
    ...planetIds.map((body) => `position-${body}`),
    "angle-midheaven", "career-mc-ruler", "compass-ruler-house",
  ];
  if (required.some((id) => byId.get(id)?.kind !== "calculated")) return false;
  const hasAscendant = byId.has("angle-ascendant");
  const unavailable = byId.has("ascendant-unavailable");
  if (hasAscendant === unavailable) return false;
  const houseCount = Array.from({ length: 12 }, (_, i) => byId.has(`house-${i + 1}`))
    .filter(Boolean).length;
  if ((hasAscendant && houseCount !== 12) || (unavailable && houseCount !== 0))
    return false;
  if (byId.get("personal-context") &&
    (byId.get("personal-context")?.kind !== "reported" ||
      byId.get("personal-context")?.source !== "input.context")) return false;
  return facts.facts.every((fact) => {
    if (fact.id === "personal-context") return true;
    if (fact.kind !== "calculated") return false;
    return required.includes(fact.id) ||
      fact.id === "angle-ascendant" || fact.id === "ascendant-unavailable" ||
      /^house-(?:[1-9]|1[0-2])$/.test(fact.id) ||
      /^career-aspect-(?:0|[1-9]\d*)$/.test(fact.id) ||
      /^compass-mc-(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)$/.test(fact.id);
  });
}

/** Mechanical coverage only; editorial depth and contextual fidelity still need review. */
export function inspectCareerCompassFull(reading: Reading, facts: FactsEnvelope): Finding[] {
  const findings: Finding[] = [];
  const fail = (code: string, location: string) => findings.push({ code, location });
  const claims = new Map(reading.claims.map((claim) => [claim.id, claim]));
  const exactFact = (id: string) => reading.claims.some((claim) =>
    claim.kind === "fact" && claim.evidence.length === 1 && claim.evidence[0] === id &&
    claim.text === facts.facts.find((fact) => fact.id === id)?.display);
  if (reading.scope !== "integrated") fail("career_full_scope_required", "scope");
  for (const id of ["angle-midheaven", "career-mc-ruler", "compass-ruler-house"])
    if (!exactFact(id)) fail("career_full_anchor_missing", `claims.${id}`);
  if (facts.facts.some((fact) => fact.id === "personal-context") && !exactFact("personal-context"))
    fail("career_full_context_fact_missing", "claims.personal-context");
  for (const role of careerCompassFullRoles) {
    const claim = claims.get(role);
    if (!claim || claim.kind === "fact" || claim.evidence.length < 2)
      fail("career_full_role_missing", `claims.${role}`);
    if (!reading.synthesis.some((part) => part.claimIds.includes(role)))
      fail("career_full_synthesis_incomplete", `synthesis.${role}`);
  }
  for (const [role, required] of Object.entries(themeEvidence)) {
    const evidence = claims.get(role)?.evidence ?? [];
    if (required.some((id) => !evidence.includes(id)))
      fail("career_full_theme_evidence_missing", `claims.${role}`);
  }
  const direction = claims.get("integrated-direction")?.evidence ?? [];
  if (!["angle-midheaven", "career-mc-ruler", "compass-ruler-house"].every((id) => direction.includes(id)))
    fail("career_full_direction_evidence_missing", "claims.integrated-direction");
  const selectedRoles = ["selected-relation-1", "selected-relation-2", "selected-relation-3"];
  const availableAspects = facts.facts.filter((fact) => fact.id.startsWith("career-aspect-"));
  const selectedAspects: string[] = [];
  for (const [index, role] of selectedRoles.entries()) {
    const relation = claims.get(role)?.evidence ?? [];
    const aspect = relation.filter((id) => id.startsWith("career-aspect-"));
    if (relation.filter((id) => id.startsWith("position-")).length < 2 ||
      (index < Math.min(3, availableAspects.length) && aspect.length !== 1) ||
      (index >= availableAspects.length && aspect.length > 0))
      fail("career_full_selected_relation_evidence_missing", `claims.${role}`);
    selectedAspects.push(...aspect);
    if (!reading.relations.some((entry) => entry.claimIds.includes(role) &&
      entry.claimIds.some((id) => id.startsWith("theme-"))))
      fail("career_full_relation_missing", `relations.${role}`);
  }
  if (new Set(selectedAspects).size !== selectedAspects.length)
    fail("career_full_selected_relation_duplicate", "claims.selected-relations");
  const experiment = claims.get("reversible-experiment")?.evidence ?? [];
  if (!experiment.some((id) => id.startsWith("position-")) || !experiment.includes("angle-midheaven"))
    fail("career_full_experiment_evidence_missing", "claims.reversible-experiment");
  if (facts.facts.some((fact) => fact.id === "personal-context") &&
    !experiment.includes("personal-context"))
    fail("career_full_experiment_context_missing", "claims.reversible-experiment");
  const contextCriterion = claims.get("context-criterion")?.evidence ?? [];
  const decisionReview = claims.get("decision-review")?.evidence ?? [];
  if (facts.facts.some((fact) => fact.id === "personal-context") &&
    (!direction.includes("personal-context") ||
      !contextCriterion.includes("personal-context") ||
      !decisionReview.includes("personal-context") ||
      selectedRoles.some((role) => !claims.get(role)?.evidence.includes("personal-context"))))
    fail("career_full_context_integration_missing", "claims.integrated-direction");
  if (!decisionReview.includes("angle-midheaven") ||
    !decisionReview.some((id) => id.startsWith("position-")))
    fail("career_full_decision_evidence_missing", "claims.decision-review");
  if (reading.reflections.length !== 3) fail("career_full_three_questions_required", "reflections");
  return findings;
}
