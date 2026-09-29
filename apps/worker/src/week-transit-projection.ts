import {
  calculateCrossAspects,
  type AspectPolicy,
  type AspectPosition,
  type MajorAspect,
} from "@atv/astrology";
import type { CalculationSnapshot } from "@atv/domain";
import { bodyLabels } from "./natal-calculators.ts";
import {
  projectWeekReading,
  validWeekContext,
  validWeekReadingProjection,
  weekReadingProductContract,
  weekSampleDates,
} from "./week-reading-projection.ts";

export const weekTransitProductContract = Object.freeze({
  version: "atv-week-reading-calculation/1.1.0",
  productId: "week-reading",
  completeness: "partial",
  status: "experimental",
  baseContract: weekReadingProductContract.version,
  encoding:
    "shared-natal-and-outer-base-facts/lossless-date-snapshot-reconstruction",
  sampling:
    "seven-consecutive-dates-at-12:00:00Z/not-local-days/not-event-search",
  geometry: "nominal-tropical-longitude-difference/no-common-epoch-transform",
  roles: "transit-sample-first/natal-second",
  pairsPerSample: 100,
  sampleComparisons: 700,
  changes: "six-successive-sample-separation-differences/not-continuous-motion",
  policyApproval: "not-established",
  inputPrecision: "not-certified",
  assumedLongitudeErrorDegrees: null,
  aspectStability: "unknown-accuracy",
  motion: "not-evaluated",
  events: "not-produced",
  windows: "not-produced",
  interpretation: "not-produced",
  calendar: "not-produced",
  reminders: "not-produced",
});

export const weekTransitLimits = Object.freeze([
  "Semana: séries nominais experimentais de sete amostras, sem homologação do motor, aprovação da política, interpretação ou liberação do produto.",
  "Amostras somente às 12:00 UTC; diferenças entre amostras não provam movimento contínuo, aplicação/separação, trânsito exato, janela favorável ou cobertura de dias locais.",
  "Trânsito e natal conservam épocas próprias. A diferença nominal de longitudes tropicais não transforma as coordenadas para uma época comum; precisão e estabilidade dos aspectos são desconhecidas.",
  "As sete bases internas da Leitura da Data permanecem inalteradas e sem aspectos; as comparações pertencem somente à projeção externa desta versão da Semana.",
  "Casas, ângulos, eventos, intensidade, janelas, calendário, lembretes e alertas não foram produzidos. Fuso e tema declarados não alteram a geometria.",
]);

const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

// Inspect original descriptors before JSON comparison can discard hidden metadata.
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
const labels: Record<MajorAspect, string> = {
  conjunction: "conjunção",
  sextile: "sextil",
  square: "quadratura",
  trine: "trígono",
  opposition: "oposição",
};

