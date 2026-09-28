import type { FactsEnvelope, Reading } from "./contracts.ts";
import type { Finding } from "./director.ts";

export const THREE_PILLARS_EDITORIAL_VERSION =
  "atv-three-pillars-editorial/1.0.0";
export const threePillarsFactIds = [
  "position-sun",
  "position-moon",
  "angle-ascendant",
] as const;
export const threePillarsRoles = [
  "sun-moon-dynamics",
  "ascendant-expression",
] as const;

export const threePillarsInstructions = [
  `Produto: Três Pilares. ${THREE_PILLARS_EDITORIAL_VERSION}.`,
  "Use cinco afirmações: três kind=fact, cada uma copiando exatamente um display de position-sun, position-moon ou angle-ascendant; duas kind=interpretation ou hypothesis com IDs sun-moon-dynamics e ascendant-expression.",
  'sun-moon-dynamics usa evidence=["position-sun","position-moon"]: diferencie identidade/expressão/intenção (Sol) e necessidades/conforto/ritmo emocional (Lua); explore um encontro ou tensão possível com exemplo observável, sem atribuir traços ou diagnóstico à pessoa.',
  "ascendant-expression usa evidence com angle-ascendant e ao menos position-sun ou position-moon: explore uma possibilidade de abordagem/primeiro contato/expressão em relação à identidade ou necessidade interior, sem inferir casas, regentes ou aspectos.",
  "Inclua ao menos uma relation convergence ou tension com claimIds contendo sun-moon-dynamics e ascendant-expression. Uma mesma parte de synthesis deve relacionar ambos. Essa relação é simbólica, não um aspecto astronômico calculado; não conclua dinâmica pela simples lista de signos.",
  "Inclua exatamente três perguntas práticas distintas, terminadas em ponto de interrogação, sobre identidade/intenção, necessidade/conforto e um pequeno experimento reversível de abordagem. Contexto consentido é relato, não altera geometria nem define personalidade ou destino.",
  "Mantenha scope=partial e linguagem simbólica/condicional também na síntese. Declare nos limits que a base é parcial e experimental e que não há garantia global de precisão; reconheça experiência, contexto real e escolhas. A cobertura estrutural não substitui revisão editorial de especificidade, pertinência, profundidade ou responsabilidade.",
  "VERIFICAÇÃO FINAL DOS TRÊS PILARES: evidence referencia facts.facts[].id, nunca claims[].id. Somente relations[].claimIds e synthesis[].claimIds usam IDs de afirmações. Copie os três displays caractere por caractere, inclusive pontuação; não omita um pilar para caber no limite.",
].join("\n");

/** Scope validation; provenance and numeric coherence belong to trusted preparation. */
export function validThreePillarsFacts(facts: FactsEnvelope): boolean {
  return (
    facts.capability === "natal-synthesis" &&
    facts.completeness === "partial" &&
    threePillarsFactIds.every((id) =>
      facts.facts.some((fact) => fact.id === id && fact.kind === "calculated"),
    ) &&
    facts.facts.every(
      (fact) =>
        (threePillarsFactIds.some((id) => fact.id === id) &&
          fact.kind === "calculated") ||
        (fact.id === "personal-context" &&
          fact.kind === "reported" &&
          fact.source === "input.context"),
    )
  );
}

/** Coverage only: no scores, review, promotion or release authority. */
export function inspectThreePillars(reading: Reading): Finding[] {
  const findings: Finding[] = [];
  for (const id of threePillarsFactIds) {
    if (
      !reading.claims.some(
        (claim) =>
          claim.kind === "fact" &&
          claim.evidence.length === 1 &&
          claim.evidence[0] === id,
      )
    )
      findings.push({
        code: "three_pillars_fact_missing",
        location: `claims.${id}`,
      });
  }
  for (const role of threePillarsRoles) {
    const claim = reading.claims.find((candidate) => candidate.id === role);
    const covered =
      claim &&
      claim.kind !== "fact" &&
      (role === "sun-moon-dynamics"
        ? claim.evidence.includes("position-sun") &&
          claim.evidence.includes("position-moon")
        : claim.evidence.includes("angle-ascendant") &&
          (claim.evidence.includes("position-sun") ||
            claim.evidence.includes("position-moon")));
    if (!covered)
      findings.push({
        code: "three_pillars_role_missing",
        location: `claims.${role}`,
      });
  }
  if (
    !reading.relations.some((relation) =>
      threePillarsRoles.every((role) => relation.claimIds.includes(role)),
    )
  )
    findings.push({
      code: "three_pillars_relation_missing",
      location: "relations",
    });
  if (
    !reading.synthesis.some((part) =>
      threePillarsRoles.every((role) => part.claimIds.includes(role)),
    )
  )
    findings.push({
      code: "three_pillars_synthesis_incomplete",
      location: "synthesis",
    });
  if (reading.reflections.length !== 3)
    findings.push({
      code: "three_pillars_three_questions_required",
      location: "reflections",
    });
  return findings;
}
