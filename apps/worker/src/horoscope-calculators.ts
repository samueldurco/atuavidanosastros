import {
  calculateCrossAspects,
  type AspectPolicy,
  type EphemerisProvider,
} from "@atv/astrology";
import { parseWorkflowInput } from "@atv/domain";
import { createContextCalculators } from "./context-calculators.ts";
import {
  projectHoroscope,
  validHoroscopeProjection,
} from "./horoscope-projection.ts";
import {
  ProcessingError,
  validateCalculation,
  type ProductCalculator,
} from "./product-processing.ts";

/** Explicit operator policy; does not register or release Horoscope by default. */
export function createHoroscopeCalculators(
  policy: AspectPolicy,
  provider?: EphemerisProvider,
): Readonly<Record<string, ProductCalculator>> {
  const capturedPolicy = calculateCrossAspects([], [], policy).policy;
  const calculateBase = createContextCalculators(provider)["date-reading"]!;
  const calculate: ProductCalculator = async (value, context) => {
    context.signal.throwIfAborted();
    const input = parseWorkflowInput(value);
    if (
      !input ||
      input.productId !== "horoscope" ||
      (input.context !== undefined &&
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\uD800-\uDFFF]/u.test(
          input.context,
        ))
    )
      throw new ProcessingError("input_invalid");
    const captured = structuredClone(input);
    const base = validateCalculation(
      await calculateBase({ ...captured, productId: "date-reading" }, context),
      "date-reading",
    );
    context.signal.throwIfAborted();
    if (!base) throw new ProcessingError("calculation_invalid");
    let snapshot;
    try {
      snapshot = projectHoroscope(base, capturedPolicy);
    } catch {
      throw new ProcessingError("calculation_invalid");
    }
    if (!validHoroscopeProjection(snapshot))
      throw new ProcessingError("calculation_invalid");
    const checked = validateCalculation(snapshot, "horoscope");
    if (!checked) throw new ProcessingError("calculation_invalid");
    return checked;
  };
  return Object.freeze({ horoscope: calculate });
}
