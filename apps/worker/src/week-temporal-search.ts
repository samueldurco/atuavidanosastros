import {
  bodies,
  calculateCrossAspects,
  type AspectPolicy,
  type AspectPosition,
  type CelestialBody,
  type MajorAspect,
} from "@atv/astrology";
import { validDate } from "@atv/domain";
import { weekSampleDates } from "./week-reading-projection.ts";

const hour = 3_600_000;
const angles: Record<MajorAspect, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};
export const weekTemporalSearchContract = Object.freeze({
  version: "atv-week-temporal-search/1.0.0",
  status: "experimental",
  period: "seven-UTC-days/closed-observation-endpoint/not-local-days",
  gridStepMilliseconds: hour,
  gridSamples: 169,
  crossingBracketMilliseconds: 60_000,
  maxEvaluations: 2048,
  maxEvents: 4096,
  maxWindows: 2048,
  geometry: "nominal-tropical-longitude-difference/no-common-epoch-transform",
  phase: "shortest-arc-unwrapping-per-hour/no-certified-speed-bound",
  coverage: "sampled-and-bracketed/not-certified-complete",
  windows: "grid-connected-candidates/not-certified-continuous-intervals",
  missedEvents:
    "intra-cell-reversals/tangencies/multiple-turns/sub-grid-excursions",
  precision: "not-certified",
  aspectStability: "unknown-accuracy",
  motion: "not-evaluated",
  policyApproval: "not-established",
  interpretation: "not-produced",
});

interface Observation {
  utcInstant: string;
  positions: AspectPosition[];
}
export interface WeekTemporalEvent {
  id: string;
  transitBody: CelestialBody;
  natalBody: CelestialBody;
  aspect: MajorAspect;
  threshold: "exact" | "lower-orb" | "upper-orb";
  mode: "bracketed-crossing" | "grid-contact-run";
  from: string;
  to: string;
  separationDegrees: [number, number];
  /** Signed phase change across a bracket; never applying/separating motion. */
  phaseDirection: "increasing" | "decreasing" | "not-established";
  gridContactCount: number;
}
export interface WeekCandidateWindow {
  transitBody: CelestialBody;
  natalBody: CelestialBody;
  aspect: MajorAspect;
  from: string;
  to: string;
  startClipped: boolean;
  endClipped: boolean;
}
export interface WeekTemporalSearch {
  contract: typeof weekTemporalSearchContract;
  start: string;
  end: string;
  policy: AspectPolicy;
  natalPositions: AspectPosition[];
  observations: Observation[];
  events: WeekTemporalEvent[];
  windows: WeekCandidateWindow[];
}

// Read descriptors before either the aspect calculator or a clone can hide metadata.
function exactRecord(
  value: unknown,
  keys: string[],
): value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    return false;
  const own = Reflect.ownKeys(value);
  return (
    own.length === keys.length &&
    keys.every((key) => {
      const d = Object.getOwnPropertyDescriptor(value, key);
      return !!d?.enumerable && Object.hasOwn(d, "value");
    })
  );
}
function dense(value: unknown): value is unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
    return false;
  const own = Reflect.ownKeys(value);
  return (
    own.length === value.length + 1 &&
    Array.from({ length: value.length }, (_, i) => {
      const d = Object.getOwnPropertyDescriptor(value, String(i));
      return !!d?.enumerable && Object.hasOwn(d, "value");
    }).every(Boolean)
  );
}
function capturePolicy(value: AspectPolicy): AspectPolicy {
  if (
    !exactRecord(value, ["id", "version", "aspects"]) ||
    !dense(value.aspects) ||
    !value.aspects.every((rule) => exactRecord(rule, ["kind", "orbDegrees"]))
  )
    throw new Error("invalid_week_temporal_policy");
  return calculateCrossAspects([], [], value).policy;
}
function capturePositions(
  value: readonly AspectPosition[],
  policy: AspectPolicy,
): AspectPosition[] {
  if (
    !dense(value) ||
    value.length !== bodies.length ||
    !value.every((position) => exactRecord(position, ["body", "longitude"]))
  )
    throw new Error("invalid_week_temporal_positions");
  return [...calculateCrossAspects(value, [], policy).inputPositions.first];
}
const iso = (time: number) => new Date(time).toISOString();
const phase = (transit: number, natal: number) => (transit - natal + 360) % 360;
const step = (next: number, previous: number) =>
  ((next - previous + 540) % 360) - 180;
const separation = (p: number) => Math.min(p, 360 - p);

/** Product-specific, bounded nominal search. The caller retains chart provenance separately.
 * This does not produce a CalculationSnapshot or register/approve the product runtime. */
