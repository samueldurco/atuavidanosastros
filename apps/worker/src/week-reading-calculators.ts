import {
  CaelusEphemerisProvider,
  validateCalculationInput,
  type EphemerisProvider,
  type NatalChart,
} from "@atv/astrology";
import { parseWorkflowInput, type CalculationSnapshot } from "@atv/domain";
import { createContextCalculators } from "./context-calculators.ts";
import {
  ProcessingError,
  validateCalculation,
  type ProductCalculator,
} from "./product-processing.ts";
import {
  projectWeekReading,
  validWeekContext,
  validWeekReadingProjection,
  weekSampleDates,
} from "./week-reading-projection.ts";

/** Independent internal opt-in. No request-scoped state survives a calculation. */
export function createWeekReadingCalculators(
  provider: EphemerisProvider = new CaelusEphemerisProvider(),
): Readonly<Record<string, ProductCalculator>> {
  const calculate: ProductCalculator = async (value, { signal, runId }) => {
    signal.throwIfAborted();
    const parsed = parseWorkflowInput(value);
    if (
      !parsed?.birth ||
      parsed.productId !== "week-reading" ||
      (parsed.context !== undefined && !validWeekContext(parsed.context))
    )
      throw new ProcessingError("input_invalid");
    const input = structuredClone(parsed),
      birth = input.birth!;
    let dates: string[];
    try {
      dates = weekSampleDates(input.targetDate);
      validateCalculationInput(birth);
      for (const date of dates)
        validateCalculationInput({
          localDateTime: `${date}T12:00:00`,
          utcInstant: `${date}T12:00:00Z`,
          timezone: "UTC",
          latitude: 0,
          longitude: 0,
          locationSource: "internal-geocentric-reference/no-local-houses",
        });
    } catch {
      throw new ProcessingError("input_invalid");
    }
    let natal: NatalChart | undefined;
    const scopedProvider: EphemerisProvider = {
      name: provider.name,
      version: provider.version,
      async calculate(request) {
        signal.throwIfAborted();
        const isNatal = Object.entries(birth).every(
          ([key, wanted]) => request[key as keyof typeof request] === wanted,
        );
        if (isNatal && natal) return structuredClone(natal);
        const chart = await provider.calculate({ ...request });
        signal.throwIfAborted();
        if (isNatal) natal = structuredClone(chart);
        return structuredClone(chart);
      },
    };
    const dateCalculator =
      createContextCalculators(scopedProvider)["date-reading"];
    if (!dateCalculator) throw new ProcessingError("calculation_invalid");
    const bases: CalculationSnapshot[] = [];
    for (const targetDate of dates) {
      signal.throwIfAborted();
      const { context: _context, ...withoutContext } = input;
      const base = validateCalculation(
        await dateCalculator(
          { ...withoutContext, productId: "date-reading", targetDate },
          { signal, runId },
        ),
        "date-reading",
      );
      if (!base) throw new ProcessingError("calculation_invalid");
      bases.push(base);
    }
    signal.throwIfAborted();
    let snapshot: CalculationSnapshot;
    try {
      snapshot = projectWeekReading(bases, input.targetDate!, input.context);
    } catch {
      throw new ProcessingError("calculation_invalid");
    }
    if (!validWeekReadingProjection(snapshot))
      throw new ProcessingError("calculation_invalid");
    const checked = validateCalculation(snapshot, "week-reading");
    if (!checked) throw new ProcessingError("calculation_invalid");
    return checked;
  };
  return Object.freeze({ "week-reading": calculate });
}
