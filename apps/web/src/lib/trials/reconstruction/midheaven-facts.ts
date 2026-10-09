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

export const MIDHEAVEN_VERSION = 'atv-private-midheaven/5.0.0';
export const MIDHEAVEN_READING_VERSION = 'atv-midheaven-editorial/5.0.0';
export const midheavenAspectPolicy: AspectPolicy = {
	id: 'atv-midheaven-major-aspects',
	version: '1.0.0',
	aspects: [
		{ kind: 'conjunction', orbDegrees: 6 },
		{ kind: 'sextile', orbDegrees: 4 },
		{ kind: 'square', orbDegrees: 6 },
		{ kind: 'trine', orbDegrees: 6 },
		{ kind: 'opposition', orbDegrees: 6 }
	]
};
export const midheavenMethod = {
	version: 'atv-midheaven-public-direction/1.0.0',
	zodiac: 'tropical',
	rulership: 'modern',
	houseSystem: 'placidus',
	houseMembership: 'cyclic-half-open-start-inclusive',
	aspectPolicy: midheavenAspectPolicy,
	applyingSeparating: false,
	angularOrb: 3,
	selection: {
		maximumRulerAspects: 3,
		maximumMcContacts: 3,
		tieBreak: 'orb-ascending-fact-id-ascending'
	},
	themes: [
		'public-direction',
		'ruler-function',
		'ruler-field',
		'ruler-aspects',
		'mc-contacts',
		'tenth-house',
		'sun-direction',
		'support-and-recognition',
		'context',
		'reversible-practice'
	]
} as const;
const angles = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
export function midheavenAngularContacts(positions: readonly AspectPosition[], mc: number) {
	return positions.flatMap((p) => {
		const distance = Math.abs(p.longitude - mc),
			separation = Math.min(distance, 360 - distance);
		return Object.entries(angles).flatMap(([kind, exact]) => {
			const orb = Math.abs(separation - exact);
			return orb <= midheavenMethod.angularOrb
				? [{ body: p.body, angle: 'midheaven' as const, kind, orb }]
				: [];
		});
	});
}
export type MidheavenData = {
	productId: 'midheaven';
	natal: CalculationSnapshot;
	birth: NonNullable<WorkflowInput['birth']>;
	method: typeof midheavenMethod;
	positions: AspectPosition[];
	angles: { ascendant: number; midheaven: number };
	houses: { status: string; system: string; cusps: number[] };
	regent: { body: string; house: number | null };
	angleContacts: ReturnType<typeof midheavenAngularContacts>;
};
export function projectMidheavenReading(
	input: WorkflowInput,
	natal: CalculationSnapshot
): CalculationSnapshot {
	if (
		!parseWorkflowInput(input) ||
		input.productId !== 'midheaven' ||
		!input.birth ||
		!inspectBirthChartProjection(natal)
	)
		throw Error('Base natal completa necessária para o Meio do Céu.');
	const positions = natal.data.positions as AspectPosition[],
		axis = natal.data.angles as MidheavenData['angles'],
		houses = natal.data.houses as MidheavenData['houses'];
	const provenance = natal.data.provenance as { temporal: { utcInstant: string } };
	if (
		axis.midheaven === null ||
		!Number.isFinite(axis.midheaven) ||
		Date.parse(provenance.temporal.utcInstant) !== Date.parse(input.birth.utcInstant) ||
		(houses.status === 'ok' &&
			Math.abs(input.birth.latitude) >= engineContract.placidusAbsoluteLatitudeExclusive) ||
		natal.facts.find((f) => f.id === 'personal-context')?.display !== input.context
	)
		throw Error('Meio do Céu indisponível ou nascimento/contexto divergente da base natal.');
	const body = modernRulers[Math.floor(axis.midheaven / 30)],
		ruler = positions.find((p) => p.body === body)!;
	const regent = { body, house: purposeHouseAt(ruler.longitude, houses.cusps) },
		privateAspects = calculateAspects(positions, midheavenAspectPolicy),
		angleContacts = midheavenAngularContacts(positions, axis.midheaven);
	return {
		...natal,
		version: MIDHEAVEN_VERSION,
		facts: [
			...natal.facts,
			{
				id: 'career-mc-ruler',
				kind: 'calculated',
				display: `Regente moderno do Meio do Céu: ${bodyNames[body]}`,
				source: midheavenMethod.version
			},
			{
				id: 'midheaven-ruler-house',
				kind: 'calculated',
				display: `${bodyNames[body]}, regente do Meio do Céu: ${regent.house === null ? 'casa indisponível' : `casa ${regent.house}`}`,
				source: midheavenMethod.version
			},
			...privateAspects.aspects.map((a, i) => ({
				id: `private-natal-aspect-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.first]} — ${bodyNames[a.second]}: ${aspectNames[a.kind]}; orbe ${a.orbDegrees.toFixed(3)}°`,
				source: `${privateAspects.algorithmVersion};${midheavenAspectPolicy.id}@${midheavenAspectPolicy.version}`
			})),
			...angleContacts.map((a, i) => ({
				id: `private-angle-contact-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.body]} — Meio do Céu: ${aspectNames[a.kind]}; orbe ${a.orb.toFixed(3)}°`,
				source: midheavenMethod.version
			}))
		],
		data: {
			...natal.data,
			productId: input.productId,
			natal: structuredClone(natal),
			birth: structuredClone(input.birth),
			method: midheavenMethod,
			regent,
			privateAspects,
			angleContacts
		},
		limits: [
			...natal.limits.filter((l) => !l.startsWith('Aspectos, síntese interpretativa')),
			'Leitura humanista tropical com regência moderna: hipóteses de observação, sem diagnóstico ou identidade obrigatória.',
			'Aspectos maiores nominais: 6°, sextil 4°; contatos ao Meio do Céu 3°. Sem aplicação/separação certificada.',
			'O Meio do Céu oferece uma hipótese de direção pública. Regente, casa e relações calculadas qualificam a leitura; não determinam profissão, prestígio ou renda.'
		]
	};
}
export function assertMidheavenProjection(input: WorkflowInput, c: CalculationSnapshot): void {
	const data = c.data as unknown as MidheavenData;
	if (
		c.version !== MIDHEAVEN_VERSION ||
		canonical(data.birth) !== canonical(input.birth) ||
		canonical(projectMidheavenReading(input, data.natal)) !== canonical(c)
	)
		throw Error('Base do Meio do Céu divergente da fonte natal.');
}
