import { validDate, type CalculationSnapshot } from "@atv/domain";
import { contextProductContract } from "./context-calculators.ts";
import { validDateReadingProjection } from "./date-reading-projection.ts";

export const weekReadingProductContract = Object.freeze({
  version: "atv-week-reading-calculation/1.0.0",
  productId: "week-reading",
  completeness: "partial",
  status: "experimental",
  baseContract: contextProductContract.version,
  days: 7,
  sampling:
    "seven-consecutive-dates-at-12:00:00Z/not-local-days/not-event-search",
  natal: "shared-unchanged-basis",
  aspects: "not-assessed",
  events: "not-produced",
  windows: "not-produced",
  interpretation: "not-produced",
  calendar: "not-produced",
  reminders: "not-produced",
});

export const weekReadingLimits = Object.freeze([
  "Semana: base parcial experimental de sete amostras consecutivas, sem homologação do motor, interpretação ou liberação do produto.",
  "Cada data foi amostrada somente às 12:00 UTC. Não é meio-dia local, cobertura de sete dias locais, janela favorável, previsão ou busca de trânsito exato.",
  "A base natal é compartilhada sem alteração. Casas, ângulos, aspectos, aplicação/separação, eventos e intensidade não foram projetados.",
  "Fuso/local atuais não foram inferidos do nascimento. Datas importantes do usuário, calendário, lembretes, alertas e Revolução Solar não foram produzidos.",
  "As sete bases internas conservam o contrato e os limites da Leitura da Data; cada uma isoladamente não representa uma semana.",
]);

export function weekSampleDates(startDate: unknown): string[] {
  if (!validDate(startDate)) throw new Error("invalid_week_range");
  const start = Date.parse(`${startDate}T12:00:00.000Z`);
  const dates = Array.from({ length: 7 }, (_, day) =>
    new Date(start + day * 86400000).toISOString().slice(0, 10),
  );
  if (!dates.every(validDate)) throw new Error("invalid_week_range");
  return dates;
}

export function validWeekContext(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !!value.trim() &&
    value.length <= 1200 &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\uD800-\uDFFF]/u.test(
      value,
    )
  );
}

const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (record(v))
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((key) => [key, canonical(v[key])]),
    );
  return v;
}
const same = (a: unknown, b: unknown) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

// Inspect original JSON values before cloning/comparison can erase metadata.
function jsonCompatible(value: unknown, depth = 0): boolean {
  if (depth > 32) return false;
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (!record(value) && !Array.isArray(value)) return false;
  if (
    !Array.isArray(value) &&
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    return false;
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== "string")) return false;
  if (
    Array.isArray(value) &&
    (keys.length !== value.length + 1 || !keys.includes("length"))
  )
    return false;
  return keys.every((key) => {
    if (Array.isArray(value) && key === "length") return true;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return (
      !!descriptor?.enumerable &&
      Object.hasOwn(descriptor, "value") &&
      jsonCompatible(descriptor.value, depth + 1)
    );
  });
}

/** Pure ordered composition. Nested date contracts remain unchanged and context-free. */
export function projectWeekReading(
  bases: readonly CalculationSnapshot[],
  startDate: string,
  context?: string,
): CalculationSnapshot {
  const dates = weekSampleDates(startDate);
  const first = bases[0];
  if (
    (context !== undefined && !validWeekContext(context)) ||
    !jsonCompatible(bases) ||
    bases.length !== 7 ||
    !first ||
    bases.some(
      (base, i) =>
        !record(base) ||
        !validDateReadingProjection(base) ||
        base.facts.length !== 21 ||
        base.data.targetDate !== dates[i],
    ) ||
    bases.some((base) => !same(base.data.first, first.data.first))
  )
    throw new Error("invalid_week_basis");
  const facts: CalculationSnapshot["facts"] = [
    {
      id: "week-range",
      kind: "calculated",
      display: `Sete amostras às 12:00 UTC: ${dates[0]} a ${dates[6]}; cobertura dos dias locais não estabelecida.`,
      source: weekReadingProductContract.version,
    },
    ...structuredClone(first.facts.slice(0, 10)),
  ];
  for (const [day, base] of bases.entries()) {
    for (const fact of base.facts.slice(10))
      facts.push({
        ...structuredClone(fact),
        id: `day-${day + 1}-${fact.id}`,
        display: `${dates[day]} · ${fact.display}`,
        source: `${fact.source};${weekReadingProductContract.version}`,
      });
  }
  if (context !== undefined)
    facts.push({
      id: "personal-context",
      kind: "reported",
      display: context,
      source: "input.context",
    });
  const warnings: string[] = [];
  for (const base of bases) {
    for (const side of ["first", "second"]) {
      const p = base.data[side] as { provenance: { warnings: string[] } };
      warnings.push(...p.provenance.warnings);
    }
  }
  return {
    version: weekReadingProductContract.version,
    kind: "cycles",
    status: "experimental",
    facts,
    data: {
      productId: "week-reading",
      projection: weekReadingProductContract,
      startDate: dates[0],
      endDate: dates[6],
      samples: structuredClone(bases),
      declaredContext: context ?? null,
      aspects: [],
      events: [],
      windows: [],
    },
    limits: [...new Set(warnings), ...weekReadingLimits],
  };
}

/** Persisted coherence only; neither provider authentication nor homologation. */
export function validWeekReadingProjection(
  value: unknown,
): value is CalculationSnapshot {
  try {
    if (
      !jsonCompatible(value) ||
      !record(value) ||
      !record(value.data) ||
      !Array.isArray(value.data.samples) ||
      typeof value.data.startDate !== "string" ||
      !(
        value.data.declaredContext === null ||
        validWeekContext(value.data.declaredContext)
      )
    )
      return false;
    const expected = projectWeekReading(
      value.data.samples as CalculationSnapshot[],
      value.data.startDate,
      value.data.declaredContext === null
        ? undefined
        : value.data.declaredContext,
    );
    return same(value, expected);
  } catch {
    return false;
  }
}
