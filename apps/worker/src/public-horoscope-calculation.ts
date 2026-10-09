import {
  bodies,
  calculateAspects,
  CaelusEphemerisProvider,
  engineContract,
  type AspectPolicy,
  type AspectResult,
  type CalculationProvenance,
  type CelestialBody,
  type EphemerisProvider,
} from "@atv/astrology";
import { validDate } from "@atv/domain";
import dataManifest from "../../../packages/astrology/src/data-manifest.json" with { type: "json" };

export const PUBLIC_HOROSCOPE_VERSION = "atv-public-horoscope-samples/1.0.0";
export type HoroscopePeriod = "daily" | "weekly" | "monthly";
const day = 86_400_000;
const step = day / 4;
const policy: AspectPolicy = {
  id: "atv-public-horoscope-major",
  version: "1.0.0",
  aspects: ["conjunction", "sextile", "square", "trine", "opposition"].map(
    (kind) => ({ kind: kind as AspectResult["kind"], orbDegrees: 2 }),
  ),
};
export type PublicSkyMovement = {
  id: string;
  kind: "aspect" | "sign-change" | "motion-change";
  category: "fast" | "background";
  bodies: CelestialBody[];
  firstObservedAt: string;
  lastObservedAt: string;
  representativeAt: string;
  score: number;
  aspect?: AspectResult;
  fromSign?: number;
  toSign?: number;
  retrograde?: boolean;
};
export type PublicHoroscopeSnapshot = {
  version: typeof PUBLIC_HOROSCOPE_VERSION;
  period: HoroscopePeriod;
  startDate: string;
  endDateExclusive: string;
  timezone: "UTC";
  stepHours: 6;
  bodies: readonly CelestialBody[];
  engine: "caelus";
  engineVersion: "0.24.1";
  license: "MIT";
  provenance: CalculationProvenance;
  // Timestamp, ten longitudes in canonical body order, ten-bit retrograde mask.
  rows: number[][];
  aspectPolicy: AspectPolicy;
  pairsEvaluatedPerSample: 45;
  candidates: PublicSkyMovement[];
  selectedIds: string[];
  selectionVersion: "atv-public-sky-relevance/1.0.0";
  limits: readonly string[];
};
const limits = [
  "Cálculo geocêntrico tropical experimental; precisão integral ainda não homologada.",
  "Períodos em UTC, com amostras a cada seis horas; não equivalem ao dia civil de cada leitor.",
  "Aspectos e mudanças são observações amostradas: não certificam instante exato, duração, aplicação ou separação.",
  "A grade pode deixar de detectar contatos ou mudanças entre amostras. A última amostra precede o fim exclusivo do período.",
  "Relevância é uma política editorial explícita, não probabilidade ou previsão de acontecimentos.",
  "Não usa mapa natal, casas ou ângulos do leitor; os mesmos fatos do céu servem aos doze signos.",
] as const;

export function publicHoroscopeBounds(date: string, period: HoroscopePeriod) {
  if (
    !validDate(date) ||
    date < "1900-01-01" ||
    date > "2099-12-31" ||
    !["daily", "weekly", "monthly"].includes(period)
  )
    throw Error("Data ou período de horóscopo inválido.");
  const start = new Date(date + "T00:00:00.000Z");
  if (period === "weekly")
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (period === "monthly") start.setUTCDate(1);
  const end = new Date(start);
  if (period === "monthly") end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCDate(end.getUTCDate() + (period === "weekly" ? 7 : 1));
  if (
    start.toISOString().slice(0, 10) < "1900-01-01" ||
    end.getTime() > Date.parse("2100-01-01T00:00:00.000Z")
  )
    throw Error("Período ultrapassa o domínio nominal do motor.");
  return {
    startDate: start.toISOString().slice(0, 10),
    endDateExclusive: end.toISOString().slice(0, 10),
  };
}
const iso = (at: number) => new Date(at).toISOString();
const category = (names: readonly CelestialBody[]) =>
  names.every((body) => bodies.indexOf(body) >= 5)
    ? ("background" as const)
    : ("fast" as const);
