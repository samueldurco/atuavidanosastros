import type { FactsEnvelope, Reading } from "./contracts.ts";
import type { Finding } from "./director.ts";

export const MIDHEAVEN_EDITORIAL_VERSION = "atv-midheaven-editorial/1.0.0";
export const midheavenRoles = [
  "midheaven-contribution",
  "midheaven-possibilities",
  "midheaven-tension",
] as const;

export const midheavenInstructions = [
  `Produto: Meio do Céu. ${MIDHEAVEN_EDITORIAL_VERSION}.`,
  'Use quatro afirmações: uma kind=fact copiando exatamente o display de angle-midheaven, inclusive signo/grau; três kind=interpretation ou hypothesis com IDs midheaven-contribution, midheaven-possibilities e midheaven-tension. Em cada uma use evidence=["angle-midheaven"], com personal-context somente se recebido como relato consentido e pertinente. Fontes/versões pertencem aos fatos; não invente precisão ou proveniência.',
  "midheaven-contribution explora direção pública, contribuição e visibilidade como hipóteses simbólicas com exemplo observável; midheaven-possibilities explora possibilidades de ambientes e modos de trabalhar, sem lista de profissões por signo; midheaven-tension explora uma tensão ou excesso possível nessa contribuição e uma maneira de observá-lo, sem diagnóstico.",
  "Uma mesma parte de synthesis conecta as três afirmações, com possibilidade, tensão/excesso e exemplo observável. Inclua exatamente três perguntas práticas distintas terminadas em ponto de interrogação: contribuição pública; ambiente/modo de trabalhar; um pequeno experimento reversível. Listar signo/grau não satisfaz interpretação, síntese ou pergunta prática.",
  "Mantenha scope=partial e relations=[]: existe somente um fator astrológico. Contexto é relato, nunca um segundo fator nem geometria. Não infira Ascendente, casa 10, planetas, regentes, casas 2/6/10, dignidades ou aspectos ausentes. MC é uma lente simbólica, não determina profissão, emprego, renda ou destino. Não reduza carreira a um signo; reconheça formação, território, classe, saúde, oportunidades e escolhas como condições reais, sem inferir esses dados pessoais.",
  "Declare nos limits que a base é parcial e experimental e que não há garantia global de precisão. Use linguagem simbólica/condicional também na síntese. A cobertura estrutural não substitui revisão de especificidade, utilidade, profundidade ou responsabilidade.",
  "VERIFICAÇÃO FINAL DO MEIO DO CÉU: evidence aponta para facts.facts[].id; somente synthesis[].claimIds usa IDs de afirmações. Preserve o display exato, não substitua o ângulo por contexto ou nota de indisponibilidade. Não alegue aprovação ou homologação a partir deste perfil.",
].join("\n");

/** Scope only; persisted numeric coherence and origin belong to trusted preparation. */
export function validMidheavenFacts(facts: FactsEnvelope): boolean {
  return (
    facts.capability === "purpose-direction" &&
    facts.completeness === "partial" &&
    facts.facts.some(
      (fact) => fact.id === "angle-midheaven" && fact.kind === "calculated",
    ) &&
    facts.facts.every(
      (fact) =>
        (fact.id === "angle-midheaven" && fact.kind === "calculated") ||
        (fact.id === "personal-context" &&
          fact.kind === "reported" &&
          fact.source === "input.context"),
    )
  );
}

/** Coverage only: no scientific, model, human review or publication authority. */
export function inspectMidheaven(reading: Reading): Finding[] {
  const findings: Finding[] = [];
  if (
    !reading.claims.some(
      (claim) =>
        claim.kind === "fact" &&
        claim.evidence.length === 1 &&
        claim.evidence[0] === "angle-midheaven",
    )
  )
    findings.push({ code: "midheaven_fact_missing", location: "claims" });
  for (const role of midheavenRoles) {
    const claim = reading.claims.find((candidate) => candidate.id === role);
    if (
      !claim ||
      claim.kind === "fact" ||
      !claim.evidence.includes("angle-midheaven")
    )
      findings.push({
        code: "midheaven_role_missing",
        location: `claims.${role}`,
      });
  }
  if (
    !reading.synthesis.some((part) =>
      midheavenRoles.every((role) => part.claimIds.includes(role)),
    )
  )
    findings.push({
      code: "midheaven_synthesis_incomplete",
      location: "synthesis",
    });
  if (reading.relations.length)
    findings.push({ code: "midheaven_single_factor", location: "relations" });
  if (
    reading.reflections.length !== 3 ||
    reading.reflections.some((question) => !question.trim().endsWith("?"))
  )
    findings.push({
      code: "midheaven_three_questions_required",
      location: "reflections",
    });
  return findings;
}
