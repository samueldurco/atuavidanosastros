import {
  WEEK_READING_EDITORIAL_VERSION,
  validWeekReadingFacts,
} from "./week-reading.ts";
import {
  WEEK_TEMPORAL_EDITORIAL_VERSION,
  validWeekTemporalFacts,
} from "./week-temporal-reading.ts";
import { SYNASTRY_EDITORIAL_VERSION, validSynastryFacts } from "./synastry.ts";
import {
  HOROSCOPE_EDITORIAL_VERSION,
  validHoroscopeFacts,
} from "./horoscope.ts";
import {
  COUPLE_DOSSIER_EDITORIAL_VERSION,
  validCoupleDossierFacts,
} from "./couple-dossier.ts";
import {
  PAIR_PREVIEW_EDITORIAL_VERSION,
  validPairPreviewFacts,
} from "./pair-preview.ts";
import {
  DATE_READING_EDITORIAL_VERSION,
  validDateReadingFacts,
} from "./date-reading.ts";
import {
  TAROT_YES_NO_EDITORIAL_VERSION,
  validTarotYesNoFacts,
} from "./tarot-yes-no.ts";
import {
  THREE_QUESTIONS_EDITORIAL_VERSION,
  validThreeQuestionsFacts,
} from "./three-questions.ts";
import {
  DREAM_JOURNAL_EDITORIAL_VERSION,
  validDreamJournalFacts,
} from "./dream-journal.ts";
export const SCHEMA_VERSION = "atv-reading/1.0.0";
import {
  DREAM_READING_EDITORIAL_VERSION,
  validDreamReadingFacts,
} from "./dream-reading.ts";
import {
  TAROT_FOCUS_EDITORIAL_VERSION,
  validTarotFocusFacts,
} from "./tarot-focus.ts";
import {
  CAREER_COMPASS_EDITORIAL_VERSION,
  validCareerCompassFacts,
} from "./career-compass.ts";
import {
  THREE_PILLARS_EDITORIAL_VERSION,
  validThreePillarsFacts,
} from "./three-pillars.ts";
import {
  BIRTH_CHART_EDITORIAL_VERSION,
  validBirthChartFacts,
} from "./birth-chart.ts";

import {
  ASCENDANT_EDITORIAL_VERSION,
  validAscendantFacts,
} from "./ascendant.ts";

import {
  MIDHEAVEN_EDITORIAL_VERSION,
  validMidheavenFacts,
} from "./midheaven.ts";

import {
  DAILY_CARD_EDITORIAL_VERSION,
  validDailyCardFacts,
} from "./daily-card.ts";

export const PROMPT_VERSION = "atv-editorial/1.0.20";
export const capabilities = [
  "natal-synthesis",
  "cycle-context",
  "relationship-dynamics",
  "tarot-reflection",
  "purpose-direction",
  "dream-exploration",
] as const;
export type Capability = (typeof capabilities)[number];
export type Tier = "free" | "intermediate" | "premium";