const originIdentity = (p: CalculationProvenance) =>
  JSON.stringify({
    provider: p.provider,
    providerVersion: p.providerVersion,
    algorithmVersion: p.algorithmVersion,
    zodiac: p.zodiac,
    referenceFrame: p.referenceFrame,
    dataManifest: p.dataManifest,
    contract: p.contract,
    accuracyStatus: p.accuracyStatus,
  });
function assertOrigin(p: CalculationProvenance, first: number) {
  if (
    !p ||
    p.provider !== "caelus" ||
    p.providerVersion !== "0.24.1" ||
    p.algorithmVersion !== "atv-caelus-adapter-v3" ||
    p.zodiac !== "tropical" ||
    p.referenceFrame !== "geocentric-apparent-ecliptic-of-date" ||
    p.accuracyStatus !== "experimental" ||
    p.temporal?.utcInstant !== iso(first) ||
    JSON.stringify(p.contract) !== JSON.stringify(engineContract) ||
    JSON.stringify(p.dataManifest) !== JSON.stringify(dataManifest) ||
    !Array.isArray(p.warnings)
  )
    throw Error("Origem astronômica pública divergente.");
}

type SkyRow = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
function project(inputRows: number[][]) {
  // The public contract validates the twelve columns before accepting a snapshot.
  const rows = inputRows as SkyRow[];
  const found = new Map<string, PublicSkyMovement>();
  rows.forEach((row, rowIndex) => {
    const positions = bodies.map((body, i) => ({
      body,
      longitude: row[i + 1]!,
    }));
    for (const aspect of calculateAspects(positions, policy).aspects) {
      const id = `aspect:${aspect.first}:${aspect.second}:${aspect.kind}`;
      const old = found.get(id);
      const names = [aspect.first, aspect.second];
      const score =
        70 +
        (category(names) === "background" ? 20 : 0) +
        (names.includes("moon") ? 0 : 10) +
        (2 - aspect.orbDegrees) * 5;
      if (old) {
        old.lastObservedAt = iso(row[0]);
        if (score > old.score) {
          old.representativeAt = iso(row[0]);
          old.score = score;
          old.aspect = aspect;
        }
      } else
        found.set(id, {
          id,
          kind: "aspect",
          category: category(names),
          bodies: names,
          firstObservedAt: iso(row[0]),
          lastObservedAt: iso(row[0]),
          representativeAt: iso(row[0]),
          score,
          aspect,
        });
    }
    if (!rowIndex) return;
    const previous = rows[rowIndex - 1]!;
    bodies.forEach((body, index) => {
      const fromSign = Math.floor(previous[index + 1]! / 30);
      const toSign = Math.floor(row[index + 1]! / 30);
      const transitions: PublicSkyMovement[] = [];
      const base = {
        category: category([body]),
        bodies: [body],
        firstObservedAt: iso(previous[0]),
        lastObservedAt: iso(row[0]),
        representativeAt: iso(row[0]),
      };
      if (fromSign !== toSign)
        transitions.push({
          ...base,
          id: `sign:${body}:${row[0]}`,
          kind: "sign-change",
          score: body === "moon" ? 30 : 115,
          fromSign,
          toSign,
        });
      const before = Boolean(previous[11] & (1 << index));
      const after = Boolean(row[11] & (1 << index));
      if (before !== after)
        transitions.push({
          ...base,
          id: `motion:${body}:${row[0]}`,
          kind: "motion-change",
          score: 120,
          retrograde: after,
        });
      transitions.forEach((movement) => found.set(movement.id, movement));
    });
  });
  const candidates = [...found.values()].sort(
    (a, b) => b.score - a.score || a.id.localeCompare(b.id, "en"),
  );
  const selected = candidates.slice(0, 6);
  // Reserve one observed candidate of each timescale when available. No padding.
  for (const group of ["fast", "background"] as const) {
    if (selected.some((m) => m.category === group)) continue;
    const item = candidates.find((m) => m.category === group);
    if (item) {
      if (selected.length === 6) selected.pop();
      selected.push(item);
    }
  }
  selected.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, "en"));
  return { candidates, selectedIds: selected.map((m) => m.id) };
}