export async function searchWeekTransits(
  startDate: string,
  natalPositions: readonly AspectPosition[],
  policy: AspectPolicy,
  evaluate: (utcInstant: string) => Promise<readonly AspectPosition[]>,
  signal: AbortSignal,
): Promise<WeekTemporalSearch> {
  signal.throwIfAborted();
  const dates = weekSampleDates(startDate);
  const start = Date.parse(`${dates[0]}T00:00:00.000Z`);
  const end = start + 168 * hour;
  if (!validDate(iso(end).slice(0, 10)))
    throw new Error("invalid_week_temporal_range");
  const capturedPolicy = capturePolicy(policy);
  const natal = capturePositions(natalPositions, capturedPolicy);
  const cache = new Map<number, Observation>();
  const sample = async (time: number): Promise<Observation> => {
    signal.throwIfAborted();
    const cached = cache.get(time);
    if (cached) return cached;
    if (cache.size >= weekTemporalSearchContract.maxEvaluations)
      throw new Error("week_temporal_evaluation_limit");
    const positions = capturePositions(
      await evaluate(iso(time)),
      capturedPolicy,
    );
    signal.throwIfAborted();
    const observation = { utcInstant: iso(time), positions };
    cache.set(time, observation);
    return observation;
  };
  const grid: Observation[] = [];
  for (let i = 0; i <= 168; i++) grid.push(await sample(start + i * hour));
  const events: WeekTemporalEvent[] = [];
  const windows: WeekCandidateWindow[] = [];
  const addEvent = (event: Omit<WeekTemporalEvent, "id">) => {
    if (events.length >= weekTemporalSearchContract.maxEvents)
      throw new Error("week_temporal_event_limit");
    const full = { ...event, id: `event-${events.length + 1}` };
    events.push(full);
    return full;
  };
  for (let transitIndex = 0; transitIndex < bodies.length; transitIndex++) {
    for (let natalIndex = 0; natalIndex < bodies.length; natalIndex++) {
      const transitBody = bodies[transitIndex]!,
        natalBody = bodies[natalIndex]!;
      const natalLongitude = natal[natalIndex]!.longitude;
      const phaseAt = (observation: Observation) =>
        phase(observation.positions[transitIndex]!.longitude, natalLongitude);
      const phases = grid.map(phaseAt);
      const separations = phases.map(separation);
      for (const rule of capturedPolicy.aspects) {
        signal.throwIfAborted();
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
          // Consecutive exact grid observations are a contact run, never a continuous root bracket.
          for (let i = 0; i < grid.length; i++) {
            if (separations[i] !== threshold.degrees) continue;
            let last = i;
            while (
              last + 1 < grid.length &&
              separations[last + 1] === threshold.degrees
            )
              last++;
            addEvent({
              transitBody,
              natalBody,
              aspect: rule.kind,
              threshold: threshold.kind,
              mode: "grid-contact-run",
              from: grid[i]!.utcInstant,
              to: grid[last]!.utcInstant,
              separationDegrees: [separations[i]!, separations[last]!],
              phaseDirection: "not-established",
              gridContactCount: last - i + 1,
            });
            i = last;
          }
          const targets =
            threshold.degrees === 0 || threshold.degrees === 180
              ? [threshold.degrees]
              : [threshold.degrees, 360 - threshold.degrees];
          for (let cell = 0; cell < 168; cell++) {
            const p0 = phases[cell]!,
              p1 = p0 + step(phases[cell + 1]!, p0);
            for (const target of targets) {
              const minTurn = Math.floor((Math.min(p0, p1) - target) / 360);
              const maxTurn = Math.ceil((Math.max(p0, p1) - target) / 360);
              for (let turn = minTurn; turn <= maxTurn; turn++) {
                const unwrappedTarget = target + turn * 360;
                let left = start + cell * hour,
                  right = left + hour;
                let fLeft = p0 - unwrappedTarget,
                  fRight = p1 - unwrappedTarget;
                // Endpoint equality is already recorded as a grid contact, with no duplicate root.
                if (fLeft * fRight >= 0) continue;
                const direction = fLeft < fRight ? "increasing" : "decreasing";
                while (
                  right - left >
                  weekTemporalSearchContract.crossingBracketMilliseconds
                ) {
                  const middle = Math.floor((left + right) / 2);
                  const midPhase = phaseAt(await sample(middle));
                  const fMiddle = p0 + step(midPhase, p0) - unwrappedTarget;
                  if (fMiddle === 0) {
                    left = middle;
                    right = middle;
                    break;
                  }
                  if (fLeft * fMiddle < 0) {
                    right = middle;
                    fRight = fMiddle;
                  } else {
                    left = middle;
                    fLeft = fMiddle;
                  }
                }
                const a = await sample(left),
                  b = await sample(right);
                addEvent({
                  transitBody,
                  natalBody,
                  aspect: rule.kind,
                  threshold: threshold.kind,
                  mode: "bracketed-crossing",
                  from: a.utcInstant,
                  to: b.utcInstant,
                  separationDegrees: [
                    separation(phaseAt(a)),
                    separation(phaseAt(b)),
                  ],
                  phaseDirection: direction,
                  gridContactCount: 0,
                });
                if (threshold.kind !== "exact")
                  boundaryCells[cell]!.push(left, right);
              }
            }
          }
        }
        if (rule.orbDegrees === 0) continue; // Zero-orb observations cannot establish a positive-duration interval.
        const candidates: { from: number; to: number }[] = [];
        for (let cell = 0; cell < 168; cell++) {
          const points = [...boundaryCells[cell]!];
          if (separations[cell]! >= lower && separations[cell]! <= upper)
            points.push(start + cell * hour);
          if (
            separations[cell + 1]! >= lower &&
            separations[cell + 1]! <= upper
          )
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
          if (windows.length >= weekTemporalSearchContract.maxWindows)
            throw new Error("week_temporal_window_limit");
          windows.push({
            transitBody,
            natalBody,
            aspect: rule.kind,
            from: iso(candidate.from),
            to: iso(candidate.to),
            startClipped: candidate.from === start,
            endClipped: candidate.to === end,
          });
        }
      }
    }
  }
  signal.throwIfAborted();
  return {
    contract: weekTemporalSearchContract,
    start: iso(start),
    end: iso(end),
    policy: capturedPolicy,
    natalPositions: natal,
    observations: [...cache.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, v]) => v),
    events,
    windows,
  };
}
