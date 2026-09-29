import { SCHEMA_VERSION } from "../../packages/ai/src/contracts.ts";
import {
  HOROSCOPE_EDITORIAL_VERSION,
  horoscopeRoles,
  horoscopeEvidence,
  horoscopeLimits,
} from "../../packages/ai/src/horoscope.ts";

/** Synthetic structural specimen; no semantic, review or publication authority.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 * @returns {import('../../packages/ai/src/contracts.ts').Reading}
 */
export function horoscopeEditorialTestFixture(facts) {
  if (facts.editorialProfile !== HOROSCOPE_EDITORIAL_VERSION)
    throw new Error("invalid_horoscope_fixture_profile");
  return {
    schemaVersion: SCHEMA_VERSION,
    capability: "cycle-context",
    scope: "partial",
    title: "Horóscopo — exemplo estrutural sintético",
    claims: horoscopeRoles.map((id) => ({
      id,
      kind: "hypothesis",
      text: `Fixture estrutural ${id}: possibilidade simbólica de observar a amostra em contraste com o mapa natal, sem aprovação editorial.`,
      evidence: horoscopeEvidence(facts, id),
    })),
    relations: [],
    synthesis: [
      {
        claimIds: [...horoscopeRoles],
        text: "Fixture de integração de amor, trabalho, ritmo e atenção: possibilidades parciais para observação e escolhas reversíveis, sem previsão ou aprovação editorial.",
      },
    ],
    reflections: [
      "Que possibilidade de vínculo faz sentido observar?",
      "Que pequena escolha de trabalho e ritmo pode ser revista?",
      "Que atenção ao contexto permite uma observação prática?",
    ],
    limits: [...horoscopeLimits],
  };
}
