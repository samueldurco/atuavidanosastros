import type { AspectPolicy, EphemerisProvider } from "@atv/astrology";
import { parseWorkflowInput, type CalculationSnapshot } from "@atv/domain";
import {
  ProcessingError,
  validateCalculation,
  type ProductCalculator,
} from "./product-processing.ts";
import { createSynastryCalculators } from "./synastry-calculators.ts";
import {
  coupleDossierProductContract,
  coupleDossierLimit,
  validCoupleDossierProjection,
} from "./couple-dossier-projection.ts";

/** Explicit operator policy; no default registration or claim of a complete Dossier. */
export function createCoupleDossierCalculators(
  policy: AspectPolicy,
  provider?: EphemerisProvider,
): Readonly<Record<string, ProductCalculator>> {
  const calculateBase = createSynastryCalculators(policy, provider).synastry!;
  const calculate: ProductCalculator = async (value, context) => {
    context.signal.throwIfAborted();
    const input = parseWorkflowInput(value);
    if (!input || input.productId !== "couple-dossier")
      throw new ProcessingError("input_invalid");
    // Capture both records and declared context before any provider work.
    const captured = structuredClone(input);
    const base = validateCalculation(
      await calculateBase({ ...captured, productId: "synastry" }, context),
      "synastry",
    );
    context.signal.throwIfAborted();
    if (!base) throw new ProcessingError("calculation_invalid");
    const snapshot: CalculationSnapshot = {
      version: coupleDossierProductContract.version,
      kind: "relationship",
      status: "experimental",
      facts: structuredClone(base.facts),
      data: {
        productId: "couple-dossier",
        projection: coupleDossierProductContract,
        base,
      },
      limits: [...base.limits, coupleDossierLimit],
    };
    if (!validCoupleDossierProjection(snapshot))
      throw new ProcessingError("calculation_invalid");
    const checked = validateCalculation(snapshot, "couple-dossier");
    if (!checked) throw new ProcessingError("calculation_invalid");
    return checked;
  };
  return Object.freeze({ "couple-dossier": calculate });
}
