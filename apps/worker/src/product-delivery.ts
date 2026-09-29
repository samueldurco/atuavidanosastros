import type { EditorialSnapshot } from "@atv/domain";
import { parseReading, tierLimits, type Reading } from "@atv/ai";
import {
  evaluateProductDraft,
  type ProductDraft,
} from "./product-editorial.ts";

export const PRODUCT_DELIVERY_VERSION = "atv-product-delivery/1.6.0";
/** Deliberately lacks promotionId/reviewDigest: this cannot be published as a receipt. */
export type ProductDeliveryContent = Omit<
  EditorialSnapshot,
  "promotionId" | "reviewDigest"
>;
type Preparation =
  | {
      status: "prepared_for_review";
      publication: "blocked";
      reason: "delivery_review_and_promotion_required";
      basisDigest: string;
      outputDigest: string;
      deliveryDigest: string;
      content: ProductDeliveryContent;
    }
  | { status: "rejected"; publication: "blocked"; reason: string };

const labels = {
  fact: "Fato",
  interpretation: "Interpretação",
  hypothesis: "Hipótese",
};
const unique = (values: string[]) => [...new Set(values)];
const careerTitles = new Map([
  ["public-direction", "Direção pública e contribuição"],
  ["work-possibilities", "Ambientes e modos de trabalhar"],
  ["tension-or-excess", "Tensão ou excesso possível"],
]);
const ascendantTitles = new Map([
  ["ascendant-approach", "Abordagem e primeiro contato"],
  ["ascendant-possibilities", "Possibilidades de expressão"],
  ["ascendant-tension", "Tensão ou excesso possível"],
]);
const midheavenTitles = new Map([
  ["midheaven-contribution", "Direção pública e contribuição"],
  ["midheaven-possibilities", "Ambientes e modos de trabalhar"],
  ["midheaven-tension", "Tensão ou excesso possível"],
]);
const dailyCardTitles = new Map([
  ["daily-observation", "Possibilidade e observação do dia"],
  ["daily-question", "Conexão com sua pergunta"],
  ["daily-practice", "Um pequeno experimento"],
]);
const dailyCardFacts = new Map([
  ["card-1", "Carta registrada"],
  ["question-1", "Pergunta relatada"],
]);
const threePillarsTitles = new Map([
  ["sun-moon-dynamics", "Sol e Lua: intenção e necessidade"],
  ["ascendant-expression", "Ascendente: abordagem e expressão"],
]);
const threePillarsFacts = new Map([
  ["position-sun", "Seu Sol"],
  ["position-moon", "Sua Lua"],
  ["angle-ascendant", "Seu Ascendente"],
]);
const birthChartTitles = new Map([
  ["solar-identity", "Sol: identidade e intenção"],
  ["lunar-needs", "Lua: necessidades e acolhimento"],
  ["personal-resources", "Mercúrio, Vênus e Marte: recursos pessoais"],
  ["social-resources", "Júpiter e Saturno: expansão e estrutura"],
  ["collective-symbols", "Urano, Netuno e Plutão: símbolos coletivos"],
  ["ascendant-approach", "Ascendente: abordagem e expressão"],
  ["midheaven-contribution", "Meio do Céu: direção e contribuição"],
  ["house-sectors-1-3", "Casas 1 a 3: presença, recursos e trocas"],
  ["house-sectors-4-6", "Casas 4 a 6: raízes, criação e cotidiano"],
  ["house-sectors-7-9", "Casas 7 a 9: vínculos, partilhas e horizontes"],
  ["house-sectors-10-12", "Casas 10 a 12: contribuição, redes e recolhimento"],
]);
function claimTitle(
  claim: Reading["claims"][number],
  productId: string,
): string {
  const subject =
    productId === "career-compass"
      ? (careerTitles.get(claim.id) ??
        (claim.kind === "fact" &&
        claim.evidence.length === 1 &&
        claim.evidence[0] === "angle-midheaven"
          ? "Seu Meio do Céu"
          : ""))
      : productId === "three-pillars"
        ? (threePillarsTitles.get(claim.id) ??
          (claim.kind === "fact" && claim.evidence.length === 1
            ? (threePillarsFacts.get(claim.evidence[0] ?? "") ?? "")
            : ""))
        : productId === "ascendant"
          ? (ascendantTitles.get(claim.id) ??
            (claim.kind === "fact" &&
            claim.evidence.length === 1 &&
            claim.evidence[0] === "angle-ascendant"
              ? "Seu Ascendente"
              : ""))
          : productId === "midheaven"
            ? (midheavenTitles.get(claim.id) ??
              (claim.kind === "fact" &&
              claim.evidence.length === 1 &&
              claim.evidence[0] === "angle-midheaven"
                ? "Seu Meio do Céu"
                : ""))
            : productId === "daily-card"
              ? (dailyCardTitles.get(claim.id) ??
                (claim.kind === "fact" && claim.evidence.length === 1
                  ? (dailyCardFacts.get(claim.evidence[0] ?? "") ?? "")
                  : ""))
              : productId === "birth-chart"
                ? (birthChartTitles.get(claim.id) ?? "")
                : "";
  return `${subject ? subject + " — " : ""}${labels[claim.kind]} [${claim.id}]`;
}

