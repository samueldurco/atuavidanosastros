import { DREAM_JOURNAL_EDITORIAL_VERSION } from "../../packages/ai/src/dream-journal.ts";
/** Synthetic contract coverage; never approved interpretation.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 */
export function dreamJournalEditorialTestFixture(facts) {
  if (facts.editorialProfile !== DREAM_JOURNAL_EDITORIAL_VERSION) return {};
  return {
    claims: [
      {
        id: "dream-observation",
        kind: "hypothesis",
        text: "Possibilidade sintética para verificar o registro; sem interpretação homologada.",
        evidence: facts.facts.map((f) => f.id),
      },
    ],
    relations: [],
    synthesis: [
      {
        claimIds: ["dream-observation"],
        text: "Síntese de fixture limitada ao relato, sem consulta de histórico ou aprovação editorial.",
      },
    ],
    reflections: [
      "Que associação pessoal você gostaria de explorar a partir deste relato?",
    ],
  };
}
import {
  THREE_QUESTIONS_EDITORIAL_VERSION,
  threeQuestionsRoles,
} from "../../packages/ai/src/three-questions.ts";
/** Synthetic coverage only; never approved interpretation or review.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 */
export function threeQuestionsEditorialTestFixture(facts) {
  if (facts.editorialProfile !== THREE_QUESTIONS_EDITORIAL_VERSION) return {};
  return {
    claims: threeQuestionsRoles.map((id, i) => ({
      id,
      kind: "hypothesis",
      text:
        "Fixture estrutural do par " +
        (i + 1) +
        "; sem significado homologado.",
      evidence: [
        "card-" + (i + 1),
        "question-" + (i + 1),
        ...(facts.facts.some((f) => f.id === "tarot-context")
          ? ["tarot-context"]
          : []),
      ],
    })),
    relations: [
      {
        kind: "tension",
        claimIds: [...threeQuestionsRoles],
        text: "Relação entre três pares em fixture; sem interpretação aprovada.",
      },
    ],
    synthesis: [
      {
        claimIds: [...threeQuestionsRoles],
        text: "Síntese estrutural de três perguntas e cartas; sem conteúdo aprovado.",
      },
    ],
    reflections: [
      "Que possibilidade posso observar no primeiro par?",
      "Que limite posso verificar no segundo par?",
      "Que alternativa posso testar no terceiro par?",
    ],
  };
}
import {
  TAROT_YES_NO_EDITORIAL_VERSION,
  tarotYesNoRoles,
} from "../../packages/ai/src/tarot-yes-no.ts";
/** Test-only yes/no coverage; never approved meanings, interpretation or review.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 */
export function tarotYesNoEditorialTestFixture(facts) {
  if (facts.editorialProfile !== TAROT_YES_NO_EDITORIAL_VERSION) return {};
  const card = facts.facts.find((fact) => fact.id === "card-1");
  const question = facts.facts.find((fact) => fact.id === "question-1");
  if (!card || !question) throw new Error("fixture_tarot_yes_no_missing");
  return {
    claims: [
      {
        id: "tarot-yes-no-fact",
        kind: "fact",
        text: card.display,
        evidence: ["card-1"],
      },
      {
        id: "yes-no-question-fact",
        kind: "fact",
        text: question.display,
        evidence: ["question-1"],
      },
      ...tarotYesNoRoles.map((id) => ({
        id,
        kind: "hypothesis",
        text: `Fixture estrutural de ${id}; sem significado homologado.`,
        evidence:
          id === "yes-no-conditions"
            ? ["card-1"]
            : [
                "card-1",
                "question-1",
                ...(id === "yes-no-question" &&
                facts.facts.some((fact) => fact.id === "tarot-context")
                  ? ["tarot-context"]
                  : []),
              ],
      })),
    ],
    relations: [],
    synthesis: [
      {
        claimIds: [...tarotYesNoRoles],
        text: "Síntese de cobertura da carta e pergunta; sem conteúdo aprovado.",
      },
    ],
    reflections: [
      "Que observação posso fazer ao testar um pequeno experimento hoje?",
    ],
  };
}

import {
  TAROT_FOCUS_EDITORIAL_VERSION,
  tarotFocusRoles,
} from "../../packages/ai/src/tarot-focus.ts";
import {
  MIDHEAVEN_EDITORIAL_VERSION,
  midheavenRoles,
} from "../../packages/ai/src/midheaven.ts";
import {
  DAILY_CARD_EDITORIAL_VERSION,
  dailyCardRoles,
} from "../../packages/ai/src/daily-card.ts";
import {
  CAREER_COMPASS_EDITORIAL_VERSION,
  careerCompassRoles,
} from "../../packages/ai/src/career-compass.ts";
import {
  THREE_PILLARS_EDITORIAL_VERSION,
  threePillarsFactIds,
  threePillarsRoles,
} from "../../packages/ai/src/three-pillars.ts";
import {
  BIRTH_CHART_EDITORIAL_VERSION,
  birthChartRoles,
} from "../../packages/ai/src/birth-chart.ts";
import {
  ASCENDANT_EDITORIAL_VERSION,
  ascendantRoles,
} from "../../packages/ai/src/ascendant.ts";