export async function calculatePublicHoroscope(
  date: string,
  period: HoroscopePeriod,
  signal: AbortSignal,
  provider: EphemerisProvider = new CaelusEphemerisProvider(),
): Promise<PublicHoroscopeSnapshot> {
  const bounds = publicHoroscopeBounds(date, period);
  const first = Date.parse(bounds.startDate + "T00:00:00.000Z");
  const end = Date.parse(bounds.endDateExclusive + "T00:00:00.000Z");
  const rows: number[][] = [];
  let provenance: CalculationProvenance | undefined;
  for (let at = first; at < end; at += step) {
    signal.throwIfAborted();
    const utcInstant = iso(at);
    const chart = await provider.calculate({
      localDateTime: utcInstant.slice(0, -1),
      utcInstant,
      timezone: "UTC",
      latitude: 0,
      longitude: 0,
      locationSource: "public-geocentric-reference/no-reader-houses",
    });
    signal.throwIfAborted();
    if (chart.provenance.temporal.utcInstant !== utcInstant)
      throw Error("Instante astronômico divergente.");
    if (
      provenance &&
      originIdentity(provenance) !== originIdentity(chart.provenance)
    )
      throw Error("Origem mudou durante o período público.");
    provenance ??= structuredClone(chart.provenance);
    if (
      chart.positions.length !== bodies.length ||
      bodies.some(
        (body) => chart.positions.filter((p) => p.body === body).length !== 1,
      )
    )
      throw Error("Corpos ausentes ou duplicados.");
    let mask = 0;
    const longitudes = bodies.map((body, index) => {
      const position = chart.positions.find((p) => p.body === body)!;
      if (typeof position.retrograde !== "boolean")
        throw Error("Movimento inválido.");
      if (position.retrograde) mask |= 1 << index;
      return position.longitude;
    });
    rows.push([at, ...longitudes, mask]);
  }
  const result: PublicHoroscopeSnapshot = {
    version: PUBLIC_HOROSCOPE_VERSION,
    period,
    ...bounds,
    timezone: "UTC",
    stepHours: 6,
    bodies: [...bodies],
    engine: "caelus",
    engineVersion: "0.24.1",
    license: "MIT",
    provenance: provenance!,
    rows,
    aspectPolicy: structuredClone(policy),
    pairsEvaluatedPerSample: 45,
    ...project(rows),
    selectionVersion: "atv-public-sky-relevance/1.0.0",
    limits: [...limits],
  };
  assertPublicHoroscopeSnapshot(result);
  return result;
}

export function assertPublicHoroscopeSnapshot(value: PublicHoroscopeSnapshot) {
  const bounds = publicHoroscopeBounds(value.startDate, value.period);
  const first = Date.parse(bounds.startDate + "T00:00:00.000Z");
  const end = Date.parse(bounds.endDateExclusive + "T00:00:00.000Z");
  assertOrigin(value.provenance, first);
  if (
    value.version !== PUBLIC_HOROSCOPE_VERSION ||
    value.startDate !== bounds.startDate ||
    value.endDateExclusive !== bounds.endDateExclusive ||
    value.timezone !== "UTC" ||
    value.stepHours !== 6 ||
    value.engine !== "caelus" ||
    value.engineVersion !== "0.24.1" ||
    value.license !== "MIT" ||
    value.bodies.join("|") !== bodies.join("|") ||
    JSON.stringify(value.aspectPolicy) !== JSON.stringify(policy) ||
    value.pairsEvaluatedPerSample !== 45 ||
    value.selectionVersion !== "atv-public-sky-relevance/1.0.0" ||
    JSON.stringify(value.limits) !== JSON.stringify(limits) ||
    !Array.isArray(value.rows) ||
    value.rows.length !== (end - first) / step ||
    value.rows.some(
      (row, i) =>
        !Array.isArray(row) ||
        row.length !== 12 ||
        row[0] !== first + i * step ||
        row
          .slice(1, 11)
          .some((n) => !Number.isFinite(n) || n < 0 || n >= 360) ||
        !Number.isInteger(row[11]) ||
        row[11]! < 0 ||
        row[11]! > 1023,
    )
  )
    throw Error("Grade ou contrato público divergente.");
  const expected = project(value.rows);
  if (
    JSON.stringify(value.candidates) !== JSON.stringify(expected.candidates) ||
    JSON.stringify(value.selectedIds) !== JSON.stringify(expected.selectedIds)
  )
    throw Error("Movimentos públicos não correspondem às observações.");
}
