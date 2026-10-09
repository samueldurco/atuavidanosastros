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

export const PILLARS_VERSION = 'atv-private-three-pillars/5.0.0';
export const PILLARS_READING_VERSION = 'atv-three-pillars-editorial/5.0.0';
export const pillarsAspectPolicy: AspectPolicy = {
	id: 'atv-pillars-major-aspects',
	version: '1.0.0',
	aspects: [
		{ kind: 'conjunction', orbDegrees: 6 },
		{ kind: 'sextile', orbDegrees: 4 },
		{ kind: 'square', orbDegrees: 6 },
		{ kind: 'trine', orbDegrees: 6 },
		{ kind: 'opposition', orbDegrees: 6 }
	]
};
export const pillarsMethod = {
	version: 'atv-pillars-integrated-functions/1.0.0',
	zodiac: 'tropical',
	rulership: 'modern',
	houseSystem: 'placidus',
	houseMembership: 'cyclic-half-open-start-inclusive',
	aspectPolicy: pillarsAspectPolicy,
	applyingSeparating: false,
	angularOrb: 3,
	selection: {
		luminaryWeight: 10,
		rulerWeight: 7,
		maximumAspects: 3,
		tieBreak: 'fact-id-ascending'
	},
	themes: ['integrated-trio', 'trio-rhythm', 'sun-moon', 'asc-ruler', 'modifiers']
} as const;
const angles = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
export function pillarsAngularContacts(positions: readonly AspectPosition[], asc: number) {
	return positions.flatMap((p) => {
		const distance = Math.abs(p.longitude - asc),
			separation = Math.min(distance, 360 - distance);
		return Object.entries(angles).flatMap(([kind, exact]) => {
			const orb = Math.abs(separation - exact);
			return orb <= pillarsMethod.angularOrb
				? [{ body: p.body, angle: 'ascendant' as const, kind, orb }]
				: [];
		});
	});
}
export type PillarsData = {
	productId: 'three-pillars';
	natal: CalculationSnapshot;
	birth: NonNullable<WorkflowInput['birth']>;
	method: typeof pillarsMethod;
	positions: AspectPosition[];
	angles: { ascendant: number; midheaven: number };
	houses: { status: string; system: string; cusps: number[] };
	regent: { body: string; house: number | null };
	angleContacts: ReturnType<typeof pillarsAngularContacts>;
};
export function projectPillarsReading(
	input: WorkflowInput,
	natal: CalculationSnapshot
): CalculationSnapshot {
	if (
		!parseWorkflowInput(input) ||
		input.productId !== 'three-pillars' ||
		!input.birth ||
		!inspectBirthChartProjection(natal)
	)
		throw Error('Base natal completa necessária para os Três Pilares.');
	const positions = natal.data.positions as AspectPosition[],
		axis = natal.data.angles as PillarsData['angles'],
		houses = natal.data.houses as PillarsData['houses'];
	const provenance = natal.data.provenance as { temporal: { utcInstant: string } };
	if (
		axis.ascendant === null ||
		!Number.isFinite(axis.ascendant) ||
		Date.parse(provenance.temporal.utcInstant) !== Date.parse(input.birth.utcInstant) ||
		(houses.status === 'ok' &&
			Math.abs(input.birth.latitude) >= engineContract.placidusAbsoluteLatitudeExclusive) ||
		natal.facts.find((f) => f.id === 'personal-context')?.display !== input.context
	)
		throw Error('Ascendente indisponível ou nascimento/contexto divergente da base natal.');
	const body = modernRulers[Math.floor(axis.ascendant / 30)],
		ruler = positions.find((p) => p.body === body)!;
	const regent = { body, house: purposeHouseAt(ruler.longitude, houses.cusps) },
		privateAspects = calculateAspects(positions, pillarsAspectPolicy),
		angleContacts = pillarsAngularContacts(positions, axis.ascendant);
	return {
		...natal,
		version: PILLARS_VERSION,
		facts: [
			...natal.facts,
			{
				id: 'natal-asc-ruler',
				kind: 'calculated',
				display: `Regente moderno do Ascendente: ${bodyNames[body]}`,
				source: pillarsMethod.version
			},
			{
				id: 'pillars-ruler-house',
				kind: 'calculated',
				display: `${bodyNames[body]}, regente do Ascendente: ${regent.house === null ? 'casa indisponível' : `casa ${regent.house}`}`,
				source: pillarsMethod.version
			},
			...privateAspects.aspects.map((a, i) => ({
				id: `private-natal-aspect-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.first]} — ${bodyNames[a.second]}: ${aspectNames[a.kind]}; orbe ${a.orbDegrees.toFixed(3)}°`,
				source: `${privateAspects.algorithmVersion};${pillarsAspectPolicy.id}@${pillarsAspectPolicy.version}`
			})),
			...angleContacts.map((a, i) => ({
				id: `private-angle-contact-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.body]} — Ascendente: ${aspectNames[a.kind]}; orbe ${a.orb.toFixed(3)}°`,
				source: pillarsMethod.version
			}))
		],
		data: {
			...natal.data,
			productId: input.productId,
			natal: structuredClone(natal),
			birth: structuredClone(input.birth),
			method: pillarsMethod,
			regent,
			privateAspects,
			angleContacts
		},
		limits: [
			...natal.limits.filter((l) => !l.startsWith('Aspectos, síntese interpretativa')),
			'Leitura humanista tropical com regência moderna: hipóteses de observação, sem diagnóstico ou identidade obrigatória.',
			'Aspectos maiores nominais: 6°, sextil 4°; contatos ao Ascendente 3°. Sem aplicação/separação certificada.',
			'Elementos e modalidades descrevem afinidades simbólicas; não substituem aspectos geométricos. O contexto não altera o cálculo.'
		]
	};
}
export function assertPillarsProjection(input: WorkflowInput, c: CalculationSnapshot): void {
	const data = c.data as unknown as PillarsData;
	if (
		c.version !== PILLARS_VERSION ||
		canonical(data.birth) !== canonical(input.birth) ||
		canonical(projectPillarsReading(input, data.natal)) !== canonical(c)
	)
		throw Error('Base dos Três Pilares divergente da fonte natal.');
}
