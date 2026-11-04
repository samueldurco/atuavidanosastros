import type { AtvPlusPlanId } from "./atv-plus-plans.ts";

export type MemberPriceItemKind =
  "digital-single" | "physical-single" | "subscription" | "shipping";
export interface MemberPriceMembership {
  id: string;
  planId: AtvPlusPlanId;
  status: "pending" | "active" | "cancelled" | "suspended" | "expired";
  startsAt: string;
  endsAt: string;
}
export interface MemberPriceItem {
  id: string;
  kind: MemberPriceItemKind;
  regularPriceCents: number;
}
/** Conditions are resolved by the server, never supplied as trusted browser prices. */
export interface MemberPriceCondition {
  id: string;
  itemId: string;
  kind: "promotion" | "coupon";
  priceCents: number;
  startsAt: string;
  endsAt: string;
  eligible: boolean;
}
export interface MemberPriceCosts {
  productionCents: number;
  operationsCents: number;
  paymentFixedCents: number;
  paymentRateBps: number;
  taxRateBps: number;
  minimumContributionCents: number;
}
/** Approval is item-specific and must come from a reviewed server registry. */
export interface MemberPriceRelease {
  itemId: string;
  approvalId: string;
  costs: Partial<MemberPriceCosts>;
  checkoutSupportsMemberPrice: boolean;
}
export type MemberPriceGate =
  | "no-active-membership"
  | "excluded-kind"
  | "cost-review-required"
  | "below-approved-margin"
  | "checkout-integration-required"
  | "eligible";

const rank: Record<AtvPlusPlanId, number> = {
  essencial: 1,
  ampliado: 2,
  premium: 3,
};
const discounts: Record<
  "digital-single" | "physical-single",
  Record<AtvPlusPlanId, number>
