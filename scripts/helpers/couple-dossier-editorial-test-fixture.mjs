import { SCHEMA_VERSION } from "../../packages/ai/src/contracts.ts";
import {
  COUPLE_DOSSIER_EDITORIAL_VERSION,
  coupleDossierRoles,
  coupleDossierEvidence,
  coupleDossierConnections,
  coupleDossierSynthesis,
  coupleDossierLimits,
} from "../../packages/ai/src/couple-dossier.ts";

/** Synthetic structural specimen; no semantic, review or publication authority.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 * @returns {import('../../packages/ai/src/contracts.ts').Reading}
 */
export function coupleDossierEditorialTestFixture(facts) {
  if (facts.editorialProfile !== COUPLE_DOSSIER_EDITORIAL_VERSION)
    throw new Error("invalid_couple_dossier_fixture_profile");
  return {
    schemaVersion: SCHEMA_VERSION,
    capability: "relationship-dynamics",
    scope: "partial",
    title: "Dossiê do Casal — exemplo estrutural sintético",
    claims: coupleDossierRoles.map((id) => ({
      id,
      kind: "hypothesis",
      text: `Fixture estrutural ${id}: possibilidades simbólicas de conversa consentida, sem aprovação editorial.`,
      evidence: coupleDossierEvidence(facts, id),
    })),
    relations: coupleDossierConnections.map((connection, index) => ({
      kind: connection.kind,
      claimIds: [...connection.claimIds],
      text: [
        "Fixture de vínculo, segurança e reparação: recursos simbólicos possíveis para uma conversa voluntária, sem afirmar dinâmica real.",
        "Fixture de autonomia, conflito e negociação: tensão hipotética que permite explorar alternativas e preservar o direito de não participar.",
        "Fixture de comunicação, negociação e crescimento: conexão possível a ser examinada pelos participantes, sem inferir acordo ou comportamento existente.",
      ][index],
    })),
    synthesis: coupleDossierSynthesis.map((claimIds, index) => ({
      claimIds: [...claimIds],
      text: [
        "Fixture de integração das bases e temas: possibilidades simbólicas parciais, com política não aprovada e precisão desconhecida; sem resultado global de compatibilidade.",
        "Exemplo estrutural de experimento voluntário reversível: conversar sobre uma ação observável e combinar uma revisão consentida, sem pressupor acordo existente ou aprovação editorial.",
      ][index],
    })),
    reflections: [
      "Que possibilidade de comunicação e vínculo faz sentido explorar?",
      "Que escolha reversível preserva autonomia na reparação?",
      "Que pequeno experimento de negociação pode ser revisto de comum acordo?",
    ],
    limits: [...coupleDossierLimits],
  };
}
