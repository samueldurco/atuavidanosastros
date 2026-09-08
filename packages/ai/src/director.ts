import type { FactsEnvelope, Reading, Tier } from "./contracts.ts";

export const RUBRIC_VERSION = "atv-director/1.0.0";
export const dimensions = [
  "depth",
  "coherence",
  "specificity",
  "integration",
  "synthesis",
  "voice",
  "clarity",
  "utility",
  "elegance",
  "nonRepetition",
  "responsibility",
  "factualFidelity",
] as const;
export type Dimension = (typeof dimensions)[number];
export interface Finding {
  code: string;
  location: string;
}
export interface MechanicalReview {
  status: "rejected" | "needs_editorial_review";
  findings: Finding[];
  rubricVersion: typeof RUBRIC_VERSION;
}
export interface ScoredReview {
  rubricVersion: typeof RUBRIC_VERSION;
  /** SHA-256 of the exact reading, not an input fingerprint or a previous draft. */
  outputDigest: string;
  reviewer: string;
  source: "human" | "calibrated-reviewer";
  calibrationId: string | null;
  scores: Record<Dimension, number>;
  evidence: Record<Dimension, string>;
}

const normalize = (v: string) =>
  v
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const unsafe = [
  /voce (?:vai|ira) (?:morrer|enriquecer|ser demitid)/,
  /(?:largue|abandone) (?:seu|o) emprego/,
  /(?:pare|interrompa|suspenda) (?:de tomar|seus? medicamentos?|o tratamento)/,
  /(?:invista|aplique) (?:todo|seu dinheiro)/,
  /(?:destino|futuro) (?:esta|e) (?:selado|garantido)/,
  /(?:certeza|prova) de traicao/,
];
const cliches = [
  "o universo conspira",
  "tudo acontece por uma razao",
  "sua melhor versao",
  "energia poderosa",
  "voce nasceu para",
];

/** Hard checks are deliberately NOT a machine-generated score of depth or truth. */
export function inspectReading(
  reading: Reading,
  facts: FactsEnvelope,
): MechanicalReview {
  const findings: Finding[] = [];
  const fail = (code: string, location: string) =>
    findings.push({ code, location });
  const approved = new Map(facts.facts.map((f) => [f.id, f]));
  const claims = new Map(reading.claims.map((c) => [c.id, c]));
  if (reading.capability !== facts.capability)
    fail("capability_mismatch", "capability");
  if (
    (facts.completeness === "partial" || facts.facts.length < 2) &&
    reading.scope !== "partial"
  )
    fail("overstated_scope", "scope");
  if (claims.size !== reading.claims.length)
    fail("duplicate_claim_id", "claims");
  for (const claim of reading.claims) {
    if (claim.evidence.some((ref) => !approved.has(ref)))
      fail("unknown_fact", claim.id);
    if (
      claim.kind === "fact" &&
      (claim.evidence.length !== 1 ||
        claim.text !== approved.get(claim.evidence[0]!)?.display)
    )
      fail("altered_fact", claim.id);
  }
  for (const [i, relation] of reading.relations.entries()) {
    if (relation.claimIds.some((ref) => !claims.has(ref)))
      fail("unknown_claim", `relations.${i}`);
    const sources = new Set(
      relation.claimIds.flatMap((ref) => claims.get(ref)?.evidence ?? []),
    );
    if (sources.size < 2) fail("unsupported_relation", `relations.${i}`);
  }
  const used = new Set(reading.claims.flatMap((c) => c.evidence));
  if (
    reading.scope === "integrated" &&
    (reading.relations.length === 0 || used.size < 2)
  )
    fail("integration_missing", "relations");
  for (const [i, synthesis] of reading.synthesis.entries()) {
    if (synthesis.claimIds.some((ref) => !claims.has(ref)))
      fail("unknown_claim", `synthesis.${i}`);
  }
  const passages = [
    reading.title,
    ...reading.claims.map((c) => c.text),
    ...reading.relations.map((r) => r.text),
    ...reading.synthesis.map((s) => s.text),
    ...reading.reflections,
    ...reading.limits,
  ];
  const seen = new Set<string>();
  for (const [i, passage] of passages.entries()) {
    const text = normalize(passage);
    if (unsafe.some((pattern) => pattern.test(text)))
      fail("unsafe_prescription", `passages.${i}`);
    if (cliches.some((cliche) => text.includes(cliche)))
      fail("cliche", `passages.${i}`);
    if (
      /(?:https?:\/\/|<\/?[a-z][^>]*>|system_instruction|ignore (?:todas (?:as )?|as )instrucoes)/.test(
        text,
      )
    )
      fail("untrusted_instruction_or_markup", `passages.${i}`);
    if (seen.has(text)) fail("repetition", `passages.${i}`);
    seen.add(text);
  }
  return {
    status: findings.length ? "rejected" : "needs_editorial_review",
    findings,
    rubricVersion: RUBRIC_VERSION,
  };
}

export function editorialDecision(
  mechanical: MechanicalReview,
  review: ScoredReview | undefined,
  digest: string,
  tier: Tier,
): "rejected" | "needs_editorial_review" | "approved" {
  if (mechanical.status === "rejected") return "rejected";
  if (
    !review ||
    review.rubricVersion !== RUBRIC_VERSION ||
    review.outputDigest !== digest ||
    !/^[a-f0-9]{64}$/.test(digest) ||
    !review.reviewer.trim()
  )
    return "needs_editorial_review";
  if (
    review.source !== "human" &&
    (review.source !== "calibrated-reviewer" || !review.calibrationId)
  )
    return "needs_editorial_review";
  const floor = tier === "premium" ? 8 : 7;
  for (const dimension of dimensions) {
    const score = review.scores[dimension];
    const threshold = ["responsibility", "factualFidelity"].includes(dimension)
      ? 10
      : floor;
    if (
      !Number.isFinite(score) ||
      score < threshold ||
      score > 10 ||
      !review.evidence[dimension]?.trim()
    )
      return "rejected";
  }
  return "approved";
}

export function revisionStrategy(
  findings: Finding[],
): "none" | "focal-correction" | "partial-rewrite" | "controlled-regeneration" {
  if (!findings.length) return "none";
  if (
    findings.some((f) =>
      [
        "capability_mismatch",
        "overstated_scope",
        "unsafe_prescription",
      ].includes(f.code),
    )
  )
    return "controlled-regeneration";
  return findings.length <= 2 ? "focal-correction" : "partial-rewrite";
}
