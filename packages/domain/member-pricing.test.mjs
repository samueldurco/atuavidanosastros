import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeMemberPriceMembership,
  memberPriceMembershipActive,
  resolveMemberPrice,
  simulateMemberPrice,
} from "./src/member-pricing.ts";

const now = Date.parse("2026-11-04T15:00:00Z");
const member = {
  id: "member-1",
  planId: "premium",
  status: "active",
  startsAt: "2026-11-01T00:00:00Z",
  endsAt: "2027-02-01T00:00:00Z",
};
const item = {
  id: "synthetic-digital",
  kind: "digital-single",
  regularPriceCents: 10000,
};
const costs = {
  productionCents: 1000,
  operationsCents: 500,
  paymentFixedCents: 100,
  paymentRateBps: 500,
  taxRateBps: 1000,
  minimumContributionCents: 3000,
};
const release = {
  itemId: item.id,
  approvalId: "synthetic-approval-only",
  costs,
  checkoutSupportsMemberPrice: true,
};
const offer = (kind, priceCents, extra = {}) => ({
  id: kind,
  itemId: item.id,
  kind,
  priceCents,
  startsAt: member.startsAt,
  endsAt: member.endsAt,
  eligible: true,
  ...extra,
});

test("membership uses paid [start,end), including cancelled until the paid end, with no evaluation fallback", () => {
  assert.equal(
    memberPriceMembershipActive(member, Date.parse(member.startsAt)),
    true,
  );
  assert.equal(
    memberPriceMembershipActive(member, Date.parse(member.endsAt)),
    false,
  );
  assert.equal(
    memberPriceMembershipActive(member, Date.parse(member.startsAt) - 1),
    false,
  );
  assert.equal(
    memberPriceMembershipActive({ ...member, status: "cancelled" }, now),
    true,
  );
  for (const status of ["pending", "suspended", "expired"])
    assert.equal(
      memberPriceMembershipActive({ ...member, status }, now),
      false,
    );
  assert.equal(
    memberPriceMembershipActive({ ...member, endsAt: "bad-date" }, now),
    false,
  );
  assert.equal(activeMemberPriceMembership([], now), null);
});
test("overlapping paid periods use the highest active level without adding percentages", () => {
  assert.equal(
    activeMemberPriceMembership(
      [{ ...member, id: "essential", planId: "essencial" }, member],
      now,
    )?.id,
    member.id,
  );
  assert.equal(
    resolveMemberPrice({ item, membership: member, release, now }).priceCents,
    7000,
  );
});
test("best eligible condition is applied once against regular price, never stacked", () => {
  const result = resolveMemberPrice({
    item,
    membership: member,
    release,
    conditions: [offer("promotion", 8000), offer("coupon", 7500)],
    now,
  });
  assert.equal(result.priceCents, 7000);
  assert.equal(result.source, "member");
  assert.equal(result.discountCents, 3000);
  const betterCoupon = resolveMemberPrice({
    item,
    membership: member,
    release,
    conditions: [offer("coupon", 6500)],
    now,
  });
  assert.equal(betterCoupon.priceCents, 6500);
  assert.equal(betterCoupon.source, "coupon");
  assert.equal(
    resolveMemberPrice({
      item,
      membership: member,
      release,
      conditions: [offer("promotion", 7000), offer("coupon", 7000)],
      now,
    }).source,
    "promotion",
  );
});
test("ineligible, expired, other-item and future coupons cannot influence the final price", () => {
  const conditions = [
    offer("coupon", 1, { eligible: false }),
    offer("coupon", 2, { itemId: "other" }),
    offer("coupon", 3, { endsAt: new Date(now).toISOString() }),
    offer("coupon", 4, { startsAt: "2027-01-01T00:00:00Z" }),
  ];
  assert.equal(resolveMemberPrice({ item, conditions, now }).priceCents, 10000);
});
test("freight and subscriptions stay outside this avulso pricing rule", () => {
  for (const kind of ["shipping", "subscription"]) {
    const result = resolveMemberPrice({
      item: { ...item, kind },
      membership: member,
      release,
      conditions: [offer("coupon", 1)],
      now,
    });
    assert.equal(result.priceCents, 10000);
    assert.equal(result.memberGate, "excluded-kind");
  }
});
test("a mixed basket uses one condition per eligible item and a fresh checkout clock", () => {
  const lines = [
    item,
    {
      id: "synthetic-physical",
      kind: "physical-single",
      regularPriceCents: 7990,
    },
    { id: "freight", kind: "shipping", regularPriceCents: 2990 },
    { id: "atv-plus", kind: "subscription", regularPriceCents: 9000 },
  ];
  const prices = lines.map((line) =>
    resolveMemberPrice({
      item: line,
      membership: member,
      release: { ...release, itemId: line.id },
      now,
    }),
  );
  assert.equal(
    prices.reduce((sum, price) => sum + price.priceCents, 0),
    25382,
  );
  const expiredAtCheckout = resolveMemberPrice({
    item,
    membership: member,
    release,
    now: Date.parse(member.endsAt),
  });
  assert.equal(expiredAtCheckout.priceCents, 10000);
  assert.equal(expiredAtCheckout.memberGate, "no-active-membership");
});
test("unapproved costs, unknown expenses, insufficient margin or unsupported checkout block member price", () => {
  assert.equal(
    resolveMemberPrice({ item, membership: member, now }).memberGate,
    "cost-review-required",
  );
  assert.equal(
    resolveMemberPrice({
      item,
      membership: member,
      release: { ...release, costs: { productionCents: 1000 } },
      now,
    }).priceCents,
    10000,
  );
  assert.equal(
    resolveMemberPrice({
      item,
      membership: member,
      release: { ...release, approvalId: "" },
      now,
    }).priceCents,
    10000,
  );
  assert.equal(
    resolveMemberPrice({
      item,
      membership: member,
      release: {
        ...release,
        costs: { ...costs, minimumContributionCents: 9999 },
      },
      now,
    }).memberGate,
    "below-approved-margin",
  );
  assert.equal(
    resolveMemberPrice({
      item,
      membership: member,
      release: { ...release, checkoutSupportsMemberPrice: false },
      now,
    }).memberGate,
    "checkout-integration-required",
  );
  assert.equal(
    resolveMemberPrice({
      item,
      membership: member,
      release: { ...release, itemId: "other" },
      now,
    }).priceCents,
    10000,
  );
});
test("physical simulation uses reviewed regular value and integer cents with half-up rounding", () => {
  const physical = {
    id: "synthetic-mug",
    kind: "physical-single",
    regularPriceCents: 7990,
  };
  assert.equal(simulateMemberPrice(physical, "essencial").priceCents, 7191);
  assert.equal(simulateMemberPrice(physical, "ampliado").priceCents, 6792);
  assert.equal(simulateMemberPrice(physical, "premium").priceCents, 6392);
  assert.deepEqual(
    simulateMemberPrice(physical, "premium", { productionCents: 2995 })
      .unknownCostFields,
    [
      "operationsCents",
      "paymentFixedCents",
      "paymentRateBps",
      "taxRateBps",
      "minimumContributionCents",
    ],
  );
  assert.equal(
    simulateMemberPrice(item, "premium", costs).contributionCents,
    4350,
  );
  assert.throws(
    () =>
      simulateMemberPrice({ ...physical, regularPriceCents: -1 }, "premium"),
    /invalid_member_price_item/,
  );
});
