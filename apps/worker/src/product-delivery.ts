import type { EditorialSnapshot } from "@atv/domain";
import { parseReading, tierLimits, type Reading } from "@atv/ai";
import {
  evaluateProductDraft,
  type ProductDraft,
} from "./product-editorial.ts";

export const PRODUCT_DELIVERY_VERSION = "atv-product-delivery/1.0.0";
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

/** Fixed text projection, not summarization. Claim references remain visible as well as resolved
 * fact evidence. Reflections share the final synthesis section, but are explicitly not evidence.
 * Oversized content fails closed instead of disappearing from the delivered representation. */
function project(reading: Reading): ProductDeliveryContent | null {
  if (reading.limits.some((limit) => limit.length > 1200)) return null;
  const claims = new Map(reading.claims.map((claim) => [claim.id, claim]));
  const evidence = (ids: string[]) =>
    unique(ids.flatMap((id) => claims.get(id)!.evidence));
  const sections: EditorialSnapshot["sections"] = reading.claims.map(
    (claim) => ({
      title: `${labels[claim.kind]} [${claim.id}]`,
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
      title: `Síntese (${index + 1})${last ? " e perguntas" : ""}`,
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
  // parseReading owns a JSON copy; evaluateProductDraft captures its other inputs before awaiting.
  const assessment = await evaluateProductDraft({ ...input, output: reading });
  if (
    assessment.status !== "needs_editorial_review" ||
    !assessment.basisDigest ||
    !assessment.outputDigest
  )
    return reject(assessment.reason);
  const content = project(reading);
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
