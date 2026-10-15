import { offeredProductIds, type OfferedProductId } from "./catalog.ts";

export const atvPlusForecastProductIds = [
  "personal-calendar",
  "career-forecast-30d",
] as const;
export const atvPlusBasicProductIds = [
  "tarot-situation-challenge-advice",
  "dream-reading",
] as const;
export const atvPlusExtendedProductIds = [
  "tarot-peladan-cross",
  "tarot-aphrodite-temple",
] as const;

export type AtvPlusPlanId = "essencial" | "ampliado" | "premium";

export interface AtvPlusReadingOption {
  quantity: number;
  productIds: readonly OfferedProductId[];
}

export interface AtvPlusPlan {
  id: AtvPlusPlanId;
  name: string;
  description: string;
  cycleDays: 30;
  forecastAllowance: 1;
  forecastProductIds: readonly OfferedProductId[];
  readingOptions: readonly AtvPlusReadingOption[];
  benefits: readonly string[];
}

const forecastBenefit =
  "Uma previsão para os próximos 30 dias: calendário pessoal ou dinheiro e carreira.";

/** Product policy only. Authentication, cycle persistence and access checks belong to the server. */
export const atvPlusPlans: readonly AtvPlusPlan[] = [
  {
    id: "essencial",
    name: "ATV+ Essencial",
    description: "Uma previsão pessoal para acompanhar os próximos 30 dias.",
    cycleDays: 30,
    forecastAllowance: 1,
    forecastProductIds: atvPlusForecastProductIds,
    readingOptions: [],
    benefits: [forecastBenefit],
  },
  {
    id: "ampliado",
    name: "ATV+ Ampliado",
    description:
      "Uma previsão pessoal e uma leitura de Tarot ou de um sonho a cada ciclo.",
    cycleDays: 30,
    forecastAllowance: 1,
    forecastProductIds: atvPlusForecastProductIds,
    readingOptions: [{ quantity: 1, productIds: atvPlusBasicProductIds }],
    benefits: [
      forecastBenefit,
      "Uma leitura à escolha: Tarot de 3 cartas ou Interpretação do Sonho.",
    ],
  },
  {
    id: "premium",
    name: "ATV+ Premium",
    description: "Uma previsão pessoal e mais opções de leitura a cada ciclo.",
    cycleDays: 30,
    forecastAllowance: 1,
    forecastProductIds: atvPlusForecastProductIds,
    readingOptions: [
      { quantity: 2, productIds: atvPlusBasicProductIds },
      { quantity: 1, productIds: atvPlusExtendedProductIds },
    ],
    benefits: [
      forecastBenefit,
      "Duas leituras entre Tarot de 3 cartas e Interpretação do Sonho, em qualquer combinação.",
      "Ou, no lugar das duas leituras, uma Cruz Péladan de 5 cartas ou um Tarot Relacionamentos de 7 cartas.",
    ],
  },
];

export const atvPlusPolicy = {
  billingEnabled: false,
  evaluationRequiresPrivateGrant: true,
  cycleDays: 30,
  deliveredHistoryRemainsAfterCancellation: true,
  freeToolsRequireSubscription: false,
  accountHistoryRequiresSubscription: false,
  monetaryCredits: false,
  unlimitedReadings: false,
} as const;

const includedIds: readonly string[] = [
  ...atvPlusForecastProductIds,
  ...atvPlusBasicProductIds,
  ...atvPlusExtendedProductIds,
];
export const atvPlusSeparateOfferIds = offeredProductIds.filter(
  (id) => !includedIds.includes(id),
);

export function atvPlusPlanFor(id: string): AtvPlusPlan | undefined {
  return atvPlusPlans.find((plan) => plan.id === id);
}

/** Validate the complete consumption of ONE cycle, including earlier selections; never grants access. */
export function atvPlusSelectionAllowed(
  planId: string,
  productIds: readonly string[],
): boolean {
  const plan = atvPlusPlanFor(planId);
  if (!plan) return false;
  const forecasts = productIds.filter((id) =>
    plan.forecastProductIds.includes(id as OfferedProductId),
  );
  if (forecasts.length > plan.forecastAllowance) return false;
  const readings = productIds.filter(
    (id) => !plan.forecastProductIds.includes(id as OfferedProductId),
  );
  if (readings.length === 0) return true;
  return plan.readingOptions.some(
    (option) =>
      readings.length <= option.quantity &&
      readings.every((id) =>
        option.productIds.includes(id as OfferedProductId),
      ),
  );
}
