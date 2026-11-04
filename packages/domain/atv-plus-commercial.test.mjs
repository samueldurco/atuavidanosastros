import { test } from "node:test";
import assert from "node:assert/strict";
import {
  atvPlusCommercialPlans,
  atvPlusCommercialOffers,
  atvPlusCommercialSchedule,
  atvPlusAddMonths,
  atvPlusMembershipCurrent,
} from "./src/atv-plus-commercial.ts";
const input = {
  profileId: "stable-person",
  planId: "essencial",
  termMonths: 3,
  startsAt: "2026-11-04T12:00:00Z",
  onboardedAt: "2026-11-04T12:05:00Z",
  birthDate: "1990-08-15",
  timezone: "America/Sao_Paulo",
};
test("nine bounded commercial offers implement the owner matrix independently of evaluation quotas", () => {
  assert.equal(atvPlusCommercialOffers.length, 9);
  assert.equal(new Set(atvPlusCommercialOffers.map((v) => v.id)).size, 9);
  assert.deepEqual(
    atvPlusCommercialPlans.map((p) =>
      p.streams.map((s) => [s.kind, s.cadence]),
    ),
    [
      [["personal-horoscope", "fortnightly"]],
      [
        ["transit-reading", "weekly"],
        ["predictive-tarot", "monthly"],
      ],
      [
        ["personal-horoscope", "weekly"],
        ["deep-predictive-tarot", "weekly"],
      ],
    ],
  );
});
test("quarterly intake immediately schedules NEXT solar return even outside the paid term", () => {
  const schedule = atvPlusCommercialSchedule(input),
    solar = schedule.find((v) => v.kind === "solar-return");
  assert.equal(solar.dueAt, "2026-11-04T12:05:00.000Z");
  assert.equal(solar.periodStart, solar.dueAt);
  assert.equal(solar.periodEnd, solar.dueAt);
  assert.equal(solar.referenceYear, 2026);
  assert.match(solar.idempotencyKey, /:reference:2026$/);
  const regular = schedule.filter((v) => v.kind === "personal-horoscope");
  assert.equal(regular[0].dueAt, "2026-11-19T12:00:00.000Z");
  assert.ok(
    regular.every(
      (v) =>
        new Date(v.dueAt) > new Date(input.onboardedAt) &&
        new Date(v.periodEnd) <= new Date("2027-02-04T12:00:00Z"),
    ),
  );
  assert.deepEqual(atvPlusCommercialSchedule(input), schedule);
});
test("late intake skips elapsed forecast editions and invalid civil birthdays", () => {
  const schedule = atvPlusCommercialSchedule({
    ...input,
    onboardedAt: "2026-12-20T12:00:00Z",
  });
  assert.ok(
    schedule
      .filter((v) => v.kind !== "solar-return")
      .every(
        (v) => Date.parse(v.periodStart) > Date.parse("2026-12-20T12:00:00Z"),
      ),
  );
  assert.throws(
    () => atvPlusCommercialSchedule({ ...input, birthDate: "1990-02-30" }),
    /invalid_membership_calendar/,
  );
});
test("calendar clamps month ends and applies stable natal gift identity across renewal/upgrade", () => {
  assert.equal(
    atvPlusAddMonths("2028-01-31T12:00:00Z", 1),
    "2028-02-29T12:00:00.000Z",
  );
  const a = atvPlusCommercialSchedule({ ...input, planId: "premium" }).find(
    (v) => v.kind === "natal-full",
  );
  const b = atvPlusCommercialSchedule({
    ...input,
    planId: "premium",
    startsAt: "2027-02-04T12:00:00Z",
    onboardedAt: "2027-02-04T12:00:00Z",
  }).find((v) => v.kind === "natal-full");
  assert.equal(a.idempotencyKey, b.idempotencyKey);
  const basic = atvPlusCommercialSchedule({
    ...input,
    planId: "ampliado",
  }).find((v) => v.kind === "natal-brief");
  assert.notEqual(a.idempotencyKey, basic.idempotencyKey);
});
test("paid cancellation retains benefits until exact term end; suspension never grants access", () => {
  const membership = {
    status: "CANCELLED",
    starts_at: input.startsAt,
    ends_at: "2027-02-04T12:00:00Z",
  };
  assert.equal(
    atvPlusMembershipCurrent(membership, new Date("2027-02-04T11:59:59Z")),
    true,
  );
  assert.equal(
    atvPlusMembershipCurrent(membership, new Date(membership.ends_at)),
    false,
  );
  assert.equal(
    atvPlusMembershipCurrent(
      { ...membership, status: "SUSPENDED" },
      new Date(input.startsAt),
    ),
    false,
  );
});