/** Test-only focus coverage; never approved meanings, interpretation or review.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 */
export function tarotFocusEditorialTestFixture(facts) {
  if (facts.editorialProfile !== TAROT_FOCUS_EDITORIAL_VERSION) return {};
  const card = facts.facts.find((fact) => fact.id === "card-1");
  const question = facts.facts.find((fact) => fact.id === "question-1");
  if (!card || !question) throw new Error("fixture_tarot_focus_missing");
  return {
    claims: [
      {
        id: "tarot-focus-fact",
        kind: "fact",
        text: card.display,
        evidence: ["card-1"],
      },
      {
        id: "focus-question-fact",
        kind: "fact",
        text: question.display,
        evidence: ["question-1"],
      },
      ...tarotFocusRoles.map((id) => ({
        id,
        kind: "hypothesis",
        text: `Fixture estrutural de ${id}; sem significado homologado.`,
        evidence:
          id === "focus-symbol"
            ? ["card-1"]
            : [
                "card-1",
                "question-1",
                ...(id === "focus-question" &&
                facts.facts.some((fact) => fact.id === "tarot-context")
                  ? ["tarot-context"]
                  : []),
              ],
      })),
    ],
    relations: [],
    synthesis: [
      {
        claimIds: [...tarotFocusRoles],
        text: "Síntese de cobertura da carta e pergunta; sem conteúdo aprovado.",
      },
    ],
    reflections: [
      "Que observação posso fazer ao testar um pequeno experimento hoje?",
    ],
  };
}

/** Test-only daily coverage; never approved meanings, interpretation or review.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 */
export function dailyCardEditorialTestFixture(facts) {
  if (facts.editorialProfile !== DAILY_CARD_EDITORIAL_VERSION) return {};
  const card = facts.facts.find((fact) => fact.id === "card-1");
  const question = facts.facts.find((fact) => fact.id === "question-1");
  if (!card || !question) throw new Error("fixture_daily_card_missing");
  return {
    claims: [
      {
        id: "daily-card-fact",
        kind: "fact",
        text: card.display,
        evidence: ["card-1"],
      },
      {
        id: "daily-question-fact",
        kind: "fact",
        text: question.display,
        evidence: ["question-1"],
      },
      ...dailyCardRoles.map((id) => ({
        id,
        kind: "hypothesis",
        text: `Fixture estrutural de ${id}; sem significado homologado.`,
        evidence:
          id === "daily-observation" ? ["card-1"] : ["card-1", "question-1"],
      })),
    ],
    relations: [],
    synthesis: [
      {
        claimIds: [...dailyCardRoles],
        text: "Síntese de cobertura da carta e pergunta; sem conteúdo aprovado.",
      },
    ],
    reflections: [
      "Que observação posso fazer ao testar um pequeno experimento hoje?",
    ],
  };
}

/** Test-only ASC coverage; no interpretation, model validation or approval.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 */
export function ascendantEditorialTestFixture(facts) {
  if (facts.editorialProfile !== ASCENDANT_EDITORIAL_VERSION) return {};
  const fact = facts.facts.find((fact) => fact.id === "angle-ascendant");
  if (!fact) throw new Error("fixture_ascendant_missing");
  return {
    claims: [
      {
        id: "asc-fact",
        kind: "fact",
        text: fact.display,
        evidence: ["angle-ascendant"],
      },
      ...ascendantRoles.map((id) => ({
        id,
        kind: "hypothesis",
        text: `Fixture estrutural de ${id}; não é leitura homologada.`,
        evidence: ["angle-ascendant"],
      })),
    ],
    relations: [],
    synthesis: [
      {
        claimIds: [...ascendantRoles],
        text: "Síntese de teste dos três papéis; conteúdo sem aprovação legítima.",
      },
    ],
    reflections: [
      "Como quero iniciar um primeiro contato?",
      "Que alternativa de iniciativa posso observar?",
      "Qual experimento reversível ajuda a ajustar minha abordagem?",
    ],
  };
}

