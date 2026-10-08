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
import { purposeHouseAt } from './purpose-facts';

export const COMPASS_VERSION = 'atv-private-career-compass/5.0.0';
export const COMPASS_READING_VERSION = 'atv-career-compass-editorial/5.0.0';
export const compassAspectPolicy: AspectPolicy = {
	id: 'atv-compass-major-aspects',
	version: '1.0.0',
	aspects: [
		{ kind: 'conjunction', orbDegrees: 6 },
		{ kind: 'sextile', orbDegrees: 4 },
		{ kind: 'square', orbDegrees: 6 },
		{ kind: 'trine', orbDegrees: 6 },
		{ kind: 'opposition', orbDegrees: 6 }
	]
};
export const compassMethod = {
	version: 'atv-compass-work-functions/1.0.0',
	zodiac: 'tropical',
	rulership: 'modern',
	houseSystem: 'placidus',
	houseMembership: 'cyclic-half-open-start-inclusive',
	aspectPolicy: compassAspectPolicy,
	applyingSeparating: false,
	angularOrb: 3,
	selection: {
		personalWeight: 5,
		rulerWeight: 6,
		themeWeight: 4,
		contextWeight: 8,
		maximumAspects: 3,
		tieBreak: 'fact-id-ascending'
	},
	themes: ['contribution', 'motivation', 'environment', 'working-style', 'sustainability']
} as const;
export function compassAngularContacts(positions: readonly AspectPosition[], mc: number) {
	return positions.flatMap((p) => {
		const d = Math.abs(p.longitude - mc),
			orb = Math.min(d, 360 - d);
		return orb <= compassMethod.angularOrb
			? [{ body: p.body, orb, factId: `compass-mc-${p.body}` }]
			: [];
	});
}
export type CompassData = {
	productId: 'career-compass';
	natal: CalculationSnapshot;
	birth: NonNullable<WorkflowInput['birth']>;
	method: typeof compassMethod;
	positions: AspectPosition[];
	angles: { ascendant: number | null; midheaven: number };
	houses: { status: string; system: string; cusps: number[] };
	regent: { body: string; house: number | null };
	angular: { body: string; orb: number; factId: string }[];
};
export function projectCompassReading(
	input: WorkflowInput,
	natal: CalculationSnapshot
): CalculationSnapshot {
	if (
		!parseWorkflowInput(input) ||
		input.productId !== 'career-compass' ||
		!input.birth ||
		!inspectBirthChartProjection(natal)
	)
		throw Error('Base natal completa necessária para a Bússola de Carreira.');
	const positions = natal.data.positions as AspectPosition[],
		angles = natal.data.angles as CompassData['angles'],
		houses = natal.data.houses as CompassData['houses'];
	const provenance = natal.data.provenance as { temporal: { utcInstant: string } };
	if (
		Date.parse(provenance.temporal.utcInstant) !== Date.parse(input.birth.utcInstant) ||
		(houses.status === 'ok' &&
			Math.abs(input.birth.latitude) >= engineContract.placidusAbsoluteLatitudeExclusive) ||
		natal.facts.find((f) => f.id === 'personal-context')?.display !== input.context
	)
		throw Error('Nascimento ou contexto divergente da base natal.');
	const body = modernRulers[Math.floor(angles.midheaven / 30)],
		ruler = positions.find((p) => p.body === body)!;
	const regent = { body, house: purposeHouseAt(ruler.longitude, houses.cusps) };
	const privateAspects = calculateAspects(positions, compassAspectPolicy);
	const angular = compassAngularContacts(positions, angles.midheaven);
	const aspectNames: Record<string, string> = {
		conjunction: 'conjunção',
		sextile: 'sextil',
		square: 'quadratura',
		trine: 'trígono',
		opposition: 'oposição'
	};
	return {
		...natal,
		version: COMPASS_VERSION,
		kind: 'purpose',
		facts: [
			...natal.facts,
			{
				id: 'career-mc-ruler',
				kind: 'calculated',
				display: `Regente moderno do Meio do Céu: ${bodyNames[body]}`,
				source: compassMethod.version
			},
			{
				id: 'compass-ruler-house',
				kind: 'calculated',
				display: `${bodyNames[body]}, regente do MC: ${regent.house === null ? 'casa indisponível' : `casa ${regent.house}`}`,
				source: compassMethod.version
			},
			...privateAspects.aspects.map((a, i) => ({
				id: `private-natal-aspect-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.first]} — ${bodyNames[a.second]}: ${aspectNames[a.kind]}; orbe ${a.orbDegrees.toFixed(3)}°`,
				source: `${privateAspects.algorithmVersion};${compassAspectPolicy.id}@${compassAspectPolicy.version}`
			})),
			...angular.map((a) => ({
				id: a.factId,
				kind: 'calculated' as const,
				display: `${bodyNames[a.body]} junto ao Meio do Céu; distância em longitude ${a.orb.toFixed(3)}°`,
				source: compassMethod.version
			}))
		],
		data: {
			...natal.data,
			productId: 'career-compass',
			natal: structuredClone(natal),
			birth: structuredClone(input.birth),
			method: compassMethod,
			regent,
			privateAspects,
			angular
		},
		limits: [
			...natal.limits.filter((l) => !l.startsWith('Aspectos, síntese interpretativa')),
			'Regência moderna tropical; casas Placidus por intervalos cíclicos com início inclusivo, quando disponíveis. Nenhum sistema substitui casas indisponíveis.',
			'Aspectos maiores: orbes nominais de 6°, sextil de 4°; proximidade ao MC em longitude até 3°. Sem aplicação/separação ou previsão de acontecimentos.',
			'A Bússola propõe hipóteses de contribuição, ambientes e procedimentos para comparar com a experiência. Não determina profissão, renda, competência, contratação ou sucesso.',
			'Formação, saúde, classe, território, acesso, responsabilidades e oportunidades delimitam as escolhas. Experimento privado, reversível e sem despesa; continuidade no ATV+ depende de consentimento próprio.'
		]
	};
}
export function assertCompassProjection(input: WorkflowInput, c: CalculationSnapshot) {
	if (
		c.version !== COMPASS_VERSION ||
		canonical(c.data.birth) !== canonical(input.birth) ||
		canonical(projectCompassReading(input, c.data.natal as CalculationSnapshot)) !== canonical(c)
	)
		throw Error('Bússola divergente da base natal preservada.');
}
