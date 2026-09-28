import type { FactsEnvelope, Reading } from "./contracts.ts";
import type { Finding } from "./director.ts";

export const CAREER_COMPASS_EDITORIAL_VERSION =
  "atv-career-compass-editorial/1.0.0";

export const careerCompassRoles = [
  "public-direction",
  "work-possibilities",
  "tension-or-excess",
] as const;

export const careerCompassInstructions = [
  `Produto: Bússola de Carreira. ${CAREER_COMPASS_EDITORIAL_VERSION}.`,
  "Preserve uma afirmação kind=fact com o display exato de angle-midheaven (signo e grau); sua fonte acompanha os fatos, não invente proveniência ou precisão.",
  "Use três afirmações kind=interpretation ou hypothesis com estes IDs e evidência angle-midheaven: public-direction (direção pública e contribuição); work-possibilities (possibilidades de ambientes, modos de trabalhar e visibilidade, sem lista de profissões por signo); tension-or-excess (uma tensão ou excesso possível e como observá-lo, sem diagnóstico).",
  "A síntese deve relacionar as três afirmações. Inclua exatamente três perguntas práticas distintas sobre contribuição, ambiente/modo de trabalhar e um pequeno experimento reversível; adapte ao contexto somente quando ele tiver sido recebido como relato consentido.",
  "Mantenha scope=partial. Não infira Ascendente, casa 10, regentes, aspectos ou outros fatores ausentes. O Meio do Céu é uma lente simbólica; não determina profissão, emprego, renda ou destino. Diferencie hipótese simbólica e relato pessoal e reconheça condições sociais, experiência e escolhas.",
  "Explicite nos limites a base parcial e experimental, a ausência de garantia global de precisão e a necessidade de considerar o contexto real. Estes requisitos de forma não substituem revisão editorial de especificidade, pertinência, profundidade ou responsabilidade.",
].join("\n");

/** Only the persisted MC projection can activate this product profile. */
export function validCareerCompassFacts(facts: FactsEnvelope): boolean {
  return (
    facts.capability === "purpose-direction" &&
    facts.completeness === "partial" &&
    facts.facts.some(
      (fact) => fact.id === "angle-midheaven" && fact.kind === "calculated",
    ) &&
    facts.facts.every(
      (fact) =>
        (fact.id === "angle-midheaven" && fact.kind === "calculated") ||
        (fact.id === "personal-context" && fact.kind === "reported"),
    )
  );
}

/** Structural coverage only: no scores, human review, model or release authority. */
export function inspectCareerCompass(reading: Reading): Finding[] {
  const findings: Finding[] = [];
  if (
    !reading.claims.some(
      (claim) =>
        claim.kind === "fact" &&
        claim.evidence.length === 1 &&
        claim.evidence[0] === "angle-midheaven",
    )
  )
    findings.push({
      code: "career_midheaven_fact_missing",
      location: "claims",
    });
  for (const role of careerCompassRoles) {
    const claim = reading.claims.find((candidate) => candidate.id === role);
    if (
      !claim ||
      claim.kind === "fact" ||
      !claim.evidence.includes("angle-midheaven")
    )
      findings.push({
        code: "career_role_missing",
        location: `claims.${role}`,
      });
    if (!reading.synthesis.some((part) => part.claimIds.includes(role)))
      findings.push({
        code: "career_synthesis_incomplete",
        location: `synthesis.${role}`,
      });
  }
  if (reading.reflections.length !== 3)
    findings.push({
      code: "career_three_questions_required",
      location: "reflections",
    });
  return findings;
}