/** Pure sampled geometry. No interpolation, event search or editorial policy default. */
export function projectWeekTransits(
  base: CalculationSnapshot,
  policy: AspectPolicy,
): CalculationSnapshot {
  if (!validWeekReadingProjection(base) || !jsonCompatible(policy))
    throw new Error("invalid_week_transit_basis");
  const capturedPolicy = calculateCrossAspects([], [], policy).policy;
  const samples = base.data.samples as CalculationSnapshot[];
  const dates = weekSampleDates(base.data.startDate);
  const natal = samples[0]!.data.first as { positions: AspectPosition[] };
  const calculations = samples.map((sample) =>
    calculateCrossAspects(
      (sample.data.second as { positions: AspectPosition[] }).positions,
      natal.positions,
      capturedPolicy,
    ),
  );
  const series = calculations[0]!.inputPositions.first.flatMap((transit) =>
    calculations[0]!.inputPositions.second.map((natalPosition) => {
      const separationsDegrees: number[] = [];
      const aspectKinds: (MajorAspect | null)[] = [];
      const orbDegrees: (number | null)[] = [];
      for (const calculation of calculations) {
        const samplePosition = calculation.inputPositions.first.find(
          (p) => p.body === transit.body,
        )!;
        const difference = Math.abs(
          samplePosition.longitude - natalPosition.longitude,
        );
        separationsDegrees.push(Math.min(difference, 360 - difference));
        const match = calculation.aspects.find(
          (a) => a.first === transit.body && a.second === natalPosition.body,
        );
        aspectKinds.push(match?.kind ?? null);
        orbDegrees.push(match?.orbDegrees ?? null);
      }
      return {
        transitBody: transit.body,
        natalBody: natalPosition.body,
        separationsDegrees,
        aspectKinds,
        orbDegrees,
        separationChangesDegrees: separationsDegrees
          .slice(1)
          .map((value, i) => value - separationsDegrees[i]!),
      };
    }),
  );
  const facts = structuredClone(
    base.facts.filter((f) => f.id !== "personal-context"),
  );
  const source = `${calculations[0]!.algorithmVersion};${weekTransitProductContract.version}`;
  facts.push({
    id: "week-transit-policy",
    kind: "calculated",
    display: `Política experimental explícita ${capturedPolicy.id}@${capturedPolicy.version}; sem aprovação estabelecida. As 100 séries usam esta mesma política nas sete amostras.`,
    source,
  });
  for (const item of series) {
    facts.push({
      id: `transit-${item.transitBody}-natal-${item.natalBody}-series`,
      kind: "calculated",
      display: `${bodyLabels[item.transitBody]} em trânsito × ${bodyLabels[item.natalBody]} natal · série nominal, sete amostras 12UTC na ordem do intervalo. Separações (°): ${item.separationsDegrees.map((v) => v.toFixed(6)).join(",")}; diferenças sucessivas (°): ${item.separationChangesDegrees.map((v) => v.toFixed(6)).join(",")}; aspectos: ${item.aspectKinds.map((kind) => (kind === null ? "nenhum" : labels[kind])).join(",")}. Precisão desconhecida.`,
      source,
    });
  }
  const contextFact = base.facts.find((f) => f.id === "personal-context");
  if (contextFact) facts.push(structuredClone(contextFact));
  const warnings = samples.flatMap((sample) =>
    ["first", "second"].flatMap(
      (side) =>
        (sample.data[side] as { provenance: { warnings: string[] } }).provenance
          .warnings,
    ),
  );
  return {
    version: weekTransitProductContract.version,
    kind: "cycles",
    status: "experimental",
    facts,
    data: {
      productId: "week-reading",
      projection: weekTransitProductContract,
      startDate: dates[0],
      endDate: dates[6],
      natalBasis: structuredClone(samples[0]!.data.first),
      samples: samples.map(({ facts: _facts, data, ...metadata }) => {
        const { first: _first, ...sampleData } = data;
        return structuredClone({ ...metadata, data: sampleData });
      }),
      declaredContext: base.data.declaredContext,
      policy: capturedPolicy,
      series,
      events: [],
      windows: [],
    },
    limits: [...new Set(warnings), ...weekTransitLimits],
  };
}

/** Reconstruct every sample and series; coherence is not source authentication. */
export function validWeekTransitProjection(
  value: unknown,
): value is CalculationSnapshot {
  try {
    if (
      !jsonCompatible(value) ||
      !record(value) ||
      !record(value.data) ||
      !Array.isArray(value.data.samples) ||
      !Array.isArray(value.facts) ||
      typeof value.data.startDate !== "string" ||
      !record(value.data.natalBasis) ||
      !record(value.data.policy) ||
      !(
        value.data.declaredContext === null ||
        validWeekContext(value.data.declaredContext)
      )
    )
      return false;
    const dates = weekSampleDates(value.data.startDate);
    const storedFacts = value.facts,
      encodedSamples = value.data.samples;
    const natalBasis = value.data.natalBasis;
    const natalFacts = storedFacts.slice(1, 11);
    const samples = encodedSamples.map((sample, day) => {
      if (!record(sample) || !record(sample.data))
        throw new Error("invalid_sample_encoding");
      const idPrefix = `day-${day + 1}-`,
        displayPrefix = `${dates[day]} · `;
      const sourceSuffix = `;${weekReadingProductContract.version}`;
      const sampleFacts = storedFacts
        .slice(11 + day * 11, 22 + day * 11)
        .map((fact: unknown) => {
          if (
            !record(fact) ||
            typeof fact.id !== "string" ||
            !fact.id.startsWith(idPrefix) ||
            typeof fact.display !== "string" ||
            !fact.display.startsWith(displayPrefix) ||
            typeof fact.source !== "string" ||
            !fact.source.endsWith(sourceSuffix)
          )
            throw new Error("invalid_sample_facts_encoding");
          return {
            ...fact,
            id: fact.id.slice(idPrefix.length),
            display: fact.display.slice(displayPrefix.length),
            source: fact.source.slice(0, -sourceSuffix.length),
          };
        });
      return {
        ...sample,
        facts: [...natalFacts, ...sampleFacts],
        data: { ...sample.data, first: natalBasis },
      };
    });
    const base = projectWeekReading(
      samples as unknown as CalculationSnapshot[],
      value.data.startDate,
      value.data.declaredContext === null
        ? undefined
        : value.data.declaredContext,
    );
    return same(
      value,
      projectWeekTransits(base, value.data.policy as unknown as AspectPolicy),
    );
  } catch {
    return false;
  }
}
