import {
	bodies,
	calculateAspects,
	calculateCrossAspects,
	type AspectPolicy,
	type AspectPosition,
	type CalculationInput,
	type MajorAspect
} from '@atv/astrology';
import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { inspectBirthChartProjection } from '../../../../../worker/src/natal-calculators';
import { solarReturnProductContract } from '../../../../../worker/src/solar-return-calculators';
import {
	buildSolarReturnCalendar,
	type SolarReturnCalendar
} from '../../../../../worker/src/solar-return-calendar';
import {
	assertSolarYearSamples,
	type SolarYearSamples
} from '../../../../../worker/src/solar-year-samples';
import { zodiacPosition, bodyLabels } from '../../../../../worker/src/natal-calculators';
import { canonical } from '../reading';
import { bodyNames } from './canon';
import { aspectNames } from './date-facts';

export const SOLAR_VERSION = 'atv-private-solar-synthesis/4.0.0';
const kinds: MajorAspect[] = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];
export const solarAnnualPolicy: AspectPolicy = {
	id: 'atv-solar-annual-major-aspects',
	version: '1.0.0',
	aspects: kinds.map((kind) => ({ kind, orbDegrees: 4 }))
};
export const solarMonthPolicy: AspectPolicy = {
	id: 'atv-solar-daily-observed-major-aspects',
	version: '1.0.0',
	aspects: kinds.map((kind) => ({ kind, orbDegrees: 2 }))
};
const angles: Record<MajorAspect, number> = {
	conjunction: 0,
	sextile: 60,
	square: 90,
	trine: 120,
	opposition: 180
};
const withoutTimestamp = (p: Record<string, unknown>) =>
	Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'calculatedAt'));
export type SolarContact = {
	id: string;
	transit: AspectPosition['body'];
	natal: AspectPosition['body'];
	aspect: MajorAspect;
	observedDates: number;
	firstDate: string;
	lastDate: string;
	minimumDate: string;
	minOrb: number;
	startOrb: number;
	endOrb: number;
};
export type SolarMonth = {
	number: number;
	startDate: string;
	endDateExclusive: string;
	sampleCount: number;
	importantDateIds: string[];
	contacts: SolarContact[];
};
type SolarBase = {
	returnYear: number;
	anchorDate: string;
	returnInstant: string;
	localDateTime: string;
	natalSunLongitude: number;
	returnSunLongitude: number;
	residualDegrees: number;
	positions: (AspectPosition & { latitude: number; distanceAu: number; retrograde: boolean })[];
	houses: { status: string; system: string; cusps: number[]; ascendant: number; midheaven: number };
	natalProvenance: Record<string, unknown>;
	natalInput: CalculationInput;
	returnInput: CalculationInput;
	returnProvenance: Record<string, unknown>;
	calendarScaffold: SolarReturnCalendar;
	projection: unknown;
};
const validAngle = (n: unknown): n is number =>
	typeof n === 'number' && Number.isFinite(n) && n >= 0 && n < 360;
const separation = (a: number, b: number) => {
	const d = Math.abs(a - b);
	return Math.min(d, 360 - d);
};
export function solarHouseAt(longitude: number, cusps: number[]) {
	return cusps.length === 12
		? cusps.findIndex(
				(c, i) => (longitude - c + 360) % 360 < (cusps[(i + 1) % 12] - c + 360) % 360
			) + 1 || null
		: null;
}

