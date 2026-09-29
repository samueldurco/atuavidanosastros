import type { FactsEnvelope, Reading } from "./contracts.ts";
import type { Finding } from "./director.ts";

export const ASCENDANT_EDITORIAL_VERSION = "atv-ascendant-editorial/1.0.0";
export const ascendantRoles = [
  "ascendant-approach",
  "ascendant-possibilities",
  "ascendant-tension",
] as const;

export const ascendantInstructions = [
  `Produto: Ascendente. ${ASCENDANT_EDITORIAL_VERSION}.`,
  'Use quatro afirmações: uma kind=fact copiando exatamente o display de angle-ascendant, inclusive signo/grau; três kind=interpretation ou hypothesis com IDs ascendant-approach, ascendant-possibilities e ascendant-tension. Em cada uma use evidence=["angle-ascendant"], com personal-context somente se recebido como relato consentido e pertinente. Fontes/versões pertencem aos fatos; não invente precisão ou proveniência.',
  "ascendant-approach explora abordagem/primeiro contato como hipótese simbólica, com exemplo observável; ascendant-possibilities explora alternativas para iniciar conversas ou ações e ajustar a apresentação ao contexto real; ascendant-tension explora um possível excesso ou tensão nessa abordagem e uma maneira de observá-lo, sem diagnóstico ou atribuição automática de traços.",
  "Uma mesma parte de synthesis conecta as três afirmações, com possibilidade, tensão/excesso e exemplo observável. Inclua exatamente três perguntas práticas distintas terminadas em ponto de interrogação: primeiro contato; alternativas de iniciativa; um pequeno experimento reversível para observar e ajustar a abordagem. Listar signo/grau não satisfaz interpretação, síntese ou pergunta prática.",
  "Mantenha scope=partial e relations=[]: existe somente um fator astrológico. Contexto é relato, nunca um segundo fator nem geometria. Não infira Sol, Lua, MC, outros planetas, casas, regentes, dignidades ou aspectos ausentes. O Ascendente é uma lente simbólica, não determina personalidade, aparência física, saúde, profissão ou destino.",
  "Declare nos limits que a base é parcial e experimental e que não há garantia global de precisão. Use linguagem simbólica/condicional também na síntese e reconheça experiência, escolhas e condições reais. A cobertura estrutural não substitui revisão de especificidade, utilidade, profundidade ou responsabilidade.",
  "VERIFICAÇÃO FINAL DO ASCENDENTE: evidence aponta para facts.facts[].id; somente synthesis[].claimIds usa IDs de afirmações. Preserve o display exato, não substitua o ângulo por contexto ou nota de indisponibilidade. Não alegue aprovação ou homologação a partir deste perfil.",
].join("\n");

/** Scope only; persisted numeric coherence and origin belong to trusted preparation. */
export function validAscendantFacts(facts: FactsEnvelope): boolean {
  return (
    facts.capability === "natal-synthesis" &&
    facts.completeness === "partial" &&
    facts.facts.some(
      (fact) => fact.id === "angle-ascendant" && fact.kind === "calculated",
    ) &&
    facts.facts.every(
      (fact) =>
        (fact.id === "angle-ascendant" && fact.kind === "calculated") ||
        (fact.id === "personal-context" &&
          fact.kind === "reported" &&
          fact.source === "input.context"),
    )
  );
}

/** Coverage only: no scientific, model, human review or publication authority. */
export function inspectAscendant(reading: Reading): Finding[] {
  const findings: Finding[] = [];
  if (
    !reading.claims.some(
      (claim) =>
        claim.kind === "fact" &&
        claim.evidence.length === 1 &&
        claim.evidence[0] === "angle-ascendant",
    )
  )
    findings.push({ code: "ascendant_fact_missing", location: "claims" });
  for (const role of ascendantRoles) {
    const claim = reading.claims.find((candidate) => candidate.id === role);
    if (
      !claim ||
      claim.kind === "fact" ||
      !claim.evidence.includes("angle-ascendant")
    )
      findings.push({
        code: "ascendant_role_missing",
        location: `claims.${role}`,
      });
  }
  if (
    !reading.synthesis.some((part) =>
      ascendantRoles.every((role) => part.claimIds.includes(role)),
    )
  )
    findings.push({
      code: "ascendant_synthesis_incomplete",
      location: "synthesis",
    });
  if (reading.relations.length)
    findings.push({ code: "ascendant_single_factor", location: "relations" });
  if (reading.reflections.length !== 3)
    findings.push({
      code: "ascendant_three_questions_required",
      location: "reflections",
    });
  return findings;
}
