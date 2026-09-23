import {
  dimensions,
  editorialDecision,
  RUBRIC_VERSION,
  type ScoredReview,
  type MechanicalReview,
} from "@atv/ai";
import type {
  ProductDraft,
  ProductReviewAuthority,
} from "./product-editorial.ts";
import {
  prepareProductDelivery,
  type ProductDeliveryContent,
} from "./product-delivery.ts";

export const DELIVERY_REVIEW_VERSION = "atv-delivery-review/1.0.0";
export interface BoundDeliveryReview {
  version: typeof DELIVERY_REVIEW_VERSION;
  basisDigest: string;
  deliveryDigest: string;
  draftReview: ScoredReview;
  deliveryReview: ScoredReview;
}
/** Configuration from a trusted caller, never request-supplied reviewer claims. */
export interface DeliveryReviewAuthority {
  draft: ProductReviewAuthority;
  delivery: ProductReviewAuthority;
}
export interface DeliveryAssessment {
  version: typeof DELIVERY_REVIEW_VERSION;
  status: "rejected" | "needs_editorial_review" | "reviewed_delivery_candidate";
  publication: "blocked";
  reason: string;
  basisDigest: string | null;
  outputDigest: string | null;
  deliveryDigest: string | null;
  reviewDigest: string | null;
  content?: ProductDeliveryContent;
}

const hash = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const text = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length <= max && value.trim().length > 0;
function record(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
function exact(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return (
    record(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
function scored(value: unknown): value is ScoredReview {
  if (
    !exact(value, [
      "rubricVersion",
      "outputDigest",
      "reviewer",
      "source",
      "calibrationId",
      "scores",
      "evidence",
    ]) ||
    value.rubricVersion !== RUBRIC_VERSION ||
    !hash(value.outputDigest) ||
    !text(value.reviewer, 160) ||
    !exact(value.scores, dimensions) ||
    !exact(value.evidence, dimensions)
  )
    return false;
  if (
    value.source === "human"
      ? value.calibrationId !== null
      : value.source !== "calibrated-reviewer" ||
        !text(value.calibrationId, 160)
  )
    return false;
  const scores = value.scores,
    evidence = value.evidence;
  return dimensions.every(
    (key) =>
      typeof scores[key] === "number" &&
      Number.isFinite(scores[key]) &&
      scores[key] >= 0 &&
      scores[key] <= 10 &&
      text(evidence[key], 2000),
  );
}
function reviews(value: unknown): value is BoundDeliveryReview {
  return (
    exact(value, [
      "version",
      "basisDigest",
      "deliveryDigest",
      "draftReview",
      "deliveryReview",
    ]) &&
    value.version === DELIVERY_REVIEW_VERSION &&
    hash(value.basisDigest) &&
    hash(value.deliveryDigest) &&
    scored(value.draftReview) &&
    scored(value.deliveryReview) &&
    new TextEncoder().encode(JSON.stringify(value)).length <= 65536
  );
}
function authorityValid(value: unknown): value is DeliveryReviewAuthority {
  if (!exact(value, ["draft", "delivery"])) return false;
  return [value.draft, value.delivery].every(
    (item) =>
      exact(item, ["reviewers", "calibrations"]) &&
      [item.reviewers, item.calibrations].every(
        (list) =>
          Array.isArray(list) &&
          list.length <= 100 &&
          list.every((id) => text(id, 160)),
      ),
  );
}
function authorized(
  review: ScoredReview,
  authority: ProductReviewAuthority,
): boolean {
  return (
    authority.reviewers.includes(review.reviewer) &&
    (review.source === "human" ||
      authority.calibrations.includes(review.calibrationId!))
  );
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (record(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

/** Offline two-pass gate: the original Reading and its exact reader representation both need
 * explicit reviews. Same reviewer is allowed, but neither pass substitutes for the other.
 * This authenticates nobody, verifies no model/eval provenance, and issues no SQL receipt.
 * Only the future authenticated authority can turn independently verified evidence into issuance. */
export async function evaluateProductDelivery(
  input: ProductDraft,
  bound?: unknown,
  authority: DeliveryReviewAuthority = {
    draft: { reviewers: [], calibrations: [] },
    delivery: { reviewers: [], calibrations: [] },
  },
): Promise<DeliveryAssessment> {
  const base: DeliveryAssessment = {
    version: DELIVERY_REVIEW_VERSION,
    status: "rejected",
    publication: "blocked",
    reason: "invalid_input",
    basisDigest: null,
    outputDigest: null,
    deliveryDigest: null,
    reviewDigest: null,
  };
  // Capture everything before hashing; no caller mutation may change the reviewed basis/authority.
  let draft: ProductDraft, review: unknown, trusted: unknown;
  try {
    draft = structuredClone(input);
    review = structuredClone(bound);
    trusted = structuredClone(authority);
  } catch {
    return base;
  }
  if (!authorityValid(trusted)) return { ...base, reason: "invalid_authority" };
  const candidate = await prepareProductDelivery(draft);
  if (candidate.status !== "prepared_for_review")
    return { ...base, reason: candidate.reason };
  const pending: DeliveryAssessment = {
    ...base,
    status: "needs_editorial_review",
    reason: "review_required",
    basisDigest: candidate.basisDigest,
    outputDigest: candidate.outputDigest,
    deliveryDigest: candidate.deliveryDigest,
  };
  if (review === undefined) return pending;
  if (!reviews(review)) return { ...pending, reason: "invalid_review" };
  if (
    review.basisDigest !== candidate.basisDigest ||
    review.deliveryDigest !== candidate.deliveryDigest
  )
    return { ...pending, reason: "review_basis_mismatch" };
  if (
    !authorized(review.draftReview, trusted.draft) ||
    !authorized(review.deliveryReview, trusted.delivery)
  )
    return { ...pending, reason: "reviewer_not_authorized" };
  // WU-048 has already performed strict schema, evidence and mechanical checks on this captured draft.
  const mechanical: MechanicalReview = {
    status: "needs_editorial_review",
    findings: [],
    rubricVersion: RUBRIC_VERSION,
  };
  for (const [stage, score, digest] of [
    ["draft", review.draftReview, candidate.outputDigest],
    ["delivery", review.deliveryReview, candidate.deliveryDigest],
  ] as const) {
    const decision = editorialDecision(mechanical, score, digest, draft.tier);
    if (decision !== "approved")
      return {
        ...pending,
        status: decision,
        reason: `${stage}_review_not_approved`,
      };
  }
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      canonical({
        version: DELIVERY_REVIEW_VERSION,
        basisDigest: candidate.basisDigest,
        outputDigest: candidate.outputDigest,
        deliveryDigest: candidate.deliveryDigest,
        review,
      }),
    ),
  );
  const reviewDigest = Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return {
    ...pending,
    status: "reviewed_delivery_candidate",
    reason: "authenticated_issuance_and_promotion_required",
    reviewDigest,
    content: candidate.content,
  };
}
