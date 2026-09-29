import {
  bodies,
  calculateCrossAspects,
  engineContract,
  validateCalculationInput,
  type AspectPolicy,
  type AspectPosition,
  type NatalChart,
} from "@atv/astrology";
import type { CalculationSnapshot } from "@atv/domain";
import { validWeekContext } from "./week-reading-projection.ts";
import {
  weekTemporalSearchContract,
  type WeekCandidateWindow,
  type WeekTemporalEvent,
  type WeekTemporalSearch,
} from "./week-temporal-search.ts";

const hour = 3_600_000;
const day = 86_400_000;
const angles = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
} as const;
const iso = (millis: number) => new Date(millis).toISOString();
const phase = (transit: number, natal: number) => (transit - natal + 360) % 360;
const step = (next: number, previous: number) =>
  ((next - previous + 540) % 360) - 180;
const separation = (p: number) => Math.min(p, 360 - p);
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

export const weekTemporalProductContract = Object.freeze({
  version: "atv-week-reading-calculation/1.2.0",
  productId: "week-reading",
  completeness: "partial",
  status: "experimental",
  searchContract: weekTemporalSearchContract.version,
  encoding:
    "shared-provenance/169-grid-samples/final-crossing-bracket-endpoints",
  coverage: "sampled-and-bracketed/not-certified-complete",
  windows: "grid-connected-candidates/not-certified-continuous-intervals",
  accuracy: "not-certified",
  policyApproval: "not-established",
  interpretation: "not-produced",
  calendar: "not-produced",
  reminders: "not-produced",
});

export const weekTemporalLimits = Object.freeze([
  "Semana: busca nominal experimental de sete dias UTC; grade horária e brackets de até 60 s não certificam cobertura contínua, precisão do motor ou estabilidade de aspectos.",
  "Reversões, tangências, múltiplas voltas e excursões entre amostras podem ser perdidas. Janelas são candidatas por células conectadas, não períodos favoráveis verificados.",
  "Trânsito e natal usam épocas tropicais próprias, sem transformação comum. Política, interpretação e liberação não estão aprovadas; fuso e contexto declarados não alteram a geometria.",
  "A trilha completa de bisseção fica na evidência local. O snapshot conserva a grade e somente os extremos finais observados, com proveniência compartilhada e campos temporais próprios.",
]);