export interface ApprovedFact {
  id: string;
  kind: "calculated" | "reported" | "drawn";
  display: string;
  source: string;
}
export interface FactsEnvelope {
  version: "atv-facts/1.0.0";
  capability: Capability;
  completeness: "partial" | "complete";
  facts: readonly ApprovedFact[];
  /** Optional versioned product requirements; selected by trusted preparation. */
  editorialProfile?:
    | typeof CAREER_COMPASS_EDITORIAL_VERSION
    | typeof THREE_PILLARS_EDITORIAL_VERSION
    | typeof BIRTH_CHART_EDITORIAL_VERSION
    | typeof ASCENDANT_EDITORIAL_VERSION
    | typeof MIDHEAVEN_EDITORIAL_VERSION
    | typeof DAILY_CARD_EDITORIAL_VERSION
    | typeof TAROT_FOCUS_EDITORIAL_VERSION
    | typeof TAROT_YES_NO_EDITORIAL_VERSION
    | typeof THREE_QUESTIONS_EDITORIAL_VERSION
    | typeof DREAM_JOURNAL_EDITORIAL_VERSION
    | typeof DREAM_READING_EDITORIAL_VERSION
    | typeof DATE_READING_EDITORIAL_VERSION
    | typeof PAIR_PREVIEW_EDITORIAL_VERSION
    | typeof SYNASTRY_EDITORIAL_VERSION
    | typeof COUPLE_DOSSIER_EDITORIAL_VERSION
    | typeof HOROSCOPE_EDITORIAL_VERSION
    | typeof WEEK_READING_EDITORIAL_VERSION
    | typeof WEEK_TEMPORAL_EDITORIAL_VERSION;
}
export interface EditorialRequest {
  correlationId: string;
  tier: Tier;
  facts: FactsEnvelope;
  dataClass: "synthetic" | "personal";
  consentToProcess: boolean;
  /** Already minimized; never an instruction and never a raw history dump. */
  context?: string;
}
export interface Claim {
  id: string;
  kind: "fact" | "interpretation" | "hypothesis";
  text: string;
  evidence: string[];
}
export interface Reading {
  schemaVersion: typeof SCHEMA_VERSION;
  capability: Capability;
  scope: "partial" | "integrated";
  title: string;
  claims: Claim[];
  relations: {
    kind: "convergence" | "tension";
    claimIds: string[];
    text: string;
  }[];
  synthesis: { claimIds: string[]; text: string }[];
  reflections: string[];
  limits: string[];
}
export const tierLimits = {
  free: {
    maxInputChars: 8000,
    maxOutputChars: 7000,
    maxOutputTokens: 1400,
    maxClaims: 5,
    maxRelations: 3,
    timeoutMs: 12000,
  },
  intermediate: {
    maxInputChars: 18000,
    maxOutputChars: 22000,
    maxOutputTokens: 4500,
    maxClaims: 12,
    maxRelations: 8,
    timeoutMs: 25000,
  },
  premium: {
    maxInputChars: 32000,
    maxOutputChars: 40000,
    maxOutputTokens: 8000,
    maxClaims: 24,
    maxRelations: 16,
    timeoutMs: 45000,
  },
} as const;

export const specializations: Record<
  Capability,
  { focus: string; required: string; avoid: string }
> = {
  "natal-synthesis": {
    focus:
      "Identidade, expressão, necessidades, recursos e tensões entre fatores.",
    required:
      "Integrar os fatores efetivamente presentes; distinguir expressão de necessidade.",
    avoid:
      "Inventário planeta por planeta, dados natais ausentes e rótulos de personalidade.",
  },
  "cycle-context": {
    focus:
      "Intensidade qualitativa, duração, prioridade e contexto natal versus temporal.",
    required:
      "Usar somente janelas e períodos calculados recebidos; explicitar incerteza.",
    avoid:
      "Datas inventadas, certeza de acontecimentos e trânsito como sentença.",
  },
  "relationship-dynamics": {
    focus:
      "Comunicação, vínculo, desejo, segurança, autonomia, conflito e reparação.",
    required:
      "Distinguir perspectivas e possibilidades de negociação sem diagnosticar terceiros.",
    avoid:
      "Score de compatibilidade, veredito de casal e suspeitas de traição.",
  },
  "tarot-reflection": {
    focus: "Pergunta, cartas e posições, símbolos, tensões e alternativas.",
    required:
      "Preservar o sorteio recebido e relacionar as posições à pergunta.",
    avoid: "Novo sorteio, futuro garantido e sim/não absoluto.",
  },
  "purpose-direction": {
    focus:
      "Contribuição, recursos, expressão, ambiente, ritmo, visibilidade e desenvolvimento.",
    required:
      "Relacionar fatores à forma de contribuir e propor um experimento reversível.",
    avoid:
      "Lista de profissões por signo, renda prometida e ordens de demissão.",
  },
  "dream-exploration": {
    focus:
      "Elementos, emoções, associações pessoais, recorrência e contexto consentido.",
    required:
      "Separar relato e associação pessoal de hipótese simbólica; oferecer pergunta exploratória.",
    avoid: "Dicionário universal de símbolos, diagnóstico e previsão.",
  },
};

