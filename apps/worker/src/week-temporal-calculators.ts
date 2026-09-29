import {
  bodies,
  CaelusEphemerisProvider,
  calculateCrossAspects,
  validateCalculationInput,
  type AspectPolicy,
  type EphemerisProvider,
  type NatalChart,
} from "@atv/astrology";
import { parseWorkflowInput } from "@atv/domain";
import { calculateValidatedChart } from "./natal-calculators.ts";
import {
  ProcessingError,
  validateCalculation,
  type ProductCalculator,
} from "./product-processing.ts";
import {
  validWeekContext,
  weekSampleDates,
} from "./week-reading-projection.ts";
import {
  projectWeekTemporalSearch,
  validWeekTemporalProjection,
} from "./week-temporal-projection.ts";
import { searchWeekTransits } from "./week-temporal-search.ts";

/** Independent internal opt-in. The policy and each request are captured before provider work. */
export function createWeekTemporalCalculators(
  policy: AspectPolicy,
  provider: EphemerisProvider = new CaelusEphemerisProvider(),
): Readonly<Record<string, ProductCalculator>> {
  const capturedPolicy = calculateCrossAspects([], [], policy).policy;
  const calculate: ProductCalculator = async (value, { signal }) => {
    signal.throwIfAborted();
    const parsed = parseWorkflowInput(value);
    if (
      !parsed?.birth ||
      parsed.productId !== "week-reading" ||
      (parsed.context !== undefined && !validWeekContext(parsed.context))
    )
      throw new ProcessingError("input_invalid");
    const input = structuredClone(parsed);
    const birth = input.birth!;
    let startDate: string;
    try {
      const dates = weekSampleDates(input.targetDate);
      startDate = dates[0]!;
      validateCalculationInput(birth);
      for (const instant of [
        `${startDate}T00:00:00.000Z`,
        new Date(
          Date.parse(`${startDate}T00:00:00.000Z`) + 7 * 86_400_000,
        ).toISOString(),
      ]) {
        validateCalculationInput({
          localDateTime: instant.slice(0, -1),
          utcInstant: instant,
          timezone: "UTC",
          latitude: 0,
          longitude: 0,
          locationSource: "internal-geocentric-reference/no-local-houses",
        });
      }
    } catch {
      throw new ProcessingError("input_invalid");
    }
    const natal = await calculateValidatedChart(provider, birth, signal);
    const sourceCharts = new Map<string, NatalChart>();
    const evaluate = async (utcInstant: string) => {
      signal.throwIfAborted();
      const chart = await calculateValidatedChart(
        provider,
        {
          localDateTime: utcInstant.slice(0, -1),
          utcInstant,
          timezone: "UTC",
          latitude: 0,
          longitude: 0,
          locationSource: "internal-geocentric-reference/no-local-houses",
        },
        signal,
      );
      sourceCharts.set(utcInstant, chart);
      return bodies.map((body) => {
        const position = chart.positions.find(
          (candidate) => candidate.body === body,
        );
        if (!position) throw new ProcessingError("calculation_invalid");
        return { body, longitude: position.longitude };
      });
    };
    let snapshot;
    try {
      const search = await searchWeekTransits(
        startDate,
        natal.positions.map(({ body, longitude }) => ({ body, longitude })),
        capturedPolicy,
        evaluate,
        signal,
      );
      signal.throwIfAborted();
      snapshot = projectWeekTemporalSearch(
        search,
        natal,
        sourceCharts,
        input.context,
      );
    } catch (error) {
      signal.throwIfAborted();
      if (error instanceof ProcessingError) throw error;
      throw new ProcessingError("calculation_invalid");
    }
    if (!validWeekTemporalProjection(snapshot))
      throw new ProcessingError("calculation_invalid");
    const checked = validateCalculation(snapshot, "week-reading");
    if (!checked) throw new ProcessingError("calculation_invalid");
    signal.throwIfAborted();
    return checked;
  };
  return Object.freeze({ "week-reading": calculate });
}
