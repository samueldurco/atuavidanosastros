import type { FactsEnvelope, Reading } from "./contracts.ts";
import type { Finding } from "./director.ts";

export const BIRTH_CHART_EDITORIAL_VERSION = "atv-birth-chart-editorial/1.0.0";
export const birthChartRoles = {
  "solar-identity": ["position-sun"],
  "lunar-needs": ["position-moon"],
  "personal-resources": ["position-mercury", "position-venus", "position-mars"],
  "social-resources": ["position-jupiter", "position-saturn"],
  "collective-symbols": [
    "position-uranus",
    "position-neptune",
    "position-pluto",
  ],
  "ascendant-approach": ["angle-ascendant", "position-sun"],
  "midheaven-contribution": ["angle-midheaven", "position-sun"],
  "house-sectors-1-3": ["house-1", "house-2", "house-3"],
  "house-sectors-4-6": ["house-4", "house-5", "house-6"],
  "house-sectors-7-9": ["house-7", "house-8", "house-9"],
  "house-sectors-10-12": ["house-10", "house-11", "house-12"],
} as const;
export const birthChartFactIds = [
  ...new Set(Object.values(birthChartRoles).flat()),
];
const roles = Object.keys(birthChartRoles);
const domains = [roles.slice(0, 5), roles.slice(5, 7), roles.slice(7)];
const joinsDomains = (ids: string[]) =>
  domains.every((domain) => domain.some((id) => ids.includes(id)));

export const birthChartInstructions = [
  `Produto: Mapa Astral, base parcial. ${BIRTH_CHART_EDITORIAL_VERSION}.`,
  `Use onze afirmações kind=interpretation ou hypothesis com estes IDs e evidências obrigatórias: ${JSON.stringify(birthChartRoles)}. Cada grupo deve tratar cada fator individualmente antes de relacioná-los. Não use uma lista de signos como interpretação. Os dados calculados aparecem separadamente na base factual do leitor; qualquer afirmação kind=fact adicional deve copiar exatamente um display e cabe apenas no limite do nível.`,
  "solar-identity distingue expressão/intenção; lunar-needs explora necessidades/conforto. personal-resources distingue comunicação/aprendizado (Mercúrio), valores/vínculo (Vênus) e ação/assertividade (Marte). social-resources distingue expansão/possibilidades (Júpiter) e estrutura/limites (Saturno). collective-symbols distingue os três símbolos geracionais sem inferir personalidade individual, acontecimentos ou destino.",
  "ascendant-approach relaciona abordagem/primeiro contato à expressão solar; midheaven-contribution relaciona direção pública/contribuição à intenção, sem prescrever profissão. Nos quatro house-sectors, diferencie cada cúspide recebida e os três campos simbólicos: 1 presença/2 recursos/3 comunicação; 4 raízes/5 criação/6 rotina; 7 encontros/8 recursos compartilhados/9 horizontes; 10 contribuição pública/11 coletivos/12 recolhimento. Não infira posição de planeta em casa, regente, interceptação ou aspecto a partir de cúspides ou signos.",
  "Inclua relação simbólica convergence ou tension que una ao menos um papel planetário, um angular e um de casas. A síntese deve retomar todos os onze papéis e ao menos uma parte deve conectar esses três domínios; integre possibilidades, tensão/excesso e um exemplo observável, sem tornar os fatores causa de comportamento.",
  "Inclua exatamente três perguntas práticas distintas, terminadas em ponto de interrogação: intenção/necessidade; recursos/contexto cotidiano; pequeno experimento reversível. Contexto consentido é relato e não modifica geometria nem define traços.",
  "Mantenha scope=partial, linguagem simbólica e condicional inclusive na síntese. Declare base parcial e experimental, ausência de garantia global de precisão e aspectos não avaliados. Não invente orbes, aspectos, dignidades, casas de planetas, regentes, diagnósticos ou previsões. Não apresente esta base como leitura integral homologada. Cobertura de IDs não substitui revisão de significado, profundidade, especificidade e responsabilidade.",
  "VERIFICAÇÃO FINAL DO MAPA ASTRAL: evidence usa somente facts.facts[].id; relations[].claimIds e synthesis[].claimIds usam claims[].id. Não omita planetas, ângulos ou casas para caber no nível; o nível free é insuficiente para este perfil e não autoriza reduzir seu escopo.",
].join("\n");

/** Trusted preparation validates numeric coherence; this checks representable scope only. */
export function validBirthChartFacts(facts: FactsEnvelope): boolean {
  return (
    facts.capability === "natal-synthesis" &&
    facts.completeness === "partial" &&
    birthChartFactIds.every((id) =>
      facts.facts.some((fact) => fact.id === id && fact.kind === "calculated"),
    ) &&
    facts.facts.every(
      (fact) =>
        (birthChartFactIds.some((id) => fact.id === id) &&
          fact.kind === "calculated") ||
        (fact.id === "personal-context" &&
          fact.kind === "reported" &&
          fact.source === "input.context"),
    )
  );
}

/** Structural coverage only: never semantic approval, scoring, promotion or release. */
export function inspectBirthChart(reading: Reading): Finding[] {
  const findings: Finding[] = [];
  for (const [role, required] of Object.entries(birthChartRoles)) {
    const claim = reading.claims.find((candidate) => candidate.id === role);
    if (
      !claim ||
      claim.kind === "fact" ||
      !required.every((id) => claim.evidence.includes(id))
    )
      findings.push({
        code: "birth_chart_role_missing",
        location: `claims.${role}`,
      });
  }
  if (!reading.relations.some((relation) => joinsDomains(relation.claimIds)))
    findings.push({
      code: "birth_chart_relation_missing",
      location: "relations",
    });
  if (
    !roles.every((role) =>
      reading.synthesis.some((part) => part.claimIds.includes(role)),
    ) ||
    !reading.synthesis.some((part) => joinsDomains(part.claimIds))
  )
    findings.push({
      code: "birth_chart_synthesis_incomplete",
      location: "synthesis",
    });
  const questions = reading.reflections.map((question) =>
    question.trim().toLocaleLowerCase("pt-BR"),
  );
  if (
    questions.length !== 3 ||
    new Set(questions).size !== 3 ||
    questions.some((question) => !question.endsWith("?"))
  )
    findings.push({
      code: "birth_chart_three_questions_required",
      location: "reflections",
    });
  return findings;
}
