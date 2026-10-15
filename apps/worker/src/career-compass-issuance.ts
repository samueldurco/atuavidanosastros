import { CAREER_COMPASS_CANDIDATE_VERSION, prepareCareerCompassCandidate } from "./career-compass-candidate.ts";
import {
  evaluateProductDelivery,
  type DeliveryReviewAuthority,
} from "./product-delivery-review.ts";
import type { ProductDraft } from "./product-editorial.ts";

export const CAREER_COMPASS_PROMOTION_EVIDENCE_VERSION =
  "atv-career-compass-promotion-evidence/1.0.0";

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): value is JsonRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const digest = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const identifier = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 200;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (record(value))
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
async function sha256(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(canonical(value)),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0")).join("");
}

/** A private, independently sourced approval artifact. Its digest binds the
 * method, corpus and gate report to this exact candidate and both reviews.
 * The calling authority must authenticate the artifact's provenance. */
export interface CareerCompassPromotionEvidence {
  version: typeof CAREER_COMPASS_PROMOTION_EVIDENCE_VERSION;
  productId: "career-compass";
  contractVersion: string;
  candidateVersion: string;
  basisDigest: string;
  deliveryDigest: string;
  reviewDigest: string;
  methodEvidenceDigest: string;
  corpusEvidenceDigest: string;
  gateReportDigest: string;
  decision: "approved";
}

export interface CareerCompassStoredCandidate {
  runId: string;
  revision: number;
  contractVersion: string;
  calculation: unknown;
  candidateVersion: string;
  status: string;
  candidateDigest: string | null;
  basisDigest: string | null;
  outputDigest: string | null;
  deliveryDigest: string | null;
  candidate: unknown;
}
export interface CareerCompassPromotion {
  id: string;
  productId: string;
  contractVersion: string;
  evidenceDigest: string;
  revokedAt: string | null;
}
export type CareerCompassIssuancePlan =
  | { status: "blocked"; publication: "blocked"; reason: string }
  | {
      status: "issuance_plan";
      publication: "blocked";
      rpc: "issue_career_compass_editorial_receipt";
      args: {
        p_run_id: string;
        p_revision: number;
        p_candidate_version: string;
        p_candidate_digest: string;
        p_basis_digest: string;
        p_output_digest: string;
        p_delivery_digest: string;
        p_review_digest: string;
        p_promotion_id: string;
        p_promotion_evidence_digest: string;
        p_authority_reference: string;
      };
    };

/** Offline plan only. Do not expose this to the processing service or a client.
 * No reviewer authentication, DB credential, SQL receipt or publication occurs
 * here; a separate authority must verify origin and invoke its restricted RPC. */
export async function prepareCareerCompassIssuancePlan(input: {
  stored: CareerCompassStoredCandidate;
  boundReviews: unknown;
  trustedReviewers: DeliveryReviewAuthority;
  promotion: CareerCompassPromotion;
  promotionEvidence: CareerCompassPromotionEvidence;
  authorityReference: string;
}): Promise<CareerCompassIssuancePlan> {
  const blocked = (reason: string): CareerCompassIssuancePlan =>
    ({ status: "blocked", publication: "blocked", reason });
  let captured: typeof input;
  try { captured = structuredClone(input); }
  catch { return blocked("invalid_input"); }
  if (!record(captured) || !record(captured.stored) ||
      !record(captured.promotion) || !record(captured.promotionEvidence) ||
      !identifier(captured.authorityReference)) return blocked("invalid_input");
  const { stored, promotion, promotionEvidence } = captured;
  if (!identifier(stored.runId) || !Number.isSafeInteger(stored.revision) ||
      stored.revision < 1 || stored.contractVersion !== "atv-workflow/1.0.0" ||
      stored.candidateVersion !== CAREER_COMPASS_CANDIDATE_VERSION ||
      stored.status !== "prepared_for_review" || !digest(stored.candidateDigest) ||
      !digest(stored.basisDigest) || !digest(stored.outputDigest) ||
      !digest(stored.deliveryDigest) || !record(stored.candidate))
    return blocked("invalid_stored_candidate");
  const rebuilt = await prepareCareerCompassCandidate({
    runId: stored.runId, revision: stored.revision,
    tier: "free", calculation: stored.calculation,
  });
  if (rebuilt.status !== "prepared_for_review" ||
      canonical(rebuilt) !== canonical(stored.candidate) ||
      rebuilt.candidateDigest !== stored.candidateDigest ||
      rebuilt.assessment.basisDigest !== stored.basisDigest ||
      rebuilt.assessment.outputDigest !== stored.outputDigest ||
      rebuilt.delivery.deliveryDigest !== stored.deliveryDigest)
    return blocked("candidate_reconstruction_mismatch");
  const draft: ProductDraft = {
    runId: stored.runId, revision: stored.revision,
    productId: "career-compass", tier: "free",
    calculation: stored.calculation, output: rebuilt.reading,
  };
  const review = await evaluateProductDelivery(
    draft, captured.boundReviews, captured.trustedReviewers,
  );
  if (review.status !== "reviewed_delivery_candidate" ||
      !review.reviewDigest || !review.content ||
      review.basisDigest !== stored.basisDigest ||
      review.outputDigest !== stored.outputDigest ||
      review.deliveryDigest !== stored.deliveryDigest ||
      canonical(review.content) !== canonical(rebuilt.delivery.content))
    return blocked(`delivery_${review.reason}`);
  if (!identifier(promotion.id) || promotion.productId !== "career-compass" ||
      promotion.contractVersion !== stored.contractVersion ||
      promotion.revokedAt !== null || !digest(promotion.evidenceDigest))
    return blocked("promotion_invalid");
  if (promotionEvidence.version !== CAREER_COMPASS_PROMOTION_EVIDENCE_VERSION ||
      promotionEvidence.productId !== "career-compass" ||
      promotionEvidence.contractVersion !== stored.contractVersion ||
      promotionEvidence.candidateVersion !== stored.candidateVersion ||
      promotionEvidence.basisDigest !== stored.basisDigest ||
      promotionEvidence.deliveryDigest !== stored.deliveryDigest ||
      promotionEvidence.reviewDigest !== review.reviewDigest ||
      !digest(promotionEvidence.methodEvidenceDigest) ||
      !digest(promotionEvidence.corpusEvidenceDigest) ||
      !digest(promotionEvidence.gateReportDigest) ||
      promotionEvidence.decision !== "approved" ||
      Object.keys(promotionEvidence).length !== 11 ||
      await sha256(promotionEvidence) !== promotion.evidenceDigest)
    return blocked("promotion_evidence_mismatch");
  return {
    status: "issuance_plan", publication: "blocked",
    rpc: "issue_career_compass_editorial_receipt",
    args: {
      p_run_id: stored.runId,
      p_revision: stored.revision,
      p_candidate_version: stored.candidateVersion,
      p_candidate_digest: stored.candidateDigest,
      p_basis_digest: stored.basisDigest,
      p_output_digest: stored.outputDigest,
      p_delivery_digest: stored.deliveryDigest,
      p_review_digest: review.reviewDigest,
      p_promotion_id: promotion.id,
      p_promotion_evidence_digest: promotion.evidenceDigest,
      p_authority_reference: captured.authorityReference,
    },
  };
}
