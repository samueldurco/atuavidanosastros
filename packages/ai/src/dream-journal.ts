import type { FactsEnvelope, Reading } from "./contracts.ts";
import type { Finding } from "./director.ts";

export const DREAM_JOURNAL_EDITORIAL_VERSION =
  "atv-dream-journal-editorial/1.0.0";
export const dreamJournalInstructions = [
  "Produto: Registro de sonho. atv-dream-journal-editorial/1.0.0. Registro parcial com uma observação breve, sem transformá-lo em Leitura Essencial, dossiê ou consulta de histórico.",
  "A base confiável mantém separadamente data, relato completo, emoções informadas, associações pessoais e contexto opcional. Não reescreva esses dados como novas afirmações factuais. Use exatamente uma claims com id=dream-observation, kind=hypothesis e evidence contendo todos e somente os IDs recebidos. Considere cada trecho do relato; diferencie emoção informada de associação pessoal. Se essas listas estiverem vazias, reconheça a ausência sem preencher dados.",
  "A observação oferece um ponto do relato que a pessoa pode explorar, sem atribuir significado universal aos símbolos, inferir emoção, diagnóstico, evento futuro ou história da pessoa. Contexto e associações consentidos são relatos, não prova externa. Recorrência e histórico não foram avaliados, mesmo com consentimento de continuidade.",
  "Use relations=[]; uma única observação não sustenta relações artificiais. Inclua exatamente uma synthesis com claimIds=[dream-observation], ligando a possibilidade aos limites e à autonomia da pessoa. Inclua exatamente uma pergunta exploratória em reflections, terminada em ?, sobre uma associação ou observação que ela possa considerar. Preserve scope=partial e os limites de entrada. Conteúdo curto e situado, sem inflar para simular leitura premium.",
  "VERIFICAÇÃO FINAL DO REGISTRO: evidence referencia os fatos recebidos; synthesis referencia dream-observation. A hipótese e a pergunta ficam separadas do relato, emoções e associações. Não consulte histórico, diagnostique, generalize símbolos ou apresente esta cobertura como aprovação editorial.",
].join("\n");

export function validDreamJournalFacts(facts: FactsEnvelope): boolean {
  if (
    facts.capability !== "dream-exploration" ||
    facts.completeness !== "partial" ||
    facts.facts.some((f) => f.kind !== "reported")
  )
    return false;
  let index = 0;
  const date = facts.facts[index++];
  if (
    !date ||
    date.id !== "dream-date" ||
    date.source !== "input.dream.date" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date.display)
  )
    return false;
  let narrative = 0;
  while (facts.facts[index]?.id.startsWith("dream-narrative-")) {
    const fact = facts.facts[index++]!;
    narrative++;
    const prefix = `Relato (trecho ${narrative}): `;
    if (
      narrative > 4 ||
      fact.id !== `dream-narrative-${narrative}` ||
      fact.source !== "input.dream.narrative" ||
      !fact.display.startsWith(prefix) ||
      fact.display.length <= prefix.length
    )
      return false;
  }
  if (!narrative) return false;
  for (const [id, source] of [
    ["emotion", "emotions"],
    ["association", "associations"],
  ]) {
    let count = 0;
    while (facts.facts[index]?.id.startsWith(`dream-${id}-`)) {
      const fact = facts.facts[index++]!;
      count++;
      if (
        count > 8 ||
        fact.id !== `dream-${id}-${count}` ||
        fact.source !== `input.dream.${source}[${count - 1}]`
      )
        return false;
    }
  }
  if (facts.facts[index]?.id === "dream-context") {
    if (facts.facts[index++]!.source !== "input.context") return false;
  }
  return index === facts.facts.length;
}

/** Required coverage only, never semantic approval or permission to publish. */
export function inspectDreamJournal(
  reading: Reading,
  facts: FactsEnvelope,
): Finding[] {
  const findings: Finding[] = [];
  const fail = (code: string, location: string) =>
    findings.push({ code, location });
  const claim = reading.claims[0],
    refs = facts.facts.map((f) => f.id);
  if (
    reading.claims.length !== 1 ||
    claim?.id !== "dream-observation" ||
    claim.kind !== "hypothesis" ||
    claim.evidence.length !== refs.length ||
    !refs.every((ref) => claim.evidence.includes(ref))
  )
    fail("dream_journal_observation_incomplete", "claims");
  if (reading.relations.length !== 0)
    fail("dream_journal_relations_unsupported", "relations");
  if (
    reading.synthesis.length !== 1 ||
    reading.synthesis[0]?.claimIds.length !== 1 ||
    reading.synthesis[0]?.claimIds[0] !== "dream-observation"
  )
    fail("dream_journal_synthesis_incomplete", "synthesis");
  if (
    reading.reflections.length !== 1 ||
    reading.reflections[0]!.trim().length < 2 ||
    !reading.reflections[0]!.trim().endsWith("?")
  )
    fail("dream_journal_question_required", "reflections");
  return findings;
}
