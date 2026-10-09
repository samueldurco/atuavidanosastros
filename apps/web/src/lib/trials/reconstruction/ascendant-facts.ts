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

export const ASCENDANT_VERSION = 'atv-private-ascendant/5.0.0';
export const ASCENDANT_READING_VERSION = 'atv-ascendant-editorial/5.0.0';
export const ascendantAspectPolicy: AspectPolicy = {
	id: 'atv-ascendant-major-aspects',
	version: '1.0.0',
	aspects: [
		{ kind: 'conjunction', orbDegrees: 6 },
		{ kind: 'sextile', orbDegrees: 4 },
		{ kind: 'square', orbDegrees: 6 },
		{ kind: 'trine', orbDegrees: 6 },
		{ kind: 'opposition', orbDegrees: 6 }
	]
};
export const ascendantMethod = {
	version: 'atv-ascendant-ruler-dynamics/1.0.0',
	zodiac: 'tropical',
	rulership: 'modern',
	houseSystem: 'placidus',
	houseMembership: 'cyclic-half-open-start-inclusive',
	aspectPolicy: ascendantAspectPolicy,
	applyingSeparating: false,
	angularOrb: 3,
	selection: {
		maximumRulerAspects: 3,
		maximumAscContacts: 3,
		tieBreak: 'orb-ascending-fact-id-ascending'
	},
	themes: [
		'entry-style',
		'ruler-function',
		'ruler-field',
		'ruler-aspects',
		'asc-contacts',
		'sun-relation',
		'moon-relation',
		'integrated-adjustment',
		'context',
		'reversible-practice'
	]
} as const;
const angles = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
export function ascendantAngularContacts(positions: readonly AspectPosition[], asc: number) {
	return positions.flatMap((p) => {
		const distance = Math.abs(p.longitude - asc),
			separation = Math.min(distance, 360 - distance);
		return Object.entries(angles).flatMap(([kind, exact]) => {
			const orb = Math.abs(separation - exact);
			return orb <= ascendantMethod.angularOrb
				? [{ body: p.body, angle: 'ascendant' as const, kind, orb }]
				: [];
		});
	});
}
export type AscendantData = {
	productId: 'ascendant';
	natal: CalculationSnapshot;
	birth: NonNullable<WorkflowInput['birth']>;
	method: typeof ascendantMethod;
	positions: AspectPosition[];
	angles: { ascendant: number; midheaven: number };
	houses: { status: string; system: string; cusps: number[] };
	regent: { body: string; house: number | null };
	angleContacts: ReturnType<typeof ascendantAngularContacts>;
};
export function projectAscendantReading(
	input: WorkflowInput,
	natal: CalculationSnapshot
): CalculationSnapshot {
	if (
		!parseWorkflowInput(input) ||
		input.productId !== 'ascendant' ||
		!input.birth ||
		!inspectBirthChartProjection(natal)
	)
		throw Error('Base natal completa necessária para o Ascendente.');
	const positions = natal.data.positions as AspectPosition[],
		axis = natal.data.angles as AscendantData['angles'],
		houses = natal.data.houses as AscendantData['houses'];
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
		privateAspects = calculateAspects(positions, ascendantAspectPolicy),
		angleContacts = ascendantAngularContacts(positions, axis.ascendant);
	return {
		...natal,
		version: ASCENDANT_VERSION,
		facts: [
			...natal.facts,
			{
				id: 'natal-asc-ruler',
				kind: 'calculated',
				display: `Regente moderno do Ascendente: ${bodyNames[body]}`,
				source: ascendantMethod.version
			},
			{
				id: 'ascendant-ruler-house',
				kind: 'calculated',
				display: `${bodyNames[body]}, regente do Ascendente: ${regent.house === null ? 'casa indisponível' : `casa ${regent.house}`}`,
				source: ascendantMethod.version
			},
			...privateAspects.aspects.map((a, i) => ({
				id: `private-natal-aspect-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.first]} — ${bodyNames[a.second]}: ${aspectNames[a.kind]}; orbe ${a.orbDegrees.toFixed(3)}°`,
				source: `${privateAspects.algorithmVersion};${ascendantAspectPolicy.id}@${ascendantAspectPolicy.version}`
			})),
			...angleContacts.map((a, i) => ({
				id: `private-angle-contact-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.body]} — Ascendente: ${aspectNames[a.kind]}; orbe ${a.orb.toFixed(3)}°`,
				source: ascendantMethod.version
			}))
		],
		data: {
			...natal.data,
			productId: input.productId,
			natal: structuredClone(natal),
			birth: structuredClone(input.birth),
			method: ascendantMethod,
			regent,
			privateAspects,
			angleContacts
		},
		limits: [
			...natal.limits.filter((l) => !l.startsWith('Aspectos, síntese interpretativa')),
			'Leitura humanista tropical com regência moderna: hipóteses de observação, sem diagnóstico ou identidade obrigatória.',
			'Aspectos maiores nominais: 6°, sextil 4°; contatos ao Ascendente 3°. Sem aplicação/separação certificada.',
			'O Ascendente descreve uma forma simbólica de entrar nas experiências. Regente, Sol e Lua qualificam essa hipótese; o contexto não altera a geometria.'
		]
	};
}
export function assertAscendantProjection(input: WorkflowInput, c: CalculationSnapshot): void {
	const data = c.data as unknown as AscendantData;
	if (
		c.version !== ASCENDANT_VERSION ||
		canonical(data.birth) !== canonical(input.birth) ||
		canonical(projectAscendantReading(input, data.natal)) !== canonical(c)
	)
		throw Error('Base do Ascendente divergente da fonte natal.');
}
