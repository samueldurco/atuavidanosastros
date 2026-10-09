import {
	calculateAspects,
	engineContract,
	type AspectPolicy,
	type AspectPosition
} from '@atv/astrology';
import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { inspectBirthChartProjection } from '../../../../../worker/src/natal-calculators';
import { canonical } from '../reading';
import { bodyNames, modernRulers } from './canon';

export const PURPOSE_VERSION = 'atv-private-purpose-synthesis/4.0.0';
export const purposeAspectPolicy: AspectPolicy = {
	id: 'atv-purpose-natal-major-aspects',
	version: '1.0.0',
	aspects: [
		{ kind: 'conjunction', orbDegrees: 6 },
		{ kind: 'sextile', orbDegrees: 4 },
		{ kind: 'square', orbDegrees: 6 },
		{ kind: 'trine', orbDegrees: 6 },
		{ kind: 'opposition', orbDegrees: 6 }
	]
};
export const purposeMethod = {
	version: 'atv-purpose-method/1.0.0',
	zodiac: 'tropical',
	rulership: 'modern',
	houseSystem: 'placidus',
	houseMembership: 'cyclic-half-open-start-inclusive',
	angularity: 'longitude-conjunction-to-ASC-DSC-MC-IC',
	angularOrb: 3,
	aspectPolicy: purposeAspectPolicy,
	applyingSeparating: false
} as const;
export type PurposeAngular = {
	body: string;
	angle: 'ASC' | 'DSC' | 'MC' | 'IC';
	orb: number;
	factId: string;
};
export type PurposeData = {
	productId: 'purpose-career';
	natal: CalculationSnapshot;
	birth: NonNullable<WorkflowInput['birth']>;
	method: typeof purposeMethod;
	angular: PurposeAngular[];
	regent: { body: string; house: number | null; factId: string };
	positions: AspectPosition[];
	angles: { ascendant: number | null; midheaven: number };
	houses: { status: string; system: string; cusps: number[] };
};
export function purposeHouseAt(longitude: number, cusps: number[]): number | null {
	if (cusps.length !== 12) return null;
	const i = cusps.findIndex(
		(c, index) => (longitude - c + 360) % 360 < (cusps[(index + 1) % 12] - c + 360) % 360
	);
	return i < 0 ? null : i + 1;
}
export function purposeAngularContacts(
	positions: AspectPosition[],
	angles: PurposeData['angles']
): PurposeAngular[] {
	const axes: [PurposeAngular['angle'], number][] = [
		['MC', angles.midheaven],
		['IC', (angles.midheaven + 180) % 360]
	];
	if (angles.ascendant !== null)
		axes.push(['ASC', angles.ascendant], ['DSC', (angles.ascendant + 180) % 360]);
	return positions.flatMap((p) =>
		axes.flatMap(([angle, longitude]) => {
			const d = Math.abs(p.longitude - longitude),
				orb = Math.min(d, 360 - d);
			return orb <= purposeMethod.angularOrb
				? [{ body: p.body, angle, orb, factId: `purpose-angular-${p.body}-${angle}` }]
				: [];
		})
	);
}
/** Preserve the native source and bind this finite professional synthesis to its intake. */
export function projectPurposeReading(
	input: WorkflowInput,
	natal: CalculationSnapshot
): CalculationSnapshot {
	if (
		!parseWorkflowInput(input) ||
		input.productId !== 'purpose-career' ||
		!input.birth ||
		!inspectBirthChartProjection(natal)
	)
		throw Error('Base natal completa necessária para Propósito & Carreira.');
	const provenance = natal.data.provenance as { temporal: { utcInstant: string } },
		positions = natal.data.positions as AspectPosition[],
		angles = natal.data.angles as PurposeData['angles'],
		houses = natal.data.houses as PurposeData['houses'];
	if (
		Date.parse(provenance.temporal.utcInstant) !== Date.parse(input.birth.utcInstant) ||
		(houses.status === 'ok' &&
			Math.abs(input.birth.latitude) >= engineContract.placidusAbsoluteLatitudeExclusive) ||
		natal.facts.find((f) => f.id === 'personal-context')?.display !== input.context
	)
		throw Error('Nascimento ou contexto divergente da base natal.');
	const mcRuler = modernRulers[Math.floor(angles.midheaven / 30)],
		rulerPosition = positions.find((p) => p.body === mcRuler)!;
	const regent = {
			body: mcRuler,
			house: purposeHouseAt(rulerPosition.longitude, houses.cusps),
			factId: 'career-mc-ruler'
		},
		privateAspects = calculateAspects(positions, purposeAspectPolicy),
		angular = purposeAngularContacts(positions, angles);
	const aspectLabels: Record<string, string> = {
		conjunction: 'conjunção',
		sextile: 'sextil',
		square: 'quadratura',
		trine: 'trígono',
		opposition: 'oposição'
	};
	return {
		...natal,
		version: PURPOSE_VERSION,
		kind: 'purpose',
		facts: [
			...natal.facts,
			{
				id: regent.factId,
				kind: 'calculated',
				display: `Regente moderno do Meio do Céu: ${bodyNames[mcRuler]}`,
				source: purposeMethod.version
			},
			{
				id: 'purpose-ruler-house',
				kind: 'calculated',
				display: `${bodyNames[mcRuler]}, regente do MC: ${regent.house === null ? 'casa indisponível' : `casa ${regent.house}`}`,
				source: purposeMethod.version
			},
			...privateAspects.aspects.map((a, i) => ({
				id: `private-natal-aspect-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.first]} — ${bodyNames[a.second]}: ${aspectLabels[a.kind]}; orbe ${a.orbDegrees.toFixed(3)}°`,
				source: `${privateAspects.algorithmVersion};${purposeAspectPolicy.id}@${purposeAspectPolicy.version}`
			})),
			...angular.map((a) => ({
				id: a.factId,
				kind: 'calculated' as const,
				display: `${bodyNames[a.body]} junto ao ${a.angle}; distância em longitude ${a.orb.toFixed(3)}°`,
				source: purposeMethod.version
			}))
		],
		data: {
			...natal.data,
			productId: 'purpose-career',
			natal: structuredClone(natal),
			birth: structuredClone(input.birth),
			method: purposeMethod,
			regent,
			privateAspects,
			angular
		},
		limits: [
			...natal.limits.filter((l) => !l.startsWith('Aspectos, síntese interpretativa')),
			'Regência moderna tropical; casas Placidus e pertencimento por intervalos cíclicos, incluindo a cúspide inicial. Sem substituição de casas indisponíveis.',
			'Angularidade por proximidade em longitude de até 3° dos quatro eixos disponíveis; não equivale a ocupar uma casa angular.',
			'Aspectos maiores com orbes nominais de 6°, exceto sextil de 4°; sem avaliação de aplicação/separação ou promessa de acontecimentos.',
			'Propósito é uma hipótese de participação e escolha, sem determinar profissão, emprego, renda, prosperidade ou competência.'
		]
	};
}
export function assertPurposeProjection(input: WorkflowInput, c: CalculationSnapshot) {
	if (
		c.version !== PURPOSE_VERSION ||
		canonical(c.data.birth) !== canonical(input.birth) ||
		canonical(projectPurposeReading(input, c.data.natal as CalculationSnapshot)) !== canonical(c)
	)
		throw Error('Síntese de propósito divergente de sua base preservada.');
}
