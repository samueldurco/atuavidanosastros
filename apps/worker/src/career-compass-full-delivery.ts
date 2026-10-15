import type { EditorialSnapshot } from "@atv/domain";
import { parseReading, type Reading } from "@atv/ai";
import { prepareCareerCompassFullFacts } from "./career-compass-full-editorial.ts";
import {
  evaluateCareerCompassFullDraft,
  type CareerCompassFullDraft,
} from "./product-editorial.ts";

export const CAREER_COMPASS_FULL_DELIVERY_VERSION =
  "atv-career-compass-full-delivery/1.0.1";

/** An editorial preview, deliberately lacking promotionId and reviewDigest. */
export type CareerCompassFullDeliveryContent = Omit<
  EditorialSnapshot,
  "promotionId" | "reviewDigest"
>;

type Prepared = {
  status: "prepared_for_review";
  publication: "blocked";
  reason: "delivery_review_and_promotion_required";
  basisDigest: string;
  outputDigest: string;
  deliveryDigest: string;
  content: CareerCompassFullDeliveryContent;
};
type Rejected = { status: "rejected"; publication: "blocked"; reason: string };

const themeSections = [
  ["theme-contribution", "Contribuição e direção de trabalho"],
  ["theme-motivation", "Motivação na prática"],
  ["theme-environment", "Ambiente e condições"],
  ["theme-working-style", "Modo de trabalhar"],
  ["theme-sustainability", "Sustentação e limites"],
] as const;
const relationRoles = [
  "selected-relation-1", "selected-relation-2", "selected-relation-3",
] as const;
const unique = (items: readonly string[]) => [...new Set(items)];

const calculationNotices = new Map<string, string | null>([
  ["Gauntlet integral pendente; amostras independentes não homologam todo o intervalo 1900–2099.",
    "A precisão desta base ainda está em validação independente."],
  ["UTC aproxima UT1; ΔT usa o modelo da candidata, sem correção IERS de DUT1.",
    "Pequenas diferenças na referência de tempo podem alterar graus exatos."],
  ["Retrogradação é um sinal da candidata; instante de estação e aplicação/separação de aspectos não são certificados.",
    "Movimentos retrógrados e relações entre posições são aproximados nesta versão."],
  ["Regras IANA do runtime não estão fixadas; o offset resolvido é registrado.",
    "Confira a hora e o fuso de nascimento informados antes de usar a leitura."],
  ["Offset histórico fornecido pelo usuário; DST não é inferido.",
    "Confira a hora e o fuso de nascimento informados antes de usar a leitura."],
  ["Base factual experimental para revisão editorial; nenhuma leitura foi produzida ou liberada.", null],
  ["Casas Placidus e Ascendente só são usados quando disponíveis; nenhum sistema substituto é inferido.",
    "Quando uma casa ou o Ascendente não estiver disponível, a leitura não o substitui."],
  ["Aspectos maiores têm orbes nominais de 6°, exceto sextil de 4°; contatos ao MC até 3° em longitude. Aplicação e separação não são avaliadas.",
    "As relações entre posições são pistas simbólicas, não previsões de acontecimentos."],
  ["Contexto declarado é relato, não fato calculado; os cinco temas são trilhas de evidência, não conclusões profissionais.",
    "Seu contexto profissional é um relato seu e não altera o cálculo do mapa."],
  ["Sem prescrição de profissão, renda, contratação, aptidão ou destino. Formação, saúde, acesso e condições reais exigem investigação própria.",
    "A leitura não determina profissão, renda ou destino; considere também suas condições reais."],
]);

function readerCalculationLimits(limits: readonly string[]): string[] | null {
  if (limits.some((limit) => !calculationNotices.has(limit))) return null;
  return unique(limits.flatMap((limit) => {
    const notice = calculationNotices.get(limit);
    return notice ? [notice] : [];
  }));
}

function readerFactDisplay(fact: { id: string; display: string }): string {
  if (fact.id === "personal-context") return `Contexto informado: ${fact.display}`;
  return fact.display
    .replace(/(-?\d+(?:\.\d+)?)°/g, (_, degrees: string) =>
      `${Number(degrees).toFixed(1).replace(".", ",")}°`)
    .replace(/^Regente moderno do Meio do Céu:/, "Regente do Meio do Céu:")
    .replace(/; orbe /, "; distância de ")
    .replace(/; distância em longitude /, "; a ")
    .replace("condições fora do contrato conservador de casas/ângulos",
      "dados insuficientes para este cálculo");
}