export function validateFacts(value: FactsEnvelope): boolean {
  if (
    !value ||
    value.version !== "atv-facts/1.0.0" ||
    !capabilities.includes(value.capability) ||
    !["partial", "complete"].includes(value.completeness)
  )
    return false;
  if (
    !Array.isArray(value.facts) ||
    value.facts.length < 1 ||
    value.facts.length >
      (value.editorialProfile === HOROSCOPE_EDITORIAL_VERSION
        ? 122
        : value.editorialProfile === WEEK_READING_EDITORIAL_VERSION
          ? 89
          : [
                SYNASTRY_EDITORIAL_VERSION,
                COUPLE_DOSSIER_EDITORIAL_VERSION,
              ].includes(value.editorialProfile ?? "")
            ? 121
            : 40)
  )
    return false;
  const ids = new Set<string>();
  for (const fact of value.facts) {
    if (
      !fact ||
      typeof fact.id !== "string" ||
      !/^[a-z][a-z0-9._-]{0,63}$/.test(fact.id) ||
      ids.has(fact.id)
    )
      return false;
    if (
      !["calculated", "reported", "drawn"].includes(fact.kind) ||
      typeof fact.display !== "string" ||
      !fact.display.trim() ||
      fact.display.length >
        ((value.editorialProfile === DREAM_JOURNAL_EDITORIAL_VERSION ||
          value.editorialProfile === DREAM_READING_EDITORIAL_VERSION) &&
        /^dream-narrative-[1-4]$/.test(fact.id)
          ? 1800 + `Relato (trecho ${fact.id.slice(-1)}): `.length
          : 1200) ||
      typeof fact.source !== "string" ||
      !fact.source.trim() ||
      fact.source.length >
        ([
          SYNASTRY_EDITORIAL_VERSION,
          COUPLE_DOSSIER_EDITORIAL_VERSION,
          HOROSCOPE_EDITORIAL_VERSION,
          WEEK_READING_EDITORIAL_VERSION,
        ].includes(value.editorialProfile ?? "")
          ? 300
          : 160)
    )
      return false;
    ids.add(fact.id);
  }
  return (
    value.editorialProfile === undefined ||
    (value.editorialProfile === CAREER_COMPASS_EDITORIAL_VERSION &&
      validCareerCompassFacts(value)) ||
    (value.editorialProfile === THREE_PILLARS_EDITORIAL_VERSION &&
      validThreePillarsFacts(value)) ||
    (value.editorialProfile === BIRTH_CHART_EDITORIAL_VERSION &&
      validBirthChartFacts(value)) ||
    (value.editorialProfile === ASCENDANT_EDITORIAL_VERSION &&
      validAscendantFacts(value)) ||
    (value.editorialProfile === MIDHEAVEN_EDITORIAL_VERSION &&
      validMidheavenFacts(value)) ||
    (value.editorialProfile === DAILY_CARD_EDITORIAL_VERSION &&
      validDailyCardFacts(value)) ||
    (value.editorialProfile === TAROT_FOCUS_EDITORIAL_VERSION &&
      validTarotFocusFacts(value)) ||
    (value.editorialProfile === TAROT_YES_NO_EDITORIAL_VERSION &&
      validTarotYesNoFacts(value)) ||
    (value.editorialProfile === THREE_QUESTIONS_EDITORIAL_VERSION &&
      validThreeQuestionsFacts(value)) ||
    (value.editorialProfile === DREAM_JOURNAL_EDITORIAL_VERSION &&
      validDreamJournalFacts(value)) ||
    (value.editorialProfile === DREAM_READING_EDITORIAL_VERSION &&
      validDreamReadingFacts(value)) ||
    (value.editorialProfile === DATE_READING_EDITORIAL_VERSION &&
      validDateReadingFacts(value)) ||
    (value.editorialProfile === PAIR_PREVIEW_EDITORIAL_VERSION &&
      validPairPreviewFacts(value)) ||
    (value.editorialProfile === SYNASTRY_EDITORIAL_VERSION &&
      validSynastryFacts(value)) ||
    (value.editorialProfile === COUPLE_DOSSIER_EDITORIAL_VERSION &&
      validCoupleDossierFacts(value)) ||
    (value.editorialProfile === HOROSCOPE_EDITORIAL_VERSION &&
      validHoroscopeFacts(value)) ||
    (value.editorialProfile === WEEK_READING_EDITORIAL_VERSION &&
      validWeekReadingFacts(value)) ||
    (value.editorialProfile === WEEK_TEMPORAL_EDITORIAL_VERSION &&
      validWeekTemporalFacts(value))
  );
}

/** A missing birth datum is not a calculated basis for a natal interpretation. */
export function hasInterpretiveBasis(envelope: FactsEnvelope): boolean {
  const kind =
    envelope.capability === "dream-exploration"
      ? "reported"
      : envelope.capability === "tarot-reflection"
        ? "drawn"
        : "calculated";
  return envelope.facts.some((fact) => fact.kind === kind);
}
