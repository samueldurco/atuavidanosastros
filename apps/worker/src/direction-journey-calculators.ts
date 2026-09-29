import {
  parseWorkflowInput,
  WORKFLOW_VERSION,
  type CalculationSnapshot,
} from "@atv/domain";
import {
  ProcessingError,
  type ProductCalculator,
} from "./product-processing.ts";

export const directionJourneyContract = Object.freeze({
  version: "atv-direction-journey-calculation/1.0.0",
  productId: "direction-journey",
  duration: "30-civil-days-start-inclusive",
  checkInDays: [7, 14, 30],
  reading: "not-produced",
  checkIns: "not-recorded",
});

const limits = [
  "Objetivo e início são dados declarados pela pessoa; o cronograma contém apenas datas civis.",
  "Leitura inicial, experimentos, respostas aos check-ins, síntese e próximos rumos não foram produzidos.",
  "Sem prescrição de profissão ou promessa de emprego, renda ou destino.",
];

function dateForDay(startDate: string, day: number): string {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  return new Date(start.valueOf() + (day - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function snapshot(goal: string, startDate: string, context?: string): CalculationSnapshot {
  const milestones = directionJourneyContract.checkInDays.map((day) => ({
    day,
    date: dateForDay(startDate, day),
  }));
  return {
    version: directionJourneyContract.version,
    kind: "purpose",
    status: "experimental",
    facts: [
      { id: "declared-goal", kind: "reported", display: goal, source: "input.journey.goal" },
      { id: "declared-start", kind: "reported", display: startDate, source: "input.journey.startDate" },
      ...milestones.map(({ day, date }) => ({
        id: `civil-check-in-day-${day}`,
        kind: "calculated" as const,
        display: `Dia ${day}: ${date}`,
        source: directionJourneyContract.version,
      })),
      ...(context ? [{ id: "reported-context", kind: "reported" as const, display: context, source: "input.context" }] : []),
    ],
    data: {
      productId: directionJourneyContract.productId,
      goal,
      startDate,
      milestones,
      reading: directionJourneyContract.reading,
      checkIns: directionJourneyContract.checkIns,
    },
    limits: [...limits],
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, part]) => `${JSON.stringify(key)}:${canonicalJson(part)}`).join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}

/** Coherence of persisted JSONB only; does not authenticate the user's declaration. */
export function validDirectionJourneyProjection(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const data = v.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const d = data as Record<string, unknown>;
  if (Object.keys(v).sort().join() !== "data,facts,kind,limits,status,version" ||
      Object.keys(d).sort().join() !== "checkIns,goal,milestones,productId,reading,startDate" ||
      d.productId !== directionJourneyContract.productId ||
      typeof d.goal !== "string" || typeof d.startDate !== "string") return false;
  const facts = v.facts;
  if (!Array.isArray(facts) || ![5, 6].includes(facts.length)) return false;
  const contextFact = facts.length === 6 ? facts[5] : undefined;
  if (contextFact !== undefined &&
      (!contextFact || typeof contextFact !== "object" || Array.isArray(contextFact) ||
       Object.keys(contextFact).sort().join() !== "display,id,kind,source" ||
       contextFact.id !== "reported-context" || contextFact.kind !== "reported" ||
       contextFact.source !== "input.context" || typeof contextFact.display !== "string" ||
       !contextFact.display.trim() || contextFact.display.length > 1200)) return false;
  const parsed = parseWorkflowInput({
    version: WORKFLOW_VERSION,
    productId: directionJourneyContract.productId,
    consent: { storage: true, policyVersion: "atv-input-consent/1", partner: false, continuity: false },
    journey: { goal: d.goal, startDate: d.startDate },
    ...(contextFact ? { context: contextFact.display } : {}),
  });
  if (!parsed) return false;
  const expected = snapshot(d.goal, d.startDate, contextFact?.display);
  return canonicalJson(v) === canonicalJson(expected);
}

/** Internal opt-in; intake and civil dates alone cannot satisfy editorial or release gates. */
export function createDirectionJourneyCalculators(): Readonly<Record<string, ProductCalculator>> {
  const calculate: ProductCalculator = async (value, { signal }) => {
    signal.throwIfAborted();
    const input = parseWorkflowInput(value);
    if (input?.productId !== "direction-journey" || !input.journey)
      throw new ProcessingError("input_invalid");
    return snapshot(input.journey.goal, input.journey.startDate, input.context);
  };
  return Object.freeze({ "direction-journey": calculate });
}
