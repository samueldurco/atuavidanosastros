import {
	calculateAspects,
	engineContract,
	type AspectPolicy,
	type AspectPosition
} from '@atv/astrology';
import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { inspectBirthChartProjection } from '../../../../../worker/src/natal-calculators';
import { canonical } from '../reading';
import { aspectNames, bodyNames, modernRulers } from './canon';
import { purposeHouseAt } from './purpose-facts';

export const BIRTH_VERSION = 'atv-private-birth-chart/5.0.0';
export const BIRTH_READING_VERSION = 'atv-birth-chart-editorial/5.0.0';
export const birthAspectPolicy: AspectPolicy = {
	id: 'atv-birth-major-aspects',
	version: '1.0.0',
	aspects: [
		{ kind: 'conjunction', orbDegrees: 6 },
		{ kind: 'sextile', orbDegrees: 4 },
		{ kind: 'square', orbDegrees: 6 },
		{ kind: 'trine', orbDegrees: 6 },
		{ kind: 'opposition', orbDegrees: 6 }
	]
};
export const birthMethod = {
	version: 'atv-birth-life-signatures/1.0.0',
	zodiac: 'tropical',
	rulership: 'modern',
	houseSystem: 'placidus',
	houseMembership: 'cyclic-half-open-start-inclusive',
	aspectPolicy: birthAspectPolicy,
	angularOrb: 3,
	applyingSeparating: false,
	selection: {
		signatures: 6,
		core: ['sun-moon', 'asc-ruler', 'mc-ruler'],
		resources: 3,
		closeAspectOrb: 3,
		tieBreak: 'body-id-ascending'
	},
	themes: [
		'whole-chart',
		'identity-needs',
		'presence-action',
		'learning',
		'relationships',
		'private-support',
		'daily-effort',
		'contribution',
		'resources',
		'groups-meaning',
		'synthesis'
	]
} as const;
const angles = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
export function birthAngularContacts(
	positions: readonly AspectPosition[],
	axis: { ascendant: number; midheaven: number }
) {
	return positions.flatMap((p) =>
		(['ascendant', 'midheaven'] as const).flatMap((angle) =>
			Object.entries(angles).flatMap(([kind, exact]) => {
				const distance = Math.abs(p.longitude - axis[angle]),
					orb = Math.abs(Math.min(distance, 360 - distance) - exact);
				return orb <= birthMethod.angularOrb ? [{ body: p.body, angle, kind, orb }] : [];
			})
		)
	);
}
export type BirthData = {
	productId: 'birth-chart';
	natal: CalculationSnapshot;
	birth: NonNullable<WorkflowInput['birth']>;
	method: typeof birthMethod;
	positions: AspectPosition[];
	angles: { ascendant: number; midheaven: number };
	houses: { status: string; system: string; cusps: number[] };
	regents: { axis: 'ascendant' | 'midheaven'; body: string; house: number | null }[];
	houseRegents: { house: number; body: string; rulerHouse: number | null }[];
	angleContacts: ReturnType<typeof birthAngularContacts>;
};
export function projectBirthReading(
	input: WorkflowInput,
	natal: CalculationSnapshot
): CalculationSnapshot {
	if (
		!parseWorkflowInput(input) ||
		input.productId !== 'birth-chart' ||
		!input.birth ||
		inspectBirthChartProjection(natal) !== 'available'
	)
		throw Error('Base natal completa necessária para o Mapa Astral.');
	const positions = natal.data.positions as AspectPosition[],
		axis = natal.data.angles as BirthData['angles'],
		houses = natal.data.houses as BirthData['houses'];
	const provenance = natal.data.provenance as { temporal: { utcInstant: string } };
	if (
		!Number.isFinite(axis.ascendant) ||
		axis.ascendant === null ||
		!Number.isFinite(axis.midheaven) ||
		axis.midheaven === null ||
		Date.parse(provenance.temporal.utcInstant) !== Date.parse(input.birth.utcInstant) ||
		(houses.status === 'ok' &&
			Math.abs(input.birth.latitude) >= engineContract.placidusAbsoluteLatitudeExclusive) ||
		natal.facts.find((f) => f.id === 'personal-context')?.display !== input.context
	)
		throw Error('Ângulos indisponíveis ou nascimento/contexto divergente da base natal.');
	const regents = (['ascendant', 'midheaven'] as const).map((angle) => {
		const body = modernRulers[Math.floor(axis[angle] / 30)],
			p = positions.find((p) => p.body === body)!;
		return { axis: angle, body, house: purposeHouseAt(p.longitude, houses.cusps) };
	});
	const houseRegents = houses.cusps.map((cusp, i) => {
		const body = modernRulers[Math.floor(cusp / 30)],
			p = positions.find((p) => p.body === body)!;
		return { house: i + 1, body, rulerHouse: purposeHouseAt(p.longitude, houses.cusps) };
	});
	const privateAspects = calculateAspects(positions, birthAspectPolicy),
		angleContacts = birthAngularContacts(positions, axis);
	return {
		...natal,
		version: BIRTH_VERSION,
		facts: [
			...natal.facts,
			...regents.map((r) => ({
				id: r.axis === 'ascendant' ? 'natal-asc-ruler' : 'career-mc-ruler',
				kind: 'calculated' as const,
				display: `Regente moderno ${r.axis === 'ascendant' ? 'do Ascendente' : 'do Meio do Céu'}: ${bodyNames[r.body]}`,
				source: birthMethod.version
			})),
			...houseRegents.map((r) => ({
				id: `birth-house-ruler-${r.house}`,
				kind: 'calculated' as const,
				display: `Casa ${r.house}: regência moderna de ${bodyNames[r.body]}, ${r.rulerHouse === null ? 'casa indisponível' : `na casa ${r.rulerHouse}`}`,
				source: birthMethod.version
			})),
			...privateAspects.aspects.map((a, i) => ({
				id: `private-natal-aspect-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.first]} — ${bodyNames[a.second]}: ${aspectNames[a.kind]}; orbe ${a.orbDegrees.toFixed(3)}°`,
				source: `${privateAspects.algorithmVersion};${birthAspectPolicy.id}@${birthAspectPolicy.version}`
			})),
			...angleContacts.map((a, i) => ({
				id: `private-angle-contact-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.body]} — ${a.angle === 'ascendant' ? 'Ascendente' : 'Meio do Céu'}: ${aspectNames[a.kind]}; orbe ${a.orb.toFixed(3)}°`,
				source: birthMethod.version
			}))
		],
		data: {
			...natal.data,
			productId: input.productId,
			natal: structuredClone(natal),
			birth: structuredClone(input.birth),
			method: birthMethod,
			regents,
			houseRegents,
			privateAspects,
			angleContacts
		},
		limits: [
			...natal.limits.filter((l) => !l.startsWith('Aspectos, síntese interpretativa')),
			'Leitura humanista tropical com regências modernas e casas Placidus; base experimental e precisão não homologada para produção.',
			'Aspectos maiores: orbe nominal 6°, sextil 4°; contatos aos ângulos 3°. Aplicação e separação não certificadas.',
			'Seis assinaturas editoriais relacionam fatores calculados. A prioridade de uso considera o contexto declarado sem alterar a geometria.'
		]
	};
}
export function assertBirthProjection(input: WorkflowInput, c: CalculationSnapshot): void {
	const d = c.data as unknown as BirthData;
	if (
		c.version !== BIRTH_VERSION ||
		canonical(d.birth) !== canonical(input.birth) ||
		canonical(projectBirthReading(input, d.natal)) !== canonical(c)
	)
		throw Error('Mapa Astral divergente da fonte natal.');
}
