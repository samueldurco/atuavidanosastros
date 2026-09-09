import { bodies, type CelestialBody } from './bodies.ts';

const targets = Object.freeze({ conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 });
export type MajorAspect = keyof typeof targets;
export interface AspectPosition { readonly body: CelestialBody; readonly longitude: number }
export interface AspectPolicy {
  readonly id: string;
  readonly version: string;
  readonly aspects: readonly { readonly kind: MajorAspect; readonly orbDegrees: number }[];
}
export interface AspectResult {
  readonly first: CelestialBody;
  readonly second: CelestialBody;
  readonly kind: MajorAspect;
  readonly exactAngleDegrees: number;
  readonly separationDegrees: number;
  readonly orbDegrees: number;
}
export interface AspectCalculation {
  readonly algorithmVersion: 'atv-major-aspects/1';
  readonly coordinate: 'ecliptic-longitude';
  readonly motion: 'not-evaluated';
  readonly inputPrecision: 'not-certified';
  readonly inputPositions: readonly AspectPosition[];
  readonly policy: AspectPolicy;
  readonly pairsEvaluated: number;
  readonly aspects: readonly AspectResult[];
}

/** No editorial orb default: every caller supplies and retains its own versioned policy. */
export function calculateAspects(positions: readonly AspectPosition[], policy: AspectPolicy): AspectCalculation {
  if (!policy || ![policy.id, policy.version].every((value) => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,79}$/.test(value))) {
    throw new RangeError('A política de aspectos exige identificador e versão explícitos.');
  }
  if (!Array.isArray(policy.aspects) || policy.aspects.length === 0) throw new RangeError('A política precisa habilitar ao menos um aspecto.');
  const rules = Array.from(policy.aspects, (rule: AspectPolicy['aspects'][number]) => {
    if (!rule || typeof rule.kind !== 'string' || !Object.hasOwn(targets, rule.kind) || !Number.isFinite(rule.orbDegrees) || rule.orbDegrees < 0 || rule.orbDegrees > 180) {
      throw new RangeError('Aspecto ou orbe inválido.');
    }
    return { kind: rule.kind, orbDegrees: rule.orbDegrees };
  }).sort((a, b) => targets[a.kind] - targets[b.kind]);
  for (let i = 1; i < rules.length; i++) {
    const previous = rules[i - 1]!;
    const current = rules[i]!;
    if (Math.min(180, targets[previous.kind] + previous.orbDegrees) >= Math.max(0, targets[current.kind] - current.orbDegrees)) {
      throw new RangeError('A política contém aspectos duplicados ou intervalos de orbe sobrepostos.');
    }
  }
  if (!Array.isArray(positions)) throw new RangeError('Posições inválidas.');
  const longitudes = new Map<CelestialBody, number>();
  for (const position of positions) {
    if (!position || !bodies.includes(position.body) || !Number.isFinite(position.longitude) || position.longitude < 0 || position.longitude >= 360 || longitudes.has(position.body)) {
      throw new RangeError('Corpo duplicado/desconhecido ou longitude fora de [0, 360).');
    }
    longitudes.set(position.body, position.longitude);
  }
  const ordered = bodies.filter((body) => longitudes.has(body));
  const aspects: AspectResult[] = [];
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      const first = ordered[i]!;
      const second = ordered[j]!;
      const difference = Math.abs(longitudes.get(first)! - longitudes.get(second)!);
      const separationDegrees = Math.min(difference, 360 - difference);
      for (const rule of rules) {
        const exactAngleDegrees = targets[rule.kind];
        const orbDegrees = Math.abs(separationDegrees - exactAngleDegrees);
        if (orbDegrees <= rule.orbDegrees) aspects.push({ first, second, kind: rule.kind, exactAngleDegrees, separationDegrees, orbDegrees });
      }
    }
  }
  return {
    algorithmVersion: 'atv-major-aspects/1', coordinate: 'ecliptic-longitude', motion: 'not-evaluated',
    inputPrecision: 'not-certified', inputPositions: ordered.map((body) => ({ body, longitude: longitudes.get(body)! })),
    policy: { id: policy.id, version: policy.version, aspects: rules },
    pairsEvaluated: ordered.length > 1 ? ordered.length * (ordered.length - 1) / 2 : 0, aspects
  };
}

export interface AspectStability {
  readonly algorithmVersion: 'atv-aspect-stability/1';
  readonly calculation: AspectCalculation;
  readonly assumedLongitudeErrorDegrees: number | null;
  readonly numericalGuardDegrees: number;
  readonly pairs: readonly {
    first: CelestialBody; second: CelestialBody;
    separationIntervalDegrees: readonly [number, number] | null;
    status: 'stable-under-budget' | 'boundary-sensitive' | 'unknown-accuracy';
  }[];
}

/** A caller's error assumption is never promoted to a measured or guaranteed ephemeris bound. */
export function assessAspectStability(positions: readonly AspectPosition[], policy: AspectPolicy, assumedLongitudeErrorDegrees: number | null): AspectStability {
  if (assumedLongitudeErrorDegrees !== null && (!Number.isFinite(assumedLongitudeErrorDegrees) || assumedLongitudeErrorDegrees < 0 || assumedLongitudeErrorDegrees > 180)) throw new RangeError('Orçamento de erro deve ser nulo ou finito em [0, 180].');
  const calculation = calculateAspects(positions, policy);
  // Outward guard only for interval arithmetic. The nominal aspect comparator has no epsilon.
  const numericalGuardDegrees = 1e-12;
  const pairs: AspectStability['pairs'][number][] = [];
  const ordered = calculation.inputPositions;
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      const a = ordered[i]!;
      const b = ordered[j]!;
      if (assumedLongitudeErrorDegrees === null) {
        pairs.push({ first: a.body, second: b.body, separationIntervalDegrees: null, status: 'unknown-accuracy' });
        continue;
      }
      const difference = Math.abs(a.longitude - b.longitude);
      const separation = Math.min(difference, 360 - difference);
      const radius = 2 * assumedLongitudeErrorDegrees + numericalGuardDegrees;
      const low = Math.max(0, separation - radius);
      const high = Math.min(180, separation + radius);
      const intervals = calculation.policy.aspects.map((rule) => ({ low: Math.max(0, targets[rule.kind] - rule.orbDegrees), high: Math.min(180, targets[rule.kind] + rule.orbDegrees) }));
      const contained = intervals.some((rule) => low >= rule.low && high <= rule.high);
      const disjoint = intervals.every((rule) => high < rule.low || low > rule.high);
      pairs.push({ first: a.body, second: b.body, separationIntervalDegrees: [low, high], status: contained || disjoint ? 'stable-under-budget' : 'boundary-sensitive' });
    }
  }
  return { algorithmVersion: 'atv-aspect-stability/1', calculation, assumedLongitudeErrorDegrees, numericalGuardDegrees, pairs };
}