type SourceRow = [number, number[], string, number];
type StoredObservation = { utcInstant: string; positions: AspectPosition[] };
type SourceCommon = Omit<NatalChart["provenance"], "calculatedAt" | "temporal">;

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
    (Object.getPrototypeOf(value) !== Array.prototype ||
      keys.length !== value.length + 1)
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
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (record(value))
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
const same = (a: unknown, b: unknown) =>
  JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function common(provenance: NatalChart["provenance"]): SourceCommon {
  const {
    calculatedAt: _calculatedAt,
    temporal: _temporal,
    ...rest
  } = provenance;
  return structuredClone(rest);
}
function validSourceCommon(source: unknown): source is SourceCommon {
  if (
    !record(source) ||
    source.zodiac !== "tropical" ||
    source.houseSystem !== "placidus" ||
    source.referenceFrame !== "geocentric-apparent-ecliptic-of-date" ||
    source.accuracyStatus !== "experimental" ||
    !same(source.contract, engineContract) ||
    !Array.isArray(source.warnings) ||
    typeof source.provider !== "string" ||
    !source.provider ||
    typeof source.providerVersion !== "string" ||
    !source.providerVersion ||
    typeof source.algorithmVersion !== "string" ||
    !source.algorithmVersion ||
    !record(source.dataManifest)
  )
    return false;
  return true;
}
function validNatal(
  natal: unknown,
  source: SourceCommon,
): natal is {
  input: NatalChart["input"];
  positions: NatalChart["positions"];
  provenance: NatalChart["provenance"];
} {
  if (
    !record(natal) ||
    !record(natal.provenance) ||
    !Array.isArray(natal.positions) ||
    natal.positions.length !== 10 ||
    !same(
      common(natal.provenance as unknown as NatalChart["provenance"]),
      source,
    )
  )
    return false;
  try {
    validateCalculationInput(natal.input as NatalChart["input"]);
    const p = natal.provenance as unknown as NatalChart["provenance"];
    if (
      p.temporal.utcInstant !==
        iso(Date.parse((natal.input as NatalChart["input"]).utcInstant)) ||
      p.temporal.julianDayUt1Approx !==
        Date.parse(p.temporal.utcInstant) / day + 2440587.5 ||
      p.temporal.dut1Seconds !== null ||
      p.temporal.inputScale !== "UTC" ||
      p.temporal.engineScale !== "UT1-approximated-by-UTC" ||
      !Number.isFinite(p.temporal.deltaTSeconds) ||
      p.temporal.deltaTSeconds <= 0 ||
      iso(Date.parse(p.calculatedAt)) !== p.calculatedAt ||
      p.contract.productionPromotion !== false ||
      p.contract.accuracy !== "experimental-sampled"
    )
      return false;
    const positions = natal.positions as NatalChart["positions"];
    if (
      !bodies.every(
        (body, i) =>
          positions[i]?.body === body &&
          Number.isFinite(positions[i]?.longitude) &&
          positions[i]!.longitude >= 0 &&
          positions[i]!.longitude < 360 &&
          Number.isFinite(positions[i]?.latitude) &&
          Math.abs(positions[i]!.latitude) <= 90 &&
          Number.isFinite(positions[i]?.distanceAu) &&
          positions[i]!.distanceAu > 0 &&
          typeof positions[i]?.retrograde === "boolean",
      )
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

function decodedRows(
  start: number,
  rows: unknown,
): { observations: Map<number, StoredObservation>; rowTimes: number[] } | null {
  if (
    !Array.isArray(rows) ||
    rows.length < 169 ||
    rows.length > 169 + 2 * weekTemporalSearchContract.maxEvents
  )
    return null;
  const observations = new Map<number, StoredObservation>();
  let previous = -1;
  for (const row of rows) {
    if (
      !Array.isArray(row) ||
      row.length !== 4 ||
      !Number.isInteger(row[0]) ||
      row[0] < 0 ||
      row[0] > 7 * day ||
      row[0] <= previous ||
      !Array.isArray(row[1]) ||
      row[1].length !== 10 ||
      !row[1].every(
        (n: unknown) =>
          typeof n === "number" && Number.isFinite(n) && n >= 0 && n < 360,
      ) ||
      typeof row[2] !== "string" ||
      iso(Date.parse(row[2])) !== row[2] ||
      typeof row[3] !== "number" ||
      !Number.isFinite(row[3])
    )
      return null;
    previous = row[0];
    const time = start + row[0];
    observations.set(time, {
      utcInstant: iso(time),
      positions: bodies.map((body, i) => ({ body, longitude: row[1][i] })),
    });
  }
  for (let i = 0; i <= 168; i++)
    if (!observations.has(start + i * hour)) return null;
  return { observations, rowTimes: [...observations.keys()] };
}

function verifyEventsAndWindows(
  start: number,
  policy: AspectPolicy,
  natal: readonly AspectPosition[],
  observations: Map<number, StoredObservation>,
  events: readonly WeekTemporalEvent[],
  windows: readonly WeekCandidateWindow[],
): boolean {
  if (
    events.length > weekTemporalSearchContract.maxEvents ||
    windows.length > weekTemporalSearchContract.maxWindows
  )
    return false;
  const grid = Array.from({ length: 169 }, (_, i) =>
    observations.get(start + i * hour)!,
  );
  const used = new Set<number>(grid.map((_, i) => start + i * hour));
  let eventIndex = 0,
    windowIndex = 0;
  const consume = (expected: Omit<WeekTemporalEvent, "id">) => {
    const full = { ...expected, id: `event-${++eventIndex}` };
    return same(events[eventIndex - 1], full);
  };
  for (let t = 0; t < 10; t++)
    for (let n = 0; n < 10; n++) {
      const transitBody = bodies[t]!,
        natalBody = bodies[n]!,
        natalLongitude = natal[n]!.longitude;
      const p = grid.map((o) =>
        phase(o.positions[t]!.longitude, natalLongitude),
      );
      const s = p.map(separation);
      for (const rule of policy.aspects) {
        const angle = angles[rule.kind],
          lower = Math.max(0, angle - rule.orbDegrees),
          upper = Math.min(180, angle + rule.orbDegrees);
        const thresholds: {
          kind: WeekTemporalEvent["threshold"];
          degrees: number;
        }[] = [{ kind: "exact", degrees: angle }];
        if (rule.orbDegrees > 0 && lower > 0)
          thresholds.push({ kind: "lower-orb", degrees: lower });
        if (rule.orbDegrees > 0 && upper < 180)
          thresholds.push({ kind: "upper-orb", degrees: upper });
        const boundaryCells = Array.from({ length: 168 }, () => [] as number[]);
        for (const threshold of thresholds) {
          for (let i = 0; i < 169; i++) {
            if (s[i] !== threshold.degrees) continue;
            let last = i;
            while (last + 1 < 169 && s[last + 1] === threshold.degrees) last++;
            if (
              !consume({
                transitBody,
                natalBody,
                aspect: rule.kind,
                threshold: threshold.kind,
                mode: "grid-contact-run",
                from: grid[i]!.utcInstant,
                to: grid[last]!.utcInstant,
                separationDegrees: [s[i]!, s[last]!],
                phaseDirection: "not-established",
                gridContactCount: last - i + 1,
              })
            )
              return false;
            i = last;
          }
          const targets =
            threshold.degrees === 0 || threshold.degrees === 180
              ? [threshold.degrees]
              : [threshold.degrees, 360 - threshold.degrees];
          for (let cell = 0; cell < 168; cell++) {
            const p0 = p[cell]!,
              p1 = p0 + step(p[cell + 1]!, p0);
            for (const target of targets) {
              const minTurn = Math.floor((Math.min(p0, p1) - target) / 360);
              const maxTurn = Math.ceil((Math.max(p0, p1) - target) / 360);
              for (let turn = minTurn; turn <= maxTurn; turn++) {
                const root = target + turn * 360,
                  f0 = p0 - root,
                  f1 = p1 - root;
                if (f0 * f1 >= 0) continue;
                const observed = events[eventIndex];
                if (!observed || observed.mode !== "bracketed-crossing")
                  return false;
                const from = Date.parse(observed.from),
                  to = Date.parse(observed.to);
                if (
                  !Number.isInteger(from) ||
                  !Number.isInteger(to) ||
                  from < start + cell * hour ||
                  to > start + (cell + 1) * hour ||
                  from > to ||
                  to - from >
                    weekTemporalSearchContract.crossingBracketMilliseconds
                )
                  return false;
                const left = observations.get(from),
                  right = observations.get(to);
                if (!left || !right) return false;
                const lp = phase(left.positions[t]!.longitude, natalLongitude);
                const rp = phase(right.positions[t]!.longitude, natalLongitude);
                const fl = p0 + step(lp, p0) - root,
                  fr = p0 + step(rp, p0) - root;
                if (
                  from === to
                    ? fl !== 0 || fr !== 0
                    : fl * fr > 0 || (fl === 0 && fr === 0)
                )
                  return false;
                if (
                  !consume({
                    transitBody,
                    natalBody,
                    aspect: rule.kind,
                    threshold: threshold.kind,
                    mode: "bracketed-crossing",
                    from: left.utcInstant,
                    to: right.utcInstant,
                    separationDegrees: [separation(lp), separation(rp)],
                    phaseDirection: f0 < f1 ? "increasing" : "decreasing",
                    gridContactCount: 0,
                  })
                )
                  return false;
                used.add(from);
                used.add(to);
                if (threshold.kind !== "exact")
                  boundaryCells[cell]!.push(from, to);
              }
            }
          }
        }
        if (rule.orbDegrees === 0) continue;
        const candidates: { from: number; to: number }[] = [];
        for (let cell = 0; cell < 168; cell++) {
          const points = [...boundaryCells[cell]!];
          if (s[cell]! >= lower && s[cell]! <= upper)
            points.push(start + cell * hour);
          if (s[cell + 1]! >= lower && s[cell + 1]! <= upper)
            points.push(start + (cell + 1) * hour);
          if (!points.length) continue;
          const from = Math.min(...points),
            to = Math.max(...points);
          if (from === to) continue;
          const previous = candidates.at(-1);
          if (previous && from <= previous.to)
            previous.to = Math.max(previous.to, to);
          else candidates.push({ from, to });
        }
        for (const candidate of candidates) {
          if (
            !same(windows[windowIndex++], {
              transitBody,
              natalBody,
              aspect: rule.kind,
              from: iso(candidate.from),
              to: iso(candidate.to),
              startClipped: candidate.from === start,
              endClipped: candidate.to === start + 7 * day,
            })
          )
            return false;
        }
      }
    }
  return (
    eventIndex === events.length &&
    windowIndex === windows.length &&
    used.size === observations.size
  );
}

interface ProjectionData {
  productId: "week-reading";
  projection: typeof weekTemporalProductContract;
  startDate: string;
  endInstant: string;
  declaredContext: string | null;
  policy: AspectPolicy;
  natalBasis: {
    input: NatalChart["input"];
    positions: NatalChart["positions"];
    provenance: NatalChart["provenance"];
  };
  sourceCommon: SourceCommon;
  rows: SourceRow[];
  events: WeekTemporalEvent[];
  windows: WeekCandidateWindow[];
}

function makeSnapshot(data: ProjectionData): CalculationSnapshot {
  const source = `${data.sourceCommon.algorithmVersion};${weekTemporalProductContract.version}`;
  const facts: CalculationSnapshot["facts"] = [
    {
      id: "week-temporal-summary",
      kind: "calculated",
      display: `Busca experimental ${data.startDate}: ${data.events.length} contatos/cruzamentos nominais e ${data.windows.length} janelas candidatas em sete dias UTC. Grade horária; política explícita ${data.policy.id}@${data.policy.version}. Cobertura e precisão não certificadas.`,
      source,
    },
  ];
  for (const transitBody of bodies) {
    const eventCount = data.events.filter(
      (event) => event.transitBody === transitBody,
    ).length;
    const windowCount = data.windows.filter(
      (window) => window.transitBody === transitBody,
    ).length;
    facts.push({
      id: `week-temporal-${transitBody}`,
      kind: "calculated",
      display: `${transitBody}: ${eventCount} contatos/cruzamentos nominais; ${windowCount} janelas candidatas. Sem classificação de favorabilidade, aplicação/separação ou completude contínua.`,
      source,
    });
  }
  return {
    version: weekTemporalProductContract.version,
    kind: "cycles",
    status: "experimental",
    facts,
    data: structuredClone(data) as unknown as Record<string, unknown>,
    limits: [
      ...new Set([
        ...data.natalBasis.provenance.warnings,
        ...data.sourceCommon.warnings,
      ]),
      ...weekTemporalLimits,
    ],
  };
}

function validTransitEvidence(
  chart: NatalChart,
  instant: string,
  source: SourceCommon,
): boolean {
  try {
    if (!jsonCompatible(chart) || !same(common(chart.provenance), source))
      return false;
    validateCalculationInput(chart.input);
    const p = chart.provenance,
      time = Date.parse(instant);
    if (
      chart.input.utcInstant !== instant ||
      p.temporal.utcInstant !== instant ||
      p.temporal.timezoneMode !== "fixed-offset" ||
      p.temporal.timezoneRules !== "explicit-offset/v1" ||
      p.temporal.offsetSeconds !== 0 ||
      p.temporal.dut1Seconds !== null ||
      p.temporal.inputScale !== "UTC" ||
      p.temporal.engineScale !== "UT1-approximated-by-UTC" ||
      p.temporal.julianDayUt1Approx !== time / day + 2440587.5 ||
      !Number.isFinite(p.temporal.deltaTSeconds) ||
      iso(Date.parse(p.calculatedAt)) !== p.calculatedAt ||
      chart.positions.length !== 10 ||
      !bodies.every(
        (body, i) =>
          chart.positions[i]?.body === body &&
          Number.isFinite(chart.positions[i]?.longitude) &&
          chart.positions[i]!.longitude >= 0 &&
          chart.positions[i]!.longitude < 360,
      )
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

/** Persist only the hourly grid and final observed bracket endpoints. Complete refinement stays in local evidence. */
export function projectWeekTemporalSearch(
  search: WeekTemporalSearch,
  natalChart: NatalChart,
  sourceCharts: ReadonlyMap<string, NatalChart>,
  declaredContext?: string,
): CalculationSnapshot {
  if (
    !jsonCompatible(search) ||
    !jsonCompatible(natalChart) ||
    !same(search.contract, weekTemporalSearchContract) ||
    !validSourceCommon(common(natalChart.provenance)) ||
    (declaredContext !== undefined && !validWeekContext(declaredContext))
  )
    throw new Error("invalid_week_temporal_basis");
  const source = common(natalChart.provenance);
  if (
    !validNatal(
      {
        input: natalChart.input,
        positions: natalChart.positions,
        provenance: natalChart.provenance,
      },
      source,
    )
  )
    throw new Error("invalid_week_temporal_natal");
  const start = Date.parse(search.start);
  if (
    !Number.isFinite(start) ||
    search.start !== iso(start) ||
    search.end !== iso(start + 7 * day) ||
    start % day !== 0 ||
    sourceCharts.size !== search.observations.length
  )
    throw new Error("invalid_week_temporal_range");
  const natalPositions = natalChart.positions.map(({ body, longitude }) => ({
    body,
    longitude,
  }));
  if (!same(natalPositions, search.natalPositions))
    throw new Error("invalid_week_temporal_natal");
  const capturedPolicy = calculateCrossAspects([], [], search.policy).policy;
  if (!same(capturedPolicy, search.policy))
    throw new Error("invalid_week_temporal_policy");
  const required = new Set<string>();
  for (let i = 0; i <= 168; i++) required.add(iso(start + i * hour));
  for (const event of search.events) {
    required.add(event.from);
    required.add(event.to);
  }
  const rows: SourceRow[] = [];
  for (const observed of search.observations) {
    const chart = sourceCharts.get(observed.utcInstant);
    if (
      !chart ||
      !validTransitEvidence(chart, observed.utcInstant, source) ||
      !same(
        chart.positions.map(({ body, longitude }) => ({ body, longitude })),
        observed.positions,
      )
    )
      throw new Error("invalid_week_temporal_source");
    if (!required.has(observed.utcInstant)) continue;
    rows.push([
      Date.parse(observed.utcInstant) - start,
      chart.positions.map((position) => position.longitude),
      chart.provenance.calculatedAt,
      chart.provenance.temporal.deltaTSeconds,
    ]);
  }
  rows.sort((a, b) => a[0] - b[0]);
  const data: ProjectionData = {
    productId: "week-reading",
    projection: weekTemporalProductContract,
    startDate: iso(start).slice(0, 10),
    endInstant: search.end,
    declaredContext: declaredContext ?? null,
    policy: capturedPolicy,
    natalBasis: structuredClone({
      input: natalChart.input,
      positions: natalChart.positions,
      provenance: natalChart.provenance,
    }),
    sourceCommon: source,
    rows,
    events: structuredClone(search.events),
    windows: structuredClone(search.windows),
  };
  const snapshot = makeSnapshot(data);
  if (new TextEncoder().encode(JSON.stringify(snapshot)).length > 200_000)
    throw new Error("week_temporal_snapshot_limit");
  if (!validWeekTemporalProjection(snapshot))
    throw new Error("invalid_week_temporal_projection");
  return snapshot;
}

/** Verifies fixed-grid contacts, every grid-implied crossing and final observed sign bracket, then rederives windows. */
export function validWeekTemporalProjection(
  value: unknown,
): value is CalculationSnapshot {
  try {
    if (!jsonCompatible(value) || !record(value) || !record(value.data))
      return false;
    const data = value.data;
    if (
      data.productId !== "week-reading" ||
      !same(data.projection, weekTemporalProductContract) ||
      typeof data.startDate !== "string" ||
      typeof data.endInstant !== "string" ||
      !(
        data.declaredContext === null || validWeekContext(data.declaredContext)
      ) ||
      !validSourceCommon(data.sourceCommon) ||
      !record(data.policy) ||
      !Array.isArray(data.events) ||
      !Array.isArray(data.windows) ||
      !validNatal(data.natalBasis, data.sourceCommon as SourceCommon)
    )
      return false;
    const start = Date.parse(`${data.startDate}T00:00:00.000Z`);
    if (
      !Number.isFinite(start) ||
      iso(start).slice(0, 10) !== data.startDate ||
      data.endInstant !== iso(start + 7 * day)
    )
      return false;
    const decoded = decodedRows(start, data.rows);
    if (!decoded) return false;
    const natal = data.natalBasis as ProjectionData["natalBasis"];
    const policy = calculateCrossAspects(
      [],
      [],
      data.policy as unknown as AspectPolicy,
    ).policy;
    if (!same(policy, data.policy)) return false;
    const natalPositions = natal.positions.map(({ body, longitude }) => ({
      body,
      longitude,
    }));
    if (
      !verifyEventsAndWindows(
        start,
        policy,
        natalPositions,
        decoded.observations,
        data.events as WeekTemporalEvent[],
        data.windows as WeekCandidateWindow[],
      )
    )
      return false;
    const rows = data.rows as SourceRow[];
    if (!rows.every((row) => row[2] && row[3] > 0)) return false;
    const canonicalData: ProjectionData = {
      productId: "week-reading",
      projection: weekTemporalProductContract,
      startDate: data.startDate,
      endInstant: data.endInstant,
      declaredContext: data.declaredContext as string | null,
      policy,
      natalBasis: natal,
      sourceCommon: data.sourceCommon as SourceCommon,
      rows,
      events: data.events as WeekTemporalEvent[],
      windows: data.windows as WeekCandidateWindow[],
    };
    return (
      same(value, makeSnapshot(canonicalData)) &&
      new TextEncoder().encode(JSON.stringify(value)).length <= 200_000
    );
  } catch {
    return false;
  }
}
