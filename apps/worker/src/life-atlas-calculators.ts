import {
  validAtlasPriorities,
  parseWorkflowInput,
  type CalculationSnapshot,
} from "@atv/domain";
import type { EphemerisProvider } from "@atv/astrology";
import {
  createNatalCalculators,
  inspectBirthChartProjection,
} from "./natal-calculators.ts";
import {
  ProcessingError,
  validateCalculation,
  type ProductCalculator,
} from "./product-processing.ts";

export const lifeAtlasContract = Object.freeze({
  version: "atv-life-atlas-calculation/1.0.0",
  product: "life-atlas",
  natal: "atv-natal-product-calculation/1.0.0",
  connection: "not-assessed",
  path: "not-produced",
  status: "experimental",
});

const limit =
  "As quatro prioridades são relatadas pela pessoa; o mapa não as associa a posições nem produz um caminho de 30 dias.";
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const priorityFact = (
  priority: string,
  index: number,
): CalculationSnapshot["facts"][number] => ({
  id: `priority-${index + 1}`,
  kind: "reported",
  display: `Prioridade ${index + 1}: ${priority}`,
  source: `input.atlas.priorities[${index}]`,
});

/** Checks the original nested natal projection and all four reported priorities before editorial use. */
export function inspectLifeAtlasProjection(
  value: CalculationSnapshot,
): "available" | "unavailable" | null {
  const data = value.data;
  const projection = data.projection;
  if (
    value.version !== lifeAtlasContract.version ||
    value.kind !== "natal" ||
    value.status !== "experimental" ||
    !record(data) ||
    Object.keys(data).length !== 4 ||
    data.productId !== "life-atlas" ||
    !record(projection) ||
    Object.keys(projection).length !== Object.keys(lifeAtlasContract).length ||
    Object.entries(lifeAtlasContract).some(
      ([key, expected]) => projection[key] !== expected,
    ) ||
    !validAtlasPriorities(data.priorities) ||
    !record(data.natal) ||
    !Array.isArray(data.natal.facts) ||
    !Array.isArray(data.natal.limits) ||
    value.facts.length !== data.natal.facts.length + 4
  )
    return null;
  const natal = validateCalculation(data.natal, "birth-chart");
  const availability = natal && inspectBirthChartProjection(natal);
  if (
    !availability ||
    !natal ||
    value.limits.length !== natal.limits.length + 1 ||
    value.limits.some(
      (item, index) =>
        item !== (index < natal.limits.length ? natal.limits[index] : limit),
    )
  )
    return null;
  const expected = [...natal.facts, ...data.priorities.map(priorityFact)];
  if (
    value.facts.some((fact, index) => {
      const wanted = expected[index];
      return (
        !wanted ||
        fact.id !== wanted.id ||
        fact.kind !== wanted.kind ||
        fact.display !== wanted.display ||
        fact.source !== wanted.source
      );
    })
  )
    return null;
  return availability;
}

/** Internal opt-in only. The projection does not infer a correspondence or enable release. */
export function createLifeAtlasCalculators(
  provider?: EphemerisProvider,
): Readonly<Record<"life-atlas", ProductCalculator>> {
  const natalCalculator = createNatalCalculators(provider)["birth-chart"]!;
  const calculate: ProductCalculator = async (value, context) => {
    const input = parseWorkflowInput(value);
    if (
      !input?.birth ||
      input.productId !== "life-atlas" ||
      !input.atlas ||
      !validAtlasPriorities(input.atlas.priorities)
    )
      throw new ProcessingError("input_invalid");
    const natalInput = structuredClone(input);
    delete natalInput.atlas;
    natalInput.productId = "birth-chart";
    const natal = validateCalculation(
      await natalCalculator(natalInput, context),
      "birth-chart",
    );
    if (!natal || !inspectBirthChartProjection(natal))
      throw new ProcessingError("calculation_invalid");
    const priorities = [...input.atlas.priorities] as [
      string,
      string,
      string,
      string,
    ];
    return {
      version: lifeAtlasContract.version,
      kind: "natal",
      status: "experimental",
      facts: [...natal.facts, ...priorities.map(priorityFact)],
      data: {
        productId: "life-atlas",
        natal,
        priorities,
        projection: lifeAtlasContract,
      },
      limits: [...natal.limits, limit],
    } satisfies CalculationSnapshot;
  };
  return Object.freeze({ "life-atlas": calculate });
}
