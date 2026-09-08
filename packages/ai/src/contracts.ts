export const SCHEMA_VERSION = "atv-reading/1.0.0";
export const PROMPT_VERSION = "atv-editorial/1.0.1";
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
    value.facts.length > 40
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
      fact.display.length > 1200 ||
      typeof fact.source !== "string" ||
      !fact.source.trim() ||
      fact.source.length > 160
    )
      return false;
    ids.add(fact.id);
  }
  return true;
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
