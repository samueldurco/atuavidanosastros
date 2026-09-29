import {
  CaelusEphemerisProvider,
  engineContract,
  type EphemerisProvider,
} from "@atv/astrology";
import { parseWorkflowInput, type CalculationSnapshot } from "@atv/domain";
import {
  calculateValidatedChart,
  zodiacPosition,
} from "./natal-calculators.ts";
import {
  ProcessingError,
  type ProductCalculator,
} from "./product-processing.ts";

/** Plan §7.3: bounded geometry only; rulership, aspects and reading are still absent. */
export const purposeCareerContract = Object.freeze({
  version: "atv-purpose-career-calculation/1.0.0",
  products: Object.freeze(["purpose-career"]),
  zodiac: "tropical",
  houseSystem: "placidus",
  presentation: "zodiac-half-open-sectors/truncated-6-decimals/1",
  houses: Object.freeze([2, 6, 10]),
  rulership: "not-assessed",
  aspects: "not-assessed",
  interpretation: "not-produced",
  status: "experimental",
});

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const angle = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0 &&
  value < 360;
const sameContract = (
  value: unknown,
  expected: Record<string, unknown>,
): boolean =>
  record(value) &&
  Object.keys(value).length === Object.keys(expected).length &&
  Object.entries(expected).every(([key, wanted]) =>
    Array.isArray(wanted)
      ? Array.isArray(value[key]) &&
        JSON.stringify(value[key]) === JSON.stringify(wanted)
      : value[key] === wanted,
  );

/** JSONB coherence, not authentication of the engine or approval of the interpretation. */
export function inspectPurposeCareerProjection(
  value: CalculationSnapshot,
): "available" | "unavailable" | null {
  const { data } = value;
  const { angles, houses, provenance } = data;
  if (
    value.version !== purposeCareerContract.version ||
    value.kind !== "purpose" ||
    value.status !== "experimental" ||
    data.productId !== "purpose-career" ||
    Object.keys(data).length !== 6 ||
    !Array.isArray(data.positions) ||
    data.positions.length !== 0 ||
    !record(angles) ||
    Object.keys(angles).length !== 2 ||
    angles.ascendant !== null ||
    !angle(angles.midheaven) ||
    !record(houses) ||
    Object.keys(houses).length !== 3 ||
    houses.system !== "placidus" ||
    !["ok", "not-applicable"].includes(String(houses.status)) ||
    !Array.isArray(houses.cusps) ||
    (houses.status === "ok"
      ? houses.cusps.length !== 3
      : houses.cusps.length !== 0) ||
    !sameContract(data.projection, purposeCareerContract) ||
    !record(provenance) ||
    !sameContract(provenance.contract, engineContract) ||
    provenance.accuracyStatus !== "experimental" ||
    provenance.zodiac !== "tropical" ||
    provenance.houseSystem !== "placidus" ||
    provenance.referenceFrame !== "geocentric-apparent-ecliptic-of-date" ||
    [
      provenance.provider,
      provenance.providerVersion,
      provenance.algorithmVersion,
    ].some((part) => typeof part !== "string" || !part.trim()) ||
    !Array.isArray(provenance.warnings) ||
    !provenance.warnings.length ||
    provenance.warnings.some(
      (warning) =>
        typeof warning !== "string" ||
        !warning.trim() ||
        !value.limits.includes(warning),
    )
  )
    return null;
  const source = `${provenance.provider}@${provenance.providerVersion};${provenance.algorithmVersion};${purposeCareerContract.version}`;
  const expected = new Map([
    [
      "angle-midheaven",
      `Meio do Céu: ${zodiacPosition(angles.midheaven).display}`,
    ],
  ]);
  for (const [index, house] of purposeCareerContract.houses.entries()) {
    if (houses.status !== "ok") break;
    const cusp = houses.cusps[index];
    if (
      !record(cusp) ||
      Object.keys(cusp).length !== 2 ||
      cusp.house !== house ||
      !angle(cusp.longitude)
    )
      return null;
    expected.set(
      `house-${house}`,
      `Cúspide ${house} (Placidus): ${zodiacPosition(cusp.longitude).display}`,
    );
  }
  if (
    value.facts.length < expected.size ||
    value.facts.length > expected.size + 1 ||
    [...expected].some(
      ([id, display]) =>
        value.facts.filter(
          (fact) =>
            fact.id === id &&
            fact.kind === "calculated" &&
            fact.display === display &&
            fact.source === source,
        ).length !== 1,
    ) ||
    value.facts.some(
      (fact) =>
        !expected.has(fact.id) &&
        !(
          fact.id === "personal-context" &&
          fact.kind === "reported" &&
          fact.source === "input.context"
        ),
    )
  )
    return null;
  return houses.status === "ok" ? "available" : "unavailable";
}

/** Internal opt-in only; a complete paid product still requires other facts and gates. */
export function createPurposeCareerCalculators(
  provider: EphemerisProvider = new CaelusEphemerisProvider(),
): Readonly<Record<string, ProductCalculator>> {
  const calculate: ProductCalculator = async (value, { signal }) => {
    signal.throwIfAborted();
    const input = parseWorkflowInput(value);
    if (!input?.birth || input.productId !== "purpose-career")
      throw new ProcessingError("input_invalid");
    const chart = await calculateValidatedChart(provider, input.birth, signal);
    const available = chart.houses.status === "ok";
    const midheaven = chart.houses.midheaven;
    const cusps = available
      ? purposeCareerContract.houses.map((house) => ({
          house,
          longitude: chart.houses.cusps[house - 1] as number,
        }))
      : [];
    const source = `${chart.provenance.provider}@${chart.provenance.providerVersion};${chart.provenance.algorithmVersion};${purposeCareerContract.version}`;
    const facts: CalculationSnapshot["facts"] = [
      {
        id: "angle-midheaven",
        kind: "calculated",
        display: `Meio do Céu: ${zodiacPosition(midheaven).display}`,
        source,
      },
      ...cusps.map(({ house, longitude }) => ({
        id: `house-${house}`,
        kind: "calculated" as const,
        display: `Cúspide ${house} (Placidus): ${zodiacPosition(longitude).display}`,
        source,
      })),
    ];
    if (input.context)
      facts.push({
        id: "personal-context",
        kind: "reported",
        display: input.context,
        source: "input.context",
      });
    return {
      version: purposeCareerContract.version,
      kind: "purpose",
      status: "experimental",
      facts,
      data: {
        productId: input.productId,
        positions: [],
        angles: { ascendant: null, midheaven },
        houses: {
          system: "placidus",
          status: available ? "ok" : "not-applicable",
          cusps,
        },
        provenance: structuredClone(chart.provenance),
        projection: purposeCareerContract,
      },
      limits: [
        ...chart.provenance.warnings,
        ...(available ? [] : [chart.houses.warning]),
        "Somente MC e cúspides 2, 6 e 10 experimentais; Placidus indisponível não recebe casas substitutas.",
        "Regente do MC, casa do regente, planetas angulares e aspectos relevantes não foram avaliados.",
        "Recursos, rotina, contribuição, visibilidade, autoridade, hipóteses e experimentos dependem de leitura editorial aprovada.",
        "Sem prescrição de profissão ou promessa de emprego, renda, prosperidade financeira ou destino.",
      ],
    };
  };
  return Object.freeze({ "purpose-career": calculate });
}