// Test-only structural overrides. No interpretation, review or release authority.
/** @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts */
export function careerEditorialTestFixture(facts) {
  if (facts.editorialProfile !== CAREER_COMPASS_EDITORIAL_VERSION) return {};
  const midheaven = facts.facts.find((fact) => fact.id === "angle-midheaven");
  if (!midheaven) throw new Error("fixture_midheaven_missing");
  return {
    claims: [
      {
        id: "mc",
        kind: "fact",
        text: midheaven.display,
        evidence: ["angle-midheaven"],
      },
      ...careerCompassRoles.map((id) => ({
        id,
        kind: "hypothesis",
        text: `Fixture estrutural do papel ${id}; conteúdo não homologado.`,
        evidence: ["angle-midheaven"],
      })),
    ],
    synthesis: [
      {
        claimIds: [...careerCompassRoles],
        text: "Síntese sintética sem revisão editorial.",
      },
    ],
    reflections: [
      "Que contribuição quero observar?",
      "Em qual ambiente posso testá-la?",
      "Qual experimento reversível cabe nesta semana?",
    ],
  };
}

/** Test-only structural projection; never editorial content or approval.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 */
export function threePillarsEditorialTestFixture(facts) {
  if (facts.editorialProfile !== THREE_PILLARS_EDITORIAL_VERSION) return {};
  return {
    claims: [
      ...threePillarsFactIds.map((id, index) => {
        const fact = facts.facts.find((fact) => fact.id === id);
        if (!fact) throw new Error("fixture_pillar_missing");
        return {
          id: `pillar-${index}`,
          kind: "fact",
          text: fact.display,
          evidence: [id],
        };
      }),
      {
        id: "sun-moon-dynamics",
        kind: "hypothesis",
        text: "Fixture de dinâmica Sol e Lua; conteúdo não homologado.",
        evidence: ["position-sun", "position-moon"],
      },
      {
        id: "ascendant-expression",
        kind: "hypothesis",
        text: "Fixture de abordagem e fator solar; requer revisão.",
        evidence: ["angle-ascendant", "position-sun"],
      },
    ],
    relations: [
      {
        kind: "convergence",
        claimIds: [...threePillarsRoles],
        text: "Relação simbólica sintética para teste de referência.",
      },
    ],
    synthesis: [
      {
        claimIds: [...threePillarsRoles],
        text: "Síntese integrada de fixture sem autoridade editorial.",
      },
    ],
    reflections: [
      "Que intenção quero observar?",
      "Qual necessidade pede espaço?",
      "Qual abordagem posso experimentar de modo reversível?",
    ],
  };
}

/** Test-only coverage; the text is not a birth-chart interpretation or approval.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 */
export function birthChartEditorialTestFixture(facts) {
  if (facts.editorialProfile !== BIRTH_CHART_EDITORIAL_VERSION) return {};
  const ids = Object.keys(birthChartRoles);
  return {
    claims: Object.entries(birthChartRoles).map(([id, evidence]) => ({
      id,
      kind: "hypothesis",
      text: `Fixture estrutural do Mapa Astral: ${id}; sem conteúdo homologado.`,
      evidence: [...evidence],
    })),
    relations: [
      {
        kind: "convergence",
        claimIds: ids,
        text: "Relação de teste entre planetas, ângulos e cúspides; não representa aspecto.",
      },
    ],
    synthesis: [
      {
        claimIds: ids,
        text: "Síntese de fixture cobrindo referências; sem revisão legítima.",
      },
    ],
    reflections: [
      "Que intenção e necessidade quero observar?",
      "Quais recursos posso considerar no cotidiano?",
      "Qual experimento reversível cabe nesta semana?",
    ],
  };
}

/** Test-only structural coverage, never interpretation or approval.
 * @param {import('../../packages/ai/src/contracts.ts').FactsEnvelope} facts
 */
export function midheavenEditorialTestFixture(facts) {
  if (facts.editorialProfile !== MIDHEAVEN_EDITORIAL_VERSION) return {};
  const fact = facts.facts.find((fact) => fact.id === "angle-midheaven");
  if (!fact) throw new Error("fixture_midheaven_missing");
  return {
    claims: [
      {
        id: "mc-fact",
        kind: "fact",
        text: fact.display,
        evidence: ["angle-midheaven"],
      },
      ...midheavenRoles.map((id) => ({
        id,
        kind: "hypothesis",
        text: `Fixture estrutural de ${id}; não é leitura homologada.`,
        evidence: ["angle-midheaven"],
      })),
    ],
    relations: [],
    synthesis: [
      {
        claimIds: [...midheavenRoles],
        text: "Síntese de teste dos três papéis; conteúdo sem aprovação legítima.",
      },
    ],
    reflections: [
      "Que contribuição pública quero observar?",
      "Em que ambiente posso testar essa contribuição?",
      "Qual experimento reversível cabe na minha rotina?",
    ],
  };
}
