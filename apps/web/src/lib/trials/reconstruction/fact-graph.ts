import type { CalculationSnapshot } from '@atv/domain';
import { bodyNames, modernRulers, signs } from './canon';
export type Fact = Readonly<
	CalculationSnapshot['facts'][number] & {
		availability: 'available';
		confidence: 'calculated-candidate' | 'reported' | 'drawn';
		sourceScope: 'private-free-test';
	}
>;
export type Position = Readonly<{
	body: string;
	longitude: number;
	sign: number;
	house: number | null;
	retrograde: boolean;
	factId: string;
}>;
export type Aspect = Readonly<{
	first: string;
	second: string;
	kind: string;
	orb: number;
	factId: string;
}>;
export type FactGraph = Readonly<{
	version: string;
	facts: readonly Fact[];
	positions: readonly Position[];
	aspects: readonly Aspect[];
	mc: Readonly<{
		longitude: number;
		sign: number;
		ruler: string;
		factIds: readonly string[];
	}> | null;
	houses: readonly Readonly<{ house: number; longitude: number; sign: number; factId: string }>[];
	contextFactId: string | null;
	provenance: Readonly<{ sourceVersion: string; precision: string; scope: string }>;
}>;
const longitude = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 360;
const record = (value: unknown): Record<string, unknown> =>
	value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
/** Normalization reads calculator data; it never infers a chart from editorial prose. */
export function normalizeFactGraph(calculation: CalculationSnapshot): FactGraph {
	const ids = new Map(calculation.facts.map((f) => [f.id, f]));
	if (ids.size !== calculation.facts.length) throw new Error('Fatos duplicados.');
	const data = calculation.data;
	const houseData = record(data.houses);
	const cusps =
		houseData.status === 'ok' &&
		Array.isArray(houseData.cusps) &&
		houseData.cusps.length === 12 &&
		houseData.cusps.every(longitude)
			? (houseData.cusps as number[])
			: [];
	if (houseData.status === 'ok' && cusps.length !== 12)
		throw new Error('Casas declaradas disponíveis sem geometria válida.');
	const houses = cusps.flatMap((cusp, i) =>
		ids.has(`house-${i + 1}`)
			? [
					Object.freeze({
						house: i + 1,
						longitude: cusp,
						sign: Math.floor(cusp / 30),
						factId: `house-${i + 1}`
					})
				]
			: []
	);
	if (cusps.length && houses.length !== 12) throw new Error('Casas sem fatos correspondentes.');
	const houseAt = (value: number): number | null => {
		for (let i = 0; i < cusps.length; i++)
			if ((value - cusps[i] + 360) % 360 < (cusps[(i + 1) % 12] - cusps[i] + 360) % 360)
				return i + 1;
		return null;
	};
	const positions = (Array.isArray(data.positions) ? data.positions : [])
		.map(record)
		.flatMap((p) => {
			if (
				typeof p.body !== 'string' ||
				!Object.hasOwn(bodyNames, p.body) ||
				!longitude(p.longitude) ||
				!ids.has(`position-${p.body}`)
			)
				throw new Error('Posição sem geometria e fato válidos.');
			return [
				Object.freeze({
					body: p.body,
					longitude: p.longitude,
					sign: Math.floor(p.longitude / 30),
					house: houseAt(p.longitude),
					retrograde: p.retrograde === true,
					factId: `position-${p.body}`
				})
			];
		});
	if (new Set(positions.map((p) => p.body)).size !== positions.length)
		throw new Error('Posições duplicadas.');
	const sourceAspects = record(data.privateAspects).aspects;
	const aspects = (Array.isArray(sourceAspects) ? sourceAspects : [])
		.map(record)
		.flatMap((a, i) => {
			const factId = `private-natal-aspect-${i}`;
			if (
				typeof a.first !== 'string' ||
				typeof a.second !== 'string' ||
				a.first === a.second ||
				typeof a.kind !== 'string' ||
				!['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.kind) ||
				typeof a.orbDegrees !== 'number' ||
				!Number.isFinite(a.orbDegrees) ||
				a.orbDegrees < 0 ||
				a.orbDegrees > 10 ||
				!ids.has(factId) ||
				!positions.some((p) => p.body === a.first) ||
				!positions.some((p) => p.body === a.second)
			)
				throw new Error('Aspecto sem relação e fato válidos.');
			return [
				Object.freeze({ first: a.first, second: a.second, kind: a.kind, orb: a.orbDegrees, factId })
			];
		});
	const mcValue = record(data.angles).midheaven;
	const mc =
		longitude(mcValue) && ids.has('angle-midheaven')
			? Object.freeze({
					longitude: mcValue,
					sign: Math.floor(mcValue / 30),
					ruler: modernRulers[Math.floor(mcValue / 30)],
					factIds: Object.freeze([
						'angle-midheaven',
						...(ids.has('career-mc-ruler') ? ['career-mc-ruler'] : [])
					])
				})
			: null;
	// Reject disagreement between normalized positions and their textual fact, rather
	// than letting a forged display silently become an approved interpretation.
	const geometricFacts = [
		...positions.map((p) => ({ factId: p.factId, longitude: p.longitude, sign: p.sign })),
		...houses,
		...(mc ? [{ factId: 'angle-midheaven', longitude: mc.longitude, sign: mc.sign }] : [])
	];
	for (const p of geometricFacts) {
		const display = ids.get(p.factId)!.display;
		const degree = display.match(/:\s*([\d.]+)°/);
		if (
			!display.includes(signs[p.sign]) ||
			!degree ||
			Math.abs(Number(degree[1]) - (p.longitude % 30)) > 0.000001
		)
			throw new Error('Fato e posição discordam.');
	}
	const aspectAngles: Record<string, number> = {
		conjunction: 0,
		sextile: 60,
		square: 90,
		trine: 120,
		opposition: 180
	};
	for (const a of aspects) {
		const first = positions.find((p) => p.body === a.first)!,
			second = positions.find((p) => p.body === a.second)!;
		const distance = Math.abs(first.longitude - second.longitude);
		const actualOrb = Math.abs(Math.min(distance, 360 - distance) - aspectAngles[a.kind]);
		if (Math.abs(actualOrb - a.orb) > 1e-8) throw new Error('Aspecto e geometria discordam.');
	}
	if (
		mc &&
		ids.has('career-mc-ruler') &&
		ids.get('career-mc-ruler')!.display !== `Regente moderno do Meio do Céu: ${bodyNames[mc.ruler]}`
	)
		throw new Error('Regência e Meio do Céu discordam.');
	return Object.freeze({
		version: 'atv-normalized-fact-graph/1',
		facts: Object.freeze(
			calculation.facts.map((f) =>
				Object.freeze({
					...f,
					availability: 'available' as const,
					confidence: f.kind === 'calculated' ? ('calculated-candidate' as const) : f.kind,
					sourceScope: 'private-free-test' as const
				})
			)
		),
		positions: Object.freeze(positions),
		aspects: Object.freeze(aspects),
		mc,
		houses: Object.freeze(houses),
		contextFactId: ids.has('personal-context') ? 'personal-context' : null,
		provenance: Object.freeze({
			sourceVersion: calculation.version,
			precision: 'calculator-candidate-not-certified',
			scope: 'private-free-test'
		})
	});
}
