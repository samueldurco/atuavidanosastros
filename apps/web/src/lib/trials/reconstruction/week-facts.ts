import { bodies, type AspectPolicy, type CelestialBody, type MajorAspect } from '@atv/astrology';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { inspectBirthChartProjection } from '../../../../../worker/src/natal-calculators';
import { validWeekTemporalProjection } from '../../../../../worker/src/week-temporal-projection';
import type {
	WeekCandidateWindow,
	WeekTemporalEvent
} from '../../../../../worker/src/week-temporal-search';
import { canonical } from '../reading';
import { bodyNames } from './canon';
import { aspectNames } from './date-facts';

export const WEEK_VERSION = 'atv-private-week-synthesis/4.0.0';
export const weekAspectPolicy: AspectPolicy = {
	id: 'atv-week-observed-major-aspects',
	version: '1.0.0',
	aspects: ['conjunction', 'sextile', 'square', 'trine', 'opposition'].map((kind) => ({
		kind: kind as MajorAspect,
		orbDegrees: 2
	}))
};
const hour = 3_600_000;
const angles: Record<MajorAspect, number> = {
	conjunction: 0,
	sextile: 60,
	square: 90,
	trine: 120,
	opposition: 180
};
export type WeekContact = {
	id: string;
	transit: CelestialBody;
	natal: CelestialBody;
	aspect: MajorAspect;
	firstObserved: string;
	lastObserved: string;
	minimumInstant: string;
	minOrb: number;
	maxOrb: number;
	orbAtStart: number;
	orbAtEnd: number;
	observedHours: number;
	eventIds: string[];
	windowIndices: number[];
	days: { date: string; minOrb: number; maxOrb: number; noonOrb: number; observedHours: number }[];
};
export type WeekDay = {
	date: string;
	sampleInstant: string;
	positions: { body: CelestialBody; longitude: number }[];
	contactIds: string[];
};
type TemporalData = {
	startDate: string;
	endInstant: string;
	declaredContext: string | null;
	policy: AspectPolicy;
	natalBasis: {
		input: WorkflowInput['birth'];
		positions: { body: CelestialBody; longitude: number }[];
		provenance: Record<string, unknown>;
	};
	rows: [number, number[], string, number][];
	events: WeekTemporalEvent[];
	windows: WeekCandidateWindow[];
};
const withoutTimestamp = (p: Record<string, unknown>) =>
	Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'calculatedAt'));
const orb = (a: number, b: number, angle: number) => {
	const d = Math.abs(a - b);
	return Math.abs(Math.min(d, 360 - d) - angle);
};