/** Bind the finite annual/monthly interpretation to the unchanged native return calculation. */
export function projectSolarReading(
	input: WorkflowInput,
	base: CalculationSnapshot,
	natal: CalculationSnapshot,
	samples: SolarYearSamples
): CalculationSnapshot {
	if (
		!parseWorkflowInput(input) ||
		input.productId !== 'solar-return' ||
		base.version !== solarReturnProductContract.version ||
		base.data.productId !== 'solar-return' ||
		!inspectBirthChartProjection(natal)
	)
		throw Error('Base anual ou natal inválida.');
	const b = base.data as unknown as SolarBase,
		n = natal.data.positions as AspectPosition[];
	const calendar = buildSolarReturnCalendar(input.targetDate!, input.importantDates?.entries);
	const residual = separation(b.returnSunLongitude, b.natalSunLongitude);
	const p = b.returnProvenance,
		temporal = p.temporal as { utcInstant: string };
	const instant = Date.parse(b.returnInstant),
		anchor = Date.parse(input.targetDate! + 'T12:00:00.000Z');
	if (
		canonical(b.projection) !== canonical(solarReturnProductContract) ||
		!b.natalInput ||
		!b.returnInput ||
		(
			[
				'localDateTime',
				'utcInstant',
				'timezone',
				'latitude',
				'longitude',
				'locationSource'
			] as const
		).some((key) => b.natalInput[key] !== input.birth![key]) ||
		(['timezone', 'latitude', 'longitude', 'locationSource'] as const).some(
			(key) => b.returnInput[key] !== input.returnLocation![key]
		) ||
		b.returnInput.utcInstant !== b.returnInstant ||
		b.returnInput.localDateTime !== b.localDateTime ||
		Date.parse((b.natalProvenance.temporal as { utcInstant: string }).utcInstant) !==
			Date.parse(input.birth!.utcInstant) ||
		b.returnYear !== input.returnYear ||
		b.anchorDate !== input.targetDate ||
		canonical(calendar) !== canonical(b.calendarScaffold) ||
		!Number.isFinite(instant) ||
		Math.abs(instant - anchor) > 4 * 86400000 ||
		temporal.utcInstant !== b.returnInstant ||
		!Array.isArray(b.positions) ||
		b.positions.length !== 10 ||
		new Set(b.positions.map((p) => p.body)).size !== 10 ||
		bodies.some(
			(body) =>
				!b.positions.some(
					(p) =>
						p.body === body &&
						validAngle(p.longitude) &&
						typeof p.retrograde === 'boolean' &&
						Number.isFinite(p.latitude) &&
						Number.isFinite(p.distanceAu)
				)
		) ||
		b.positions.find((p) => p.body === 'sun')!.longitude !== b.returnSunLongitude ||
		n.find((p) => p.body === 'sun')!.longitude !== b.natalSunLongitude ||
		residual > 0.00002 ||
		Math.abs(residual - b.residualDegrees) > 1e-12 ||
		canonical(withoutTimestamp(b.natalProvenance)) !==
			canonical(withoutTimestamp(natal.data.provenance as Record<string, unknown>)) ||
		base.facts.find((f) => f.id === 'personal-context')?.display !== input.context ||
		natal.facts.find((f) => f.id === 'personal-context')?.display !== input.context ||
		!validAngle(b.houses.midheaven) ||
		b.houses.system !== 'placidus' ||
		!['ok', 'not-applicable'].includes(b.houses.status) ||
		(b.houses.status === 'ok'
			? b.houses.cusps.length !== 12 ||
				!b.houses.cusps.every(validAngle) ||
				!validAngle(b.houses.ascendant)
			: b.houses.cusps.length !== 0)
	)
		throw Error('Retorno, nascimento ou contexto divergente.');
	const source = `${p.provider}/${p.providerVersion};${solarReturnProductContract.version}`;
	const expected: CalculationSnapshot['facts'] = [
		{
			id: 'natal-sun',
			kind: 'calculated',
			display: `Sol natal: ${zodiacPosition(b.natalSunLongitude).display}`,
			source
		},
		{
			id: 'return-instant',
			kind: 'calculated',
			display: `Retorno solar calculado: ${b.returnInstant} (${input.returnLocation!.city}, ${input.returnLocation!.timezone})`,
			source
		},
		...b.positions.map((p) => ({
			id: `return-${p.body}`,
			kind: 'calculated' as const,
			display: `${bodyLabels[p.body]} no retorno: ${zodiacPosition(p.longitude).display}`,
			source
		})),
		...(b.houses.status === 'ok'
			? [
					{
						id: 'return-ascendant',
						kind: 'calculated' as const,
						display: `Ascendente do retorno: ${zodiacPosition(b.houses.ascendant).display}`,
						source
					}
				]
			: []),
		{
			id: 'return-midheaven',
			kind: 'calculated',
			display: `Meio do Céu do retorno: ${zodiacPosition(b.houses.midheaven).display}`,
			source
		},
		...(b.houses.status === 'ok'
			? b.houses.cusps.map((longitude, i) => ({
					id: `return-house-${i + 1}`,
					kind: 'calculated' as const,
					display: `Cúspide ${i + 1} do retorno (Placidus): ${zodiacPosition(longitude).display}`,
					source
				}))
			: []),
		{
			id: 'birthday-city',
			kind: 'reported',
			display: `Cidade declarada para o aniversário: ${input.returnLocation!.city}`,
			source: 'input.returnLocation'
		},
		...(input.context
			? [
					{
						id: 'personal-context',
						kind: 'reported' as const,
						display: input.context,
						source: 'input.context'
					}
				]
			: []),
		...(input.importantDates?.entries.map((e, i) => ({
			id: `important-date-${i + 1}`,
			kind: 'reported' as const,
			display: `${e.date}: ${e.label}`,
			source: `input.importantDates.entries[${i}]`
		})) ?? [])
	];
	if (canonical(expected) !== canonical(base.facts)) throw Error('Fatos do retorno divergentes.');
	assertSolarYearSamples(samples, calendar.startDate, calendar.endDateExclusive);
	const annualGeometry = calculateAspects(b.positions, solarAnnualPolicy),
		natalGeometry = calculateCrossAspects(b.positions, n, solarAnnualPolicy);
	const months: SolarMonth[] = calendar.months.map((m) => {
		const rows = samples.rows.filter((r) => {
			const d = new Date(r[0]).toISOString().slice(0, 10);
			return d >= m.startDate && d < m.endDateExclusive;
		});
		const contacts: SolarContact[] = [];
		for (const [ti, transit] of bodies.entries())
			for (const receiver of n)
				for (const kind of kinds) {
					const values = rows.map((r) =>
						Math.abs(separation(r[ti + 1], receiver.longitude) - angles[kind])
					);
					const active = values.flatMap((v, i) => (v <= 2 ? [i] : []));
					if (!active.length) continue;
					const minOrb = Math.min(...values),
						nearest = values.indexOf(minOrb),
						date = (i: number) => new Date(rows[i][0]).toISOString().slice(0, 10);
					contacts.push({
						id: `solar-month-${m.number}-${transit}-${receiver.body}-${kind}`,
						transit,
						natal: receiver.body,
						aspect: kind,
						observedDates: active.length,
						firstDate: date(active[0]),
						lastDate: date(active.at(-1)!),
						minimumDate: date(nearest),
						minOrb,
						startOrb: values[0],
						endOrb: values.at(-1)!
					});
				}
		return { ...m, sampleCount: rows.length, contacts };
	});
	const geometrySource = `${solarAnnualPolicy.id}@${solarAnnualPolicy.version};${SOLAR_VERSION}`,
		monthlySource = `${samples.source};${solarMonthPolicy.id}@${solarMonthPolicy.version};${SOLAR_VERSION}`;
	return {
		version: SOLAR_VERSION,
		kind: 'cycles',
		status: 'experimental',
		facts: [
			...natal.facts,
			...base.facts.filter((f) => f.id !== 'personal-context'),
			{
				id: 'solar-cycle',
				kind: 'calculated',
				display: `Carta anual em ${b.returnInstant}; acompanhamento civil de ${calendar.startDate} até ${calendar.endDateExclusive}, extremo excluído; ${samples.rows.length} observações às 12h UTC.`,
				source: monthlySource
			},
			...annualGeometry.aspects.map((a, i) => ({
				id: `solar-annual-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.first]} do retorno em ${aspectNames[a.kind]} com ${bodyNames[a.second]} do retorno; orbe ${a.orbDegrees.toFixed(6)}°.`,
				source: geometrySource
			})),
			...natalGeometry.aspects.map((a, i) => ({
				id: `solar-natal-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.first]} do retorno em ${aspectNames[a.kind]} com ${bodyNames[a.second]} natal; orbe ${a.orbDegrees.toFixed(6)}°.`,
				source: geometrySource
			})),
			...months.flatMap((m) => [
				{
					id: `solar-month-${m.number}`,
					kind: 'calculated' as const,
					display: `Mês ${m.number}: ${m.startDate} até ${m.endDateExclusive}, extremo excluído; ${m.sampleCount} observações às 12h UTC; ${m.contacts.length} relações observadas.`,
					source: monthlySource
				},
				...m.contacts.map((c) => ({
					id: c.id,
					kind: 'calculated' as const,
					display: `${bodyNames[c.transit]} em ${aspectNames[c.aspect]} com ${bodyNames[c.natal]} natal; ${c.observedDates}/${m.sampleCount} datas observadas no orbe de 2°; mínimo observado ${c.minOrb.toFixed(6)}° em ${c.minimumDate}; primeira ${c.firstDate}, última ${c.lastDate}.`,
					source: monthlySource
				}))
			])
		],
		data: {
			productId: 'solar-return',
			base,
			natal,
			samples,
			annualGeometry,
			natalGeometry,
			months,
			calendar,
			returnPositions: b.positions,
			returnHouses: b.houses,
			returnInstant: b.returnInstant,
			positions: natal.data.positions,
			houses: natal.data.houses,
			angles: natal.data.angles,
			provenance: natal.data.provenance
		},
		limits: [
			'Carta anual tropical no instante calculado da igualdade solar; casas Placidus na cidade declarada para o retorno, separadas das casas natais.',
			'Aspectos anuais maiores até 4°; relações mensais até 2° em uma observação diária às 12h UTC. Orbes editoriais não são medidas da precisão da efeméride.',
			'Meses civis contados do aniversário ao próximo aniversário; a carta anual usa o instante astronômico do retorno, que pode cair em outra data. Os intervalos mensais não são ingressos solares, lunações ou previsões de eventos.',
			'Contagens e mínimos descrevem somente a grade diária. Não certificam duração contínua, hora exata, passagem única ou ausência de contatos breves entre observações.',
			'Contexto, cidade e datas importantes são relatos consentidos. Datas declaradas orientam perguntas e não constituem evidência astrológica nem disparam alertas.',
			...base.limits.filter((l) => !l.includes('grade de 12 meses'))
		]
	};
}
export function assertSolarProjection(input: WorkflowInput, c: CalculationSnapshot) {
	if (
		c.version !== SOLAR_VERSION ||
		canonical(
			projectSolarReading(
				input,
				c.data.base as CalculationSnapshot,
				c.data.natal as CalculationSnapshot,
				c.data.samples as SolarYearSamples
			)
		) !== canonical(c)
	)
		throw Error('Leitura anual sem correspondência com as bases preservadas.');
}
