import {
  CaelusEphemerisProvider,
  type EphemerisProvider,
} from "@atv/astrology";
import { parseWorkflowInput, type CalculationSnapshot } from "@atv/domain";
import {
  calculateValidatedChart,
  zodiacPosition,
} from "./natal-calculators.ts";
import {
  ProcessingError,
  validateCalculation,
  type ProductCalculator,
} from "./product-processing.ts";

export const personalCalendarProductContract = Object.freeze({
  version: "atv-personal-calendar-calculation/1.0.0",
  productId: "personal-calendar",
  status: "experimental",
  period: "one-complete-utc-civil-month",
  natalReference: "validated-natal-sun-only",
  dailyEvents: "not-produced",
  interpretation: "not-produced",
});

const dayMs = 86_400_000;

export function createPersonalCalendarCalculators(
  provider: EphemerisProvider = new CaelusEphemerisProvider(),
): Readonly<Record<string, ProductCalculator>> {
  const calculate: ProductCalculator = async (value, { signal }) => {
    signal.throwIfAborted();
    const input = parseWorkflowInput(value);
    if (
      input?.productId !== "personal-calendar" ||
      !input.birth ||
      !input.targetDate
    )
      throw new ProcessingError("input_invalid");

    const start = new Date(`${input.targetDate}T00:00:00.000Z`);
    const end = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    );
    const dates = Array.from(
      { length: Math.round((end.valueOf() - start.valueOf()) / dayMs) },
      (_, index) =>
        new Date(start.valueOf() + index * dayMs).toISOString().slice(0, 10),
    );
    if (dates.length < 28 || dates.length > 31)
      throw new ProcessingError("input_invalid");

    const chart = await calculateValidatedChart(provider, input.birth, signal);
    const natalSun = chart.positions.find(
      (position) => position.body === "sun",
    )?.longitude;
    if (
      typeof natalSun !== "number" ||
      !Number.isFinite(natalSun) ||
      natalSun < 0 ||
      natalSun >= 360
    )
      throw new ProcessingError("calculation_invalid");
    const source = `${chart.provenance.provider}@${chart.provenance.providerVersion};${chart.provenance.algorithmVersion};${personalCalendarProductContract.version}`;
    const facts: CalculationSnapshot["facts"] = [
      {
        id: "natal-sun",
        kind: "calculated",
        display: `Sol natal: ${zodiacPosition(natalSun).display}`,
        source,
      },
      ...dates.map((date) => ({
        id: `civil-day-${date}`,
        kind: "calculated" as const,
        display: `Dia civil: ${date}`,
        source: personalCalendarProductContract.version,
      })),
      ...(input.context
        ? [
            {
              id: "reported-context",
              kind: "reported" as const,
              display: input.context,
              source: "input.context",
            },
          ]
        : []),
    ];
    const snapshot: CalculationSnapshot = {
      version: personalCalendarProductContract.version,
      kind: "cycles",
      status: "experimental",
      facts,
      data: {
        productId: "personal-calendar",
        monthStart: input.targetDate,
        monthEndExclusive: end.toISOString().slice(0, 10),
        dates,
        natalSunLongitude: natalSun,
        natalSource: source,
        dailyEvents: "not-produced",
      },
      limits: [
        "A grade contém apenas dias civis UTC e uma referência natal estática.",
        "Nenhum trânsito diário, evento, previsão ou dia favorável foi calculado.",
        "Base experimental sem aprovação de método temporal, leitura editorial ou liberação.",
      ],
    };
    const checked = validateCalculation(snapshot, "personal-calendar");
    if (!checked) throw new ProcessingError("calculation_invalid");
    return checked;
  };
  return Object.freeze({ "personal-calendar": calculate });
}
