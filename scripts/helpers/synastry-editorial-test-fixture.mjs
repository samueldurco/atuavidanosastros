import { SCHEMA_VERSION } from "../../packages/ai/src/contracts.ts";
import {
  SYNASTRY_EDITORIAL_VERSION,
  synastryRoles,
  synastryEvidence,
  synastryBaseLimit,
  synastryConsentLimit,
  synastryScopeLimit,
} from "../../packages/ai/src/synastry.ts";

/** Structural synthetic coverage for local tests; no semantic or review authority.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 * @returns {import('../../packages/ai/src/contracts.ts').Reading}
 */
export function synastryEditorialTestFixture(facts) {
  if (facts.editorialProfile !== SYNASTRY_EDITORIAL_VERSION)
    throw new Error("invalid_synastry_fixture_profile");
  return {
    schemaVersion: SCHEMA_VERSION,
    capability: "relationship-dynamics",
    scope: "partial",
    title: "Sinastria — exemplo estrutural sintético",
    claims: synastryRoles.map((id) => ({
      id,
      kind: "hypothesis",
      text: `Fixture estrutural ${id}: na linguagem simbólica, estes fatores permitem explorar possibilidades de conversa; sem aprovação editorial.`,
      evidence: synastryEvidence(facts, id),
    })),
    relations: [],
    synthesis: [
      {
        claimIds: [...synastryRoles],
        text: "Possibilidades simbólicas de exploração consentida; fixture sem aprovação editorial.",
      },
    ],
    reflections: [
      "Que possibilidade de comunicação faz sentido explorar?",
      "Que escolha reversível preserva autonomia na reparação?",
      "Que pequeno experimento de negociação e crescimento pode ser consentido?",
    ],
    limits: [synastryBaseLimit, synastryConsentLimit, synastryScopeLimit],
  };
}