> = {
  "digital-single": { essencial: 1000, ampliado: 2000, premium: 3000 },
  "physical-single": { essencial: 1000, ampliado: 1500, premium: 2000 },
};
const costFields = [
  "productionCents",
  "operationsCents",
  "paymentFixedCents",
  "paymentRateBps",
  "taxRateBps",
  "minimumContributionCents",
] as const;
const money = (value: number) => Number.isSafeInteger(value) && value >= 0;
const inWindow = (start: string, end: string, now: number) => {
  const first = Date.parse(start),
    last = Date.parse(end);
  return (
    Number.isFinite(now) &&
    Number.isFinite(first) &&
    Number.isFinite(last) &&
    first < last &&
    first <= now &&
    now < last
  );
};
function requireItem(item: MemberPriceItem) {
  if (!item.id || !money(item.regularPriceCents))
    throw new Error("invalid_member_price_item");
}
/** Round BRL cents once, half up; integer arithmetic avoids decimal drift. */
function rateCents(cents: number, rateBps: number) {
  return Number((BigInt(cents) * BigInt(rateBps) + 5000n) / 10000n);
}
export function memberPriceMembershipActive(
  membership: MemberPriceMembership,
  now = Date.now(),
) {
  return (
    (membership.status === "active" || membership.status === "cancelled") &&
    Object.hasOwn(rank, membership.planId) &&
    inWindow(membership.startsAt, membership.endsAt, now)
  );
}
/** An overlapping renewal/upgrade uses the highest currently active level, without adding benefits. */
export function activeMemberPriceMembership(
  memberships: readonly MemberPriceMembership[],
  now = Date.now(),
) {
  return (
    memberships
      .filter((item) => memberPriceMembershipActive(item, now))
      .sort(
        (a, b) =>
          rank[b.planId] - rank[a.planId] ||
          Date.parse(b.endsAt) - Date.parse(a.endsAt) ||
          a.id.localeCompare(b.id),
      )[0] ?? null
  );
}
export function simulateMemberPrice(
  item: MemberPriceItem,
  planId: AtvPlusPlanId,
  costs: Partial<MemberPriceCosts> = {},
) {
  requireItem(item);
  const eligibleKind =
    item.kind === "digital-single" || item.kind === "physical-single";
  const discountBps = eligibleKind
    ? discounts[item.kind as "digital-single" | "physical-single"][planId]
    : 0;
  if (discountBps === undefined) throw new Error("invalid_member_price_plan");
  const priceCents = rateCents(item.regularPriceCents, 10000 - discountBps);
  const unknownCostFields = costFields.filter((key) => {
    const value = costs[key];
    return (
      value === undefined ||
      !money(value) ||
      (key.endsWith("Bps") && value > 10000)
    );
  });
  if (unknownCostFields.length)
    return {
      priceCents,
      discountBps,
      unknownCostFields,
      contributionCents: null,
      marginApproved: false,
    };
  const known = costs as MemberPriceCosts;
  const total =
    BigInt(known.productionCents) +
    BigInt(known.operationsCents) +
    BigInt(known.paymentFixedCents) +
    BigInt(rateCents(priceCents, known.paymentRateBps)) +
    BigInt(rateCents(priceCents, known.taxRateBps));
  const contribution = BigInt(priceCents) - total;
  const contributionCents = Number(contribution);
  return {
    priceCents,
    discountBps,
    unknownCostFields,
    contributionCents,
    marginApproved:
      Number.isSafeInteger(contributionCents) &&
      contribution >= BigInt(known.minimumContributionCents),
  };
}
export function resolveMemberPrice(input: {
  item: MemberPriceItem;
  membership?: MemberPriceMembership | null;
  conditions?: readonly MemberPriceCondition[];
  release?: MemberPriceRelease;
  now?: number;
}) {
  const { item, membership, release } = input;
  requireItem(item);
  const now = input.now ?? Date.now();
  const active =
    membership && memberPriceMembershipActive(membership, now)
      ? membership
      : null;
  const candidates: {
    source: "regular" | "promotion" | "coupon" | "member";
    sourceId: string | null;
    priceCents: number;
  }[] = [
    { source: "regular", sourceId: null, priceCents: item.regularPriceCents },
  ];
  // Freight and subscriptions do not participate in this avulso pricing rule.
  const eligibleKind =
    item.kind === "digital-single" || item.kind === "physical-single";
  if (eligibleKind)
    for (const offer of input.conditions ?? []) {
      if (
        offer.eligible &&
        offer.itemId === item.id &&
        money(offer.priceCents) &&
        offer.priceCents <= item.regularPriceCents &&
        inWindow(offer.startsAt, offer.endsAt, now)
      )
        candidates.push({
          source: offer.kind,
          sourceId: offer.id,
          priceCents: offer.priceCents,
        });
    }
  let memberGate: MemberPriceGate = !eligibleKind
    ? "excluded-kind"
    : !active
      ? "no-active-membership"
      : "cost-review-required";
  if (
    active &&
    eligibleKind &&
    release?.itemId === item.id &&
    release.approvalId.trim()
  ) {
    const simulation = simulateMemberPrice(item, active.planId, release.costs);
    memberGate = simulation.unknownCostFields.length
      ? "cost-review-required"
      : !simulation.marginApproved
        ? "below-approved-margin"
        : !release.checkoutSupportsMemberPrice
          ? "checkout-integration-required"
          : "eligible";
    if (memberGate === "eligible")
      candidates.push({
        source: "member",
        sourceId: active.id,
        priceCents: simulation.priceCents,
      });
  }
  const priority = { regular: 0, promotion: 1, coupon: 2, member: 3 };
  const best = candidates.sort(
    (a, b) =>
      a.priceCents - b.priceCents ||
      priority[a.source] - priority[b.source] ||
      (a.sourceId ?? "").localeCompare(b.sourceId ?? ""),
  )[0]!;
  return {
    itemId: item.id,
    kind: item.kind,
    regularPriceCents: item.regularPriceCents,
    ...best,
    discountCents: item.regularPriceCents - best.priceCents,
    memberGate,
    membershipId: active?.id ?? null,
    planId: active?.planId ?? null,
    membershipEndsAt: active?.endsAt ?? null,
  };
}
