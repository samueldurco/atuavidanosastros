import { SCHEMA_VERSION } from "../../packages/ai/src/contracts.ts";
import {
  WEEK_READING_EDITORIAL_VERSION,
  weekReadingRoles,
  weekReadingAreas,
  weekReadingEvidence,
  weekReadingEditorialLimits,
} from "../../packages/ai/src/week-reading.ts";

/** Synthetic structural specimen, without semantic or publication authority.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 * @returns {import('../../packages/ai/src/contracts.ts').Reading}
 */
export function weekReadingEditorialTestFixture(facts) {
  if (facts.editorialProfile !== WEEK_READING_EDITORIAL_VERSION)
    throw new Error("invalid_week_fixture_profile");
  return {
    schemaVersion: SCHEMA_VERSION,
    capability: "cycle-context",
    scope: "partial",
    title: "Semana — exemplo estrutural sintético",
    claims: weekReadingRoles.map((id, index) => ({
      id,
      kind: "hypothesis",
      text:
        index === 0
          ? "Fixture natal: possibilidade simbólica de observação da base compartilhada, sem aprovação editorial."
          : `Fixture ${id}: ${facts.facts[11 + (index - 1) * 11].display.slice(0, 10)}; possibilidade simbólica de observação e escolha reversível, sem previsão ou aprovação editorial.`,
      evidence: weekReadingEvidence(facts, id),
    })),
    relations: [],
    synthesis: [
      ...weekReadingAreas.map((area) => ({
        claimIds: [...weekReadingRoles],
        text: `${area}: fixture de reflexão e escolha reversível sobre as hipóteses das sete amostras; sem previsão ou aprovação editorial.`,
      })),
      {
        claimIds: [...weekReadingRoles],
        text: "Fixture de organização das sete amostras: possibilidades para observação e escolhas reversíveis; sem aprovação editorial.",
      },
    ],
    reflections: [
      "Que possibilidade natal gostaria de observar?",
      "Como organizar uma observação das amostras?",
      "Que escolha reversível ligada ao contexto pode ser revista?",
    ],
    limits: [...weekReadingEditorialLimits],
  };
}
