import {
  calculateCrossAspects,
  type AspectPolicy,
  type EphemerisProvider,
} from "@atv/astrology";
import { createWeekReadingCalculators } from "./week-reading-calculators.ts";
import { validWeekReadingProjection } from "./week-reading-projection.ts";
import {
  projectWeekTransits,
  validWeekTransitProjection,
} from "./week-transit-projection.ts";
import {
  ProcessingError,
  validateCalculation,
  type ProductCalculator,
} from "./product-processing.ts";

/** Separate operator opt-in; captures its policy before any awaited provider work. */
export function createWeekTransitCalculators(
  policy: AspectPolicy,
  provider?: EphemerisProvider,
): Readonly<Record<string, ProductCalculator>> {
  const capturedPolicy = calculateCrossAspects([], [], policy).policy;
  const calculateBase = createWeekReadingCalculators(provider)["week-reading"]!;
  const calculate: ProductCalculator = async (value, context) => {
    context.signal.throwIfAborted();
    const base = await calculateBase(value, context);
    context.signal.throwIfAborted();
    if (!validWeekReadingProjection(base))
      throw new ProcessingError("calculation_invalid");
    let snapshot;
    try {
      snapshot = projectWeekTransits(base, capturedPolicy);
    } catch {
      throw new ProcessingError("calculation_invalid");
    }
    if (!validWeekTransitProjection(snapshot))
      throw new ProcessingError("calculation_invalid");
    const checked = validateCalculation(snapshot, "week-reading");
    if (!checked) throw new ProcessingError("calculation_invalid");
    context.signal.throwIfAborted();
    return checked;
  };
  return Object.freeze({ "week-reading": calculate });
}
