import type { AtvPlusPlanId } from "./atv-plus-plans.ts";

export const atvPlusCommercialPolicyVersion = "atv-plus-commercial/1" as const;
export type AtvPlusTermMonths = 3 | 6 | 12;
export type AtvPlusDeliveryKind =
  | "personal-horoscope"
  | "transit-reading"
  | "predictive-tarot"
  | "deep-predictive-tarot"
  | "solar-return"
  | "natal-brief"
  | "natal-full";
export type AtvPlusCadence = "weekly" | "fortnightly" | "monthly";
export interface AtvPlusCommercialPlan {
  id: AtvPlusPlanId;
  name: string;
  description: string;
  streams: readonly { kind: AtvPlusDeliveryKind; cadence: AtvPlusCadence }[];
  natalGift: "natal-brief" | "natal-full" | null;
  benefits: readonly string[];
}
const solarBenefit =
  "Próxima Revolução Solar em PDF após a contratação e o cadastro, inclusive no trimestral e com aniversário após a vigência.";
export const atvPlusCommercialPlans: readonly AtvPlusCommercialPlan[] = [
  {
    id: "essencial",
    name: "ATV+ Essencial",
    description: "Horóscopo pessoal a cada quinze dias.",
    streams: [{ kind: "personal-horoscope", cadence: "fortnightly" }],
    natalGift: null,
    benefits: ["Horóscopo personalizado quinzenal.", solarBenefit],
  },
  {
    id: "ampliado",
    name: "ATV+ Ampliado",
    description:
      "Trânsitos semanais e Tarot que complementa a previsão mensal.",
    streams: [
      { kind: "transit-reading", cadence: "weekly" },
      { kind: "predictive-tarot", cadence: "monthly" },
    ],
    natalGift: "natal-brief",
    benefits: [
      "Leitura semanal de trânsitos.",
      "Tarot preditivo mensal, complementar ao período.",
      "Leitura natal breve de presente uma única vez por perfil.",
      solarBenefit,
    ],
  },
  {
    id: "premium",
    name: "ATV+ Premium",
    description: "Horóscopo pessoal e Tarot aprofundado toda semana.",
    streams: [
      { kind: "personal-horoscope", cadence: "weekly" },
      { kind: "deep-predictive-tarot", cadence: "weekly" },
    ],
    natalGift: "natal-full",
    benefits: [
      "Horóscopo personalizado semanal.",
      "Tarot preditivo aprofundado semanal, complementar ao período.",
      "Mapa natal completo de presente uma única vez por perfil.",
      solarBenefit,
    ],
  },
];
export const atvPlusCommercialOffers = atvPlusCommercialPlans.flatMap((plan) =>
  ([3, 6, 12] as const).map((termMonths) => ({
    id: `atv-plus-${plan.id}-${termMonths}m`,
    planId: plan.id,
    termMonths,
    renewal: "manual" as const,
    billing: "one-payment-per-term" as const,
  })),
);
export const atvPlusCommercialPlanFor = (id: string) =>
  atvPlusCommercialPlans.find((plan) => plan.id === id);
export const atvPlusCommercialOfferFor = (id: string) =>
  atvPlusCommercialOffers.find((offer) => offer.id === id);

/** Clamp to the target calendar month; adding months must never turn February into March. */
export function atvPlusAddMonths(instant: string, months: number): string {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime()) || !Number.isInteger(months))
    throw new Error("invalid_calendar_input");
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  date.setUTCDate(
    Math.min(
      day,
      new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
      ).getUTCDate(),
    ),
  );
  return date.toISOString();
}
export interface AtvPlusCalendarDelivery {
  kind: AtvPlusDeliveryKind;
  dueAt: string;
  periodStart: string;
  periodEnd: string;
  idempotencyKey: string;
  referenceYear?: number;
}
/** Calendar only: no astrology calculation, content approval, entitlement or transport side effects. */
export function atvPlusCommercialSchedule(input: {
  profileId: string;
  planId: string;
  termMonths: AtvPlusTermMonths;
  startsAt: string;
  onboardedAt: string;
  birthDate: string;
  timezone?: string;
}): AtvPlusCalendarDelivery[] {
  const plan = atvPlusCommercialPlanFor(input.planId);
  const start = new Date(input.startsAt),
    now = new Date(input.onboardedAt);
  if (
    !plan ||
    ![3, 6, 12].includes(input.termMonths) ||
    !input.profileId ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(now.getTime()) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)
  )
    throw new Error("invalid_membership_calendar");
  const end = new Date(atvPlusAddMonths(input.startsAt, input.termMonths));
  const birth = new Date(`${input.birthDate}T00:00:00.000Z`);
  if (
    !Number.isFinite(birth.getTime()) ||
    birth.toISOString().slice(0, 10) !== input.birthDate
  )
    throw new Error("invalid_membership_calendar");
  if (now < start || now >= end) throw new Error("membership_not_current");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: input.timezone ?? "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)!.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const year = Number(today.slice(0, 4));
  const due = now.toISOString(),
    entries: AtvPlusCalendarDelivery[] = [];
  const add = (
    kind: AtvPlusDeliveryKind,
    dueAt: string,
    periodStart: string,
    periodEnd: string,
    key: string,
  ) =>
    entries.push({
      kind,
      dueAt,
      periodStart,
      periodEnd,
      idempotencyKey: `atv-plus:${input.profileId}:${kind}:${key}`,
    });
  // The upcoming annual cycle is an immediate gift, independently of membership end date.
  add("solar-return", due, due, due, `reference:${year}`);
  entries[entries.length - 1]!.referenceYear = year;
  if (plan.natalGift) add(plan.natalGift, due, due, due, "once");
  for (const stream of plan.streams) {
    for (let ordinal = 1; ordinal <= 54; ordinal++) {
      const periodStart =
        stream.cadence === "monthly"
          ? atvPlusAddMonths(input.startsAt, ordinal)
          : new Date(
              start.getTime() +
                ordinal * (stream.cadence === "weekly" ? 7 : 15) * 86400000,
            ).toISOString();
      if (new Date(periodStart) >= end) break;
      if (new Date(periodStart) <= now) continue;
      const next =
        stream.cadence === "monthly"
          ? atvPlusAddMonths(input.startsAt, ordinal + 1)
          : new Date(
              new Date(periodStart).getTime() +
                (stream.cadence === "weekly" ? 7 : 15) * 86400000,
            ).toISOString();
      const periodEnd = new Date(next) > end ? end.toISOString() : next;
      add(
        stream.kind,
        periodStart,
        periodStart,
        periodEnd,
        `${periodStart}/${periodEnd}`,
      );
    }
  }
  return entries.sort(
    (a, b) => a.dueAt.localeCompare(b.dueAt) || a.kind.localeCompare(b.kind),
  );
}
export function atvPlusMembershipCurrent(
  membership: { status: string; starts_at: string; ends_at: string },
  now = new Date(),
): boolean {
  return (
    ["ACTIVE", "CANCELLED"].includes(membership.status.toUpperCase()) &&
    new Date(membership.starts_at) <= now &&
    now < new Date(membership.ends_at)
  );
}