/** Fixed text projection, not summarization. Claim references remain visible as well as resolved
 * fact evidence. Reflections share the final synthesis section, but are explicitly not evidence.
 * Oversized content fails closed instead of disappearing from the delivered representation. */
function project(
  reading: Reading,
  productId: string,
): ProductDeliveryContent | null {
  if (reading.limits.some((limit) => limit.length > 1200)) return null;
  const claims = new Map(reading.claims.map((claim) => [claim.id, claim]));
  const evidence = (ids: string[]) =>
    unique(ids.flatMap((id) => claims.get(id)!.evidence));
  const sections: EditorialSnapshot["sections"] = reading.claims.map(
    (claim) => ({
      title: claimTitle(claim, productId),
      text: claim.text,
      evidence: [...claim.evidence],
    }),
  );
  // Group adjacent relations within the reader's text/forty-section bounds.
  // A relation is never split, shortened, reordered or given new factual references.
  let relationText = "",
    relationEvidence: string[] = [],
    group = 0;
  const flush = () => {
    if (relationText)
      sections.push({
        title: `Relações (${++group})`,
        text: relationText,
        evidence: unique(relationEvidence),
      });
    relationText = "";
    relationEvidence = [];
  };
  for (const relation of reading.relations) {
    const text = `${relation.kind === "convergence" ? "Convergência" : "Tensão"} entre afirmações: ${relation.claimIds.join(", ")}\n\n${relation.text}`;
    if (text.length > 20000) return null;
    if (relationText && relationText.length + text.length + 2 > 20000) flush();
    relationText += (relationText ? "\n\n" : "") + text;
    relationEvidence.push(...evidence(relation.claimIds));
  }
  flush();
  for (const [index, synthesis] of reading.synthesis.entries()) {
    const last = index === reading.synthesis.length - 1;
    const questions = last
      ? "\n\nPerguntas exploratórias (não são afirmações factuais; as referências desta seção correspondem somente à síntese):\n\n" +
        reading.reflections.map((text, i) => `${i + 1}. ${text}`).join("\n\n")
      : "";
    sections.push({
      title: `${productId === "three-pillars" ? "Síntese dos Três Pilares" : productId === "birth-chart" ? "Síntese do Mapa Astral" : productId === "ascendant" ? "Síntese do Ascendente" : productId === "midheaven" ? "Síntese do Meio do Céu" : productId === "daily-card" ? "Síntese da Carta do Dia" : "Síntese"} (${index + 1})${last ? (productId === "daily-card" ? " e uma pergunta prática" : ["career-compass", "three-pillars", "birth-chart", "ascendant", "midheaven"].includes(productId) ? " e três perguntas práticas" : " e perguntas") : ""}`,
      text: `Afirmações de base: ${synthesis.claimIds.join(", ")}\n\n${synthesis.text}${questions}`,
      evidence: evidence(synthesis.claimIds),
    });
  }
  if (
    sections.length > 40 ||
    sections.some(
      (section) =>
        section.title.length > 240 ||
        section.text.length > 20000 ||
        !section.evidence.length ||
        section.evidence.length > 100,
    )
  )
    return null;
  return {
    version: PRODUCT_DELIVERY_VERSION,
    title: reading.title,
    sections,
    limits: [
      `Escopo declarado: ${reading.scope === "partial" ? "parcial" : "integrado"}.`,
      ...reading.limits,
    ],
  };
}

/** Offline input to an independent final-delivery review. Does not accept scores, issue receipts,
 * authenticate reviewers, call providers, verify promotions or change any release state.
 * Hashes bind content, not authority; an issuer must reconstruct this candidate from trusted data. */
export async function prepareProductDelivery(
  input: ProductDraft,
): Promise<Preparation> {
  const reject = (reason: string): Preparation => ({
    status: "rejected",
    publication: "blocked",
    reason,
  });
  if (!input || !Object.hasOwn(tierLimits, input.tier))
    return reject("invalid_input");
  const reading = parseReading(input.output, input.tier);
  if (!reading) return reject("invalid_schema");
  const productId = input.productId;
  // parseReading owns a JSON copy; evaluateProductDraft captures its other inputs before awaiting.
  const assessment = await evaluateProductDraft({ ...input, output: reading });
  if (
    assessment.status !== "needs_editorial_review" ||
    !assessment.basisDigest ||
    !assessment.outputDigest
  )
    return reject(assessment.reason);
  const content = project(reading, productId);
  if (!content) return reject("delivery_not_representable");
  const encoded = JSON.stringify({
    version: PRODUCT_DELIVERY_VERSION,
    basisDigest: assessment.basisDigest,
    outputDigest: assessment.outputDigest,
    content,
  });
  if (new TextEncoder().encode(JSON.stringify(content)).length > 90000)
    return reject("delivery_not_representable");
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(encoded),
  );
  const deliveryDigest = Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
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