/** Derive seven noon views and observed changes from the preserved 169-hour search. */
export function projectWeekReading(
	input: WorkflowInput,
	base: CalculationSnapshot,
	natal: CalculationSnapshot
): CalculationSnapshot {
	if (
		input.productId !== 'week-reading' ||
		!validWeekTemporalProjection(base) ||
		!inspectBirthChartProjection(natal)
	)
		throw new Error('Base temporal da Semana inválida.');
	const b = base.data as unknown as TemporalData;
	if (
		b.startDate !== input.targetDate ||
		b.declaredContext !== (input.context ?? null) ||
		canonical(b.policy) !== canonical(weekAspectPolicy) ||
		canonical(b.natalBasis.input) !== canonical(input.birth) ||
		canonical(b.natalBasis.positions) !== canonical(natal.data.positions) ||
		canonical(withoutTimestamp(b.natalBasis.provenance)) !==
			canonical(withoutTimestamp(natal.data.provenance as Record<string, unknown>)) ||
		natal.facts.find((f) => f.id === 'personal-context')?.display !== input.context
	)
		throw new Error('Nascimento, política ou contexto da Semana divergente.');
	const start = Date.parse(b.startDate + 'T00:00:00.000Z');
	const grid = Array.from({ length: 169 }, (_, i) => {
		const row = b.rows.find((r) => r[0] === i * hour);
		if (!row) throw new Error('Grade horária da Semana incompleta.');
		return row;
	});
	const instant = (i: number) => new Date(start + i * hour).toISOString();
	const contacts: WeekContact[] = [];
	for (const [ti, transit] of bodies.entries())
		for (const [ni, receiver] of b.natalBasis.positions.entries())
			for (const policy of weekAspectPolicy.aspects) {
				const values = grid.map((r) => orb(r[1][ti], receiver.longitude, angles[policy.kind]));
				const active = values.flatMap((v, i) => (v <= policy.orbDegrees ? [i] : []));
				if (!active.length) continue;
				const minOrb = Math.min(...values),
					nearest = values.indexOf(minOrb);
				contacts.push({
					id: `week-contact-${ti}-${ni}-${policy.kind}`,
					transit,
					natal: receiver.body,
					aspect: policy.kind,
					firstObserved: instant(active[0]),
					lastObserved: instant(active.at(-1)!),
					minimumInstant: instant(nearest),
					minOrb,
					maxOrb: Math.max(...values),
					orbAtStart: values[0],
					orbAtEnd: values[168],
					observedHours: active.length,
					eventIds: b.events
						.filter(
							(e) =>
								e.transitBody === transit &&
								e.natalBody === receiver.body &&
								e.aspect === policy.kind
						)
						.map((e) => e.id),
					windowIndices: b.windows.flatMap((w, i) =>
						w.transitBody === transit && w.natalBody === receiver.body && w.aspect === policy.kind
							? [i]
							: []
					),
					days: Array.from({ length: 7 }, (_, i) => {
						const valuesInDay = values.slice(i * 24, (i + 1) * 24);
						return {
							date: instant(i * 24).slice(0, 10),
							minOrb: Math.min(...valuesInDay),
							maxOrb: Math.max(...valuesInDay),
							noonOrb: values[i * 24 + 12],
							observedHours: valuesInDay.filter((v) => v <= policy.orbDegrees).length
						};
					})
				});
			}
	const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => ({
		date: instant(i * 24).slice(0, 10),
		sampleInstant: instant(i * 24 + 12),
		positions: bodies.map((body, j) => ({ body, longitude: grid[i * 24 + 12][1][j] })),
		contactIds: contacts.filter((c) => c.days[i].noonOrb <= 2).map((c) => c.id)
	}));
	const source = `${weekAspectPolicy.id}@${weekAspectPolicy.version};atv-week-temporal-search/1.0.0;${WEEK_VERSION}`;
	return {
		version: WEEK_VERSION,
		kind: 'cycles',
		status: 'experimental',
		facts: [
			...natal.facts,
			...base.facts,
			{
				id: 'week-period',
				kind: 'calculated',
				display: `Sete datas UTC de ${days[0].date} a ${days[6].date}; observação de ${instant(0)} a ${b.endInstant}, com extremo de fechamento.`,
				source
			},
			...days.map((d, i) => ({
				id: `week-day-${i + 1}`,
				kind: 'calculated' as const,
				display: `${d.date}, amostra ${d.sampleInstant}; ${d.contactIds.length} contatos dentro do orbe de 2° ao meio-dia. Posições preservadas na grade.`,
				source
			})),
			...contacts.map((c) => ({
				id: c.id,
				kind: 'calculated' as const,
				display: `${bodyNames[c.transit]} em ${aspectNames[c.aspect]} com ${bodyNames[c.natal]} natal; ${c.observedHours}/169 pontos horários no orbe; mínimo observado ${c.minOrb.toFixed(6)}° em ${c.minimumInstant}; primeiro ${c.firstObserved}, último ${c.lastObserved}.`,
				source
			}))
		],
		data: {
			productId: input.productId,
			base,
			natal,
			contacts,
			days,
			period: {
				start: instant(0),
				endExclusive: b.endInstant,
				timezone: 'UTC',
				dates: days.map((d) => d.date)
			},
			events: b.events,
			windows: b.windows,
			positions: natal.data.positions,
			houses: natal.data.houses,
			angles: natal.data.angles,
			provenance: natal.data.provenance
		},
		limits: [
			...new Set([
				...base.limits.filter((l) => !l.startsWith('Trânsito e natal usam')),
				'Sete dias UTC com grade de 169 pontos horários e extremos de cruzamentos observados. As sete amostras de meio-dia não representam dias locais completos.',
				'Orbe editorial de até 2° nos cinco aspectos maiores; não é uma medida de precisão da efeméride. Mínimos e aproximações descrevem observações, sem certificar velocidade contínua ou exatidão astronômica.',
				'Trânsito e natal usam épocas tropicais próprias. Casas e ângulos são natais; o fuso atual declarado não substitui o natal nem muda a grade UTC.',
				'A leitura propõe hipóteses e escolhas, sem prometer acontecimentos, favorabilidade, calendário pessoal ou alertas. Contexto e tema orientam a seleção editorial, sem alterar o cálculo.'
			])
		]
	};
}

export function assertWeekProjection(input: WorkflowInput, calculation: CalculationSnapshot) {
	if (
		calculation.version !== WEEK_VERSION ||
		canonical(
			projectWeekReading(
				input,
				calculation.data.base as CalculationSnapshot,
				calculation.data.natal as CalculationSnapshot
			)
		) !== canonical(calculation)
	)
		throw new Error('Semana sem correspondência com a busca temporal preservada.');
}