function project(reading: Reading, facts: readonly { id: string; display: string }[],
  calculationLimits: readonly string[]): CareerCompassFullDeliveryContent | null {
  const readerLimits = readerCalculationLimits(calculationLimits);
  if (!readerLimits) return null;
  const claims = new Map(reading.claims.map((claim) => [claim.id, claim]));
  const get = (id: string) => claims.get(id);
  const claimSection = (id: string, title: string) => {
    const claim = get(id);
    return claim && { title, text: claim.text, evidence: [...claim.evidence] };
  };
  const direction = claimSection("integrated-direction", "Direção integrada");
  const criterion = claimSection("context-criterion", "Sua pergunta e critérios de comparação");
  const themes = themeSections.map(([id, title]) => claimSection(id, title));
  const experiment = claimSection("reversible-experiment", "Experimento reversível");
  const decision = get("decision-review");
  const relations = relationRoles.map((id) => {
    const claim = get(id);
    const linked = reading.relations.find((relation) => relation.claimIds.includes(id) &&
      relation.claimIds.some((claimId) => claimId.startsWith("theme-")));
    return claim && linked && { claim, linked };
  });
  if (!direction || !criterion || themes.some((section) => !section) ||
      !experiment || !decision || relations.some((entry) => !entry) ||
      reading.synthesis.length === 0 || reading.reflections.length !== 3) return null;

  const context = facts.find((fact) => fact.id === "personal-context");
  if (context) {
    criterion.text = `${context.display}\n\n${criterion.text}`;
    criterion.evidence = unique(["personal-context", ...criterion.evidence]);
  }
  const relationParts = relations.map((entry, index) =>
    `${index + 1}. ${entry!.claim.text}\n\n${entry!.linked.text}`);
  const relationEvidence = unique(relations.flatMap((entry) => [
    ...entry!.claim.evidence,
    ...entry!.linked.claimIds.flatMap((id) => get(id)?.evidence ?? []),
  ]));
  const synthesis = reading.synthesis.map((entry) => entry.text).join("\n\n");
  const questions = reading.reflections.map((text, index) => `${index + 1}. ${text}`).join("\n\n");
  const decisionEvidence = unique([
    ...decision.evidence,
    ...reading.synthesis.flatMap((entry) => entry.claimIds.flatMap((id) => get(id)?.evidence ?? [])),
  ]);
  const sections = [
    direction,
    criterion,
    ...themes,
    { title: "Três relações selecionadas", text: relationParts.join("\n\n"), evidence: relationEvidence },
    experiment,
    { title: "Revisão para decidir", text: `${decision.text}\n\n${synthesis}\n\nPerguntas para a revisão:\n\n${questions}`,
      evidence: decisionEvidence },
    { title: "Base da leitura", text: facts.map(readerFactDisplay).join("\n\n"),
      evidence: facts.map((fact) => fact.id) },
  ] as CareerCompassFullDeliveryContent["sections"];
  if (sections.length !== 11 || sections.some((section) =>
    !section.text.trim() || section.title.length > 240 || section.text.length > 20000 ||
    section.evidence.length === 0 || section.evidence.length > 100)) return null;
  const known = new Set(facts.map((fact) => fact.id));
  if (sections.some((section) => section.evidence.some((id) => !known.has(id)))) return null;
  return {
    version: CAREER_COMPASS_FULL_DELIVERY_VERSION,
    title: reading.title,
    sections,
    limits: unique([...reading.limits, ...readerLimits]),
  };
}

/** Private complete delivery candidate. No public runtime registration or issuance. */
export async function prepareCareerCompassFullDelivery(
  input: CareerCompassFullDraft,
): Promise<Prepared | Rejected> {
  const reject = (reason: string): Rejected => ({ status: "rejected", publication: "blocked", reason });
  if (!input || input.productId !== "career-compass" || input.tier !== "premium")
    return reject("invalid_input");
  const prepared = prepareCareerCompassFullFacts(input.workflowInput, input.calculation);
  if (prepared.status !== "prepared_for_review") return reject(prepared.reason);
  const reading = parseReading(input.output, "premium", prepared.facts.editorialProfile);
  if (!reading) return reject("invalid_schema");
  const assessment = await evaluateCareerCompassFullDraft({ ...input, output: reading });
  if (assessment.status !== "needs_editorial_review" ||
      !assessment.basisDigest || !assessment.outputDigest)
    return reject(assessment.reason);
  const content = project(reading, prepared.facts.facts, prepared.calculation.limits);
  if (!content || new TextEncoder().encode(JSON.stringify(content)).length > 90000)
    return reject("delivery_not_representable");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify({
    version: CAREER_COMPASS_FULL_DELIVERY_VERSION,
    basisDigest: assessment.basisDigest,
    outputDigest: assessment.outputDigest,
    content,
  })));
  const deliveryDigest = Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0")).join("");
  return {
    status: "prepared_for_review",
    publication: "blocked",
    reason: "delivery_review_and_promotion_required",
    basisDigest: assessment.basisDigest,
    outputDigest: assessment.outputDigest,
    deliveryDigest,
    content,
  };
}
