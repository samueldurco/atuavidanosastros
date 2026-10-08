import {
	bodies,
	type AspectPosition,
	type MajorAspect,
	type CalculationProvenance
} from '@atv/astrology';
import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { inspectBirthChartProjection } from '../../../../../worker/src/natal-calculators';
import { personalCalendarProductContract } from '../../../../../worker/src/personal-calendar-calculators';
import {
	assertCalendarSamples,
	type CalendarSamples
} from '../../../../../worker/src/personal-calendar-samples';
import { canonical } from '../reading';
import { bodyNames } from './canon';
import { aspectNames } from './date-facts';

export const CALENDAR_VERSION = 'atv-private-calendar-synthesis/4.0.0';
export const CALENDAR_POLICY = 'atv-calendar-observed-major-aspects/1.0.0';
const angles: Record<MajorAspect, number> = {
	conjunction: 0,
	sextile: 60,
	square: 90,
	trine: 120,
	opposition: 180
};
const step = 21_600_000;
const distance = (a: number, b: number, angle: number) => {
	const d = Math.abs(a - b);
	return Math.abs(Math.min(d, 360 - d) - angle);
};
export type CalendarWindow = {
	id: string;
	transit: string;
	natal: string;
	aspect: MajorAspect;
	firstInstant: string;
	lastInstant: string;
	minimumInstant: string;
	minOrb: number;
	observations: number;
	entireMonth: boolean;
	eventIds: string[];
};
export type CalendarEvent = {
	id: string;
	windowId: string;
	kind: 'entry' | 'peak' | 'exit';
	date: string;
	instant: string;
	orb: number;
};
export type CalendarDay = {
	date: string;
	startInstant: string;
	endInstantExclusive: string;
	sampleInstant: string;
	positions: AspectPosition[];
	eventIds: string[];
};
export type CalendarData = {
	base: CalculationSnapshot;
	natal: CalculationSnapshot;
	samples: CalendarSamples;
	days: CalendarDay[];
	windows: CalendarWindow[];
	events: CalendarEvent[];
	positions: AspectPosition[];
};
export function projectCalendarReading(
	input: WorkflowInput,
	base: CalculationSnapshot,
	natal: CalculationSnapshot,
	samples: CalendarSamples
): CalculationSnapshot {
	if (
		!parseWorkflowInput(input) ||
		input.productId !== 'personal-calendar' ||
		base.version !== personalCalendarProductContract.version ||
		base.data.productId !== 'personal-calendar' ||
		!inspectBirthChartProjection(natal)
	)
		throw Error('Base mensal ou natal inválida.');
	assertCalendarSamples(samples, input.targetDate!);
	const n = natal.data.positions as AspectPosition[],
		p = natal.data.provenance as CalculationProvenance;
	const dates = Array.from({ length: samples.rows.length / 4 }, (_, i) =>
		new Date(samples.rows[i * 4][0]).toISOString().slice(0, 10)
	);
	const shared = (v: CalculationProvenance) => ({
		provider: v.provider,
		providerVersion: v.providerVersion,
		algorithmVersion: v.algorithmVersion,
		zodiac: v.zodiac,
		referenceFrame: v.referenceFrame,
		dataManifest: v.dataManifest,
		contract: v.contract,
		accuracyStatus: v.accuracyStatus
	});
	if (
		canonical(shared(p)) !== canonical(shared(samples.provenance)) ||
		samples.provenance.providerVersion !== '0.24.1' ||
		canonical(base.data.natalInput) !== canonical(input.birth) ||
		Date.parse(p.temporal.utcInstant) !== Date.parse(input.birth!.utcInstant) ||
		base.data.natalSunLongitude !== n.find((x) => x.body === 'sun')?.longitude ||
		base.data.monthStart !== input.targetDate ||
		base.data.monthEndExclusive !== samples.endDateExclusive ||
		canonical(base.data.dates) !== canonical(dates) ||
		canonical(base.data.reportedMarks) !== canonical(input.calendarMarks?.entries ?? []) ||
		natal.facts.find((f) => f.id === 'personal-context')?.display !== input.context
	)
		throw Error('Origem, nascimento, mês ou relatos divergentes.');
	const windows: CalendarWindow[] = [],
		events: CalendarEvent[] = [],
		instant = (i: number) => new Date(samples.rows[i][0]).toISOString();
	for (const [ti, transit] of bodies.entries())
		for (const receiver of n)
			for (const [aspect, angle] of Object.entries(angles)) {
				const values = samples.rows.map((r) => distance(r[ti + 1], receiver.longitude, angle));
				const ranges: number[][] = [];
				for (let i = 0; i < values.length; i++)
					if (values[i] <= 2) {
						const last = ranges.at(-1);
						if (last && last.at(-1) === i - 1) last.push(i);
						else ranges.push([i]);
					}
				for (const [wi, range] of ranges.entries()) {
					const first = range[0],
						last = range.at(-1)!,
						minOrb = Math.min(...range.map((i) => values[i])),
						minimum = range.find((i) => values[i] === minOrb)!;
					const id = `calendar-window-${ti}-${receiver.body}-${aspect}-${wi}`,
						eventIds: string[] = [];
					const add = (kind: CalendarEvent['kind'], index: number) => {
						const eid = `${id}-${kind}`;
						eventIds.push(eid);
						events.push({
							id: eid,
							windowId: id,
							kind,
							date: instant(index).slice(0, 10),
							instant: instant(index),
							orb: values[index]
						});
					};
					if (first > 0) add('entry', first);
					if (
						minimum > 0 &&
						minimum < values.length - 1 &&
						values[minimum] < values[minimum - 1] &&
						values[minimum] < values[minimum + 1]
					)
						add('peak', minimum);
					// Exit marks the first observed sample outside the range, retaining the previous active sample.
					if (last < values.length - 1) add('exit', last + 1);
					windows.push({
						id,
						transit,
						natal: receiver.body,
						aspect: aspect as MajorAspect,
						firstInstant: instant(first),
						lastInstant: instant(last),
						minimumInstant: instant(minimum),
						minOrb,
						observations: range.length,
						entireMonth: first === 0 && last === values.length - 1,
						eventIds
					});
				}
			}
	events.sort((a, b) => a.instant.localeCompare(b.instant) || a.id.localeCompare(b.id));
	const days: CalendarDay[] = dates.map((date, i) => ({
		date,
		startInstant: instant(i * 4),
		endInstantExclusive: new Date(samples.rows[i * 4][0] + 4 * step).toISOString(),
		sampleInstant: instant(i * 4 + 2),
		positions: bodies.map((body, j) => ({ body, longitude: samples.rows[i * 4 + 2][j + 1] })),
		eventIds: events.filter((e) => e.date === date).map((e) => e.id)
	}));
	const source = `${samples.source};${CALENDAR_POLICY};orb<=2deg`,
		names = {
			entry: 'primeira observação dentro de 2°',
			peak: 'mínimo observado na grade',
			exit: 'primeira observação fora de 2°'
		};
	return {
		version: CALENDAR_VERSION,
		kind: 'cycles',
		status: 'experimental',
		facts: [
			...natal.facts,
			...base.facts.filter((f) => f.kind === 'reported' && f.id !== 'reported-context'),
			{
				id: 'calendar-period',
				kind: 'calculated',
				display: `Mês UTC: ${input.targetDate} até ${samples.endDateExclusive}, extremo excluído; ${days.length} dias, ${samples.rows.length} observações, espaçadas por seis horas.`,
				source
			},
			...days.flatMap((d) => [
				{
					id: `calendar-day-${d.date}`,
					kind: 'calculated' as const,
					display: `${d.date}: intervalo ${d.startInstant} até ${d.endInstantExclusive}, extremo excluído; observações 00h, 06h, 12h e 18h UTC.`,
					source
				},
				...d.positions.map((position) => ({
					id: `calendar-position-${d.date}-${position.body}`,
					kind: 'calculated' as const,
					display: `${d.date} às 12h UTC: ${bodyNames[position.body]} em longitude tropical ${position.longitude.toFixed(6)}°.`,
					source
				}))
			]),
			...windows.map((w) => ({
				id: w.id,
				kind: 'calculated' as const,
				display: `${bodyNames[w.transit]} em ${aspectNames[w.aspect]} com ${bodyNames[w.natal]} natal; observações dentro de 2° entre ${w.firstInstant} e ${w.lastInstant}; ${w.observations} amostras; menor afastamento ${w.minOrb.toFixed(6)}° em ${w.minimumInstant}.`,
				source
			})),
			...events.map((e) => ({
				id: e.id,
				kind: 'calculated' as const,
				display: `${e.date}: ${names[e.kind]} em ${e.instant}; afastamento ${e.orb.toFixed(6)}°; relação ${e.windowId}.`,
				source
			}))
		],
		data: {
			productId: 'personal-calendar',
			base,
			natal,
			samples,
			days,
			windows,
			events,
			positions: n,
			houses: natal.data.houses,
			angles: natal.data.angles,
			provenance: natal.data.provenance,
			policy: {
				id: CALENDAR_POLICY,
				orbDegrees: 2,
				aspects: Object.keys(angles),
				maximumSignalsPerDay: 3,
				selection:
					'context-relevance-then-observed-peak-then-orb; persistent-background-separated; no-fillers'
			},
			updatePolicy: {
				version: 'atv-calendar-immutable-input-revision/1.0.0',
				mode: 'immutable-saved-snapshot',
				changedInput: 'new-request-and-new-calculation',
				missingObservation: 'reject-whole-month; retain-existing-saved-reading',
				timezone: 'UTC; birth-timezone-retained; no-silent-local-date-conversion'
			}
		},
		limits: [
			'O calendário acompanha um mês civil em UTC, com observações às 00h, 06h, 12h e 18h. A data local pode ser diferente.',
			'Entradas, saídas e picos descrevem a grade de seis horas e os cinco aspectos maiores até 2°. Não certificam hora exata nem ausência de um contato breve entre observações.',
			'Até três sinais por data são selecionados por relevância ao contexto e mudança observada; movimentos persistentes ficam no panorama. Uma data sem sinal selecionado não é um dia sem acontecimentos.',
			'Marcos pessoais são relatos consentidos. Não alteram o céu calculado nem comprovam a hipótese simbólica. Nenhum sinal define dia favorável, obrigação ou resultado.',
			'A leitura salva conserva os dados usados. Corrigir nascimento, mês, fuso ou contexto exige uma nova leitura; dados incompletos impedem gerar o mês. O motor permanece experimental.'
		]
	};
}
export function assertCalendarProjection(input: WorkflowInput, c: CalculationSnapshot) {
	const d = c.data as unknown as CalendarData;
	if (
		c.version !== CALENDAR_VERSION ||
		canonical(projectCalendarReading(input, d.base, d.natal, d.samples)) !== canonical(c)
	)
		throw Error('Calendário sem correspondência integral às bases preservadas.');
}
