import { calculateAspects, engineContract, type AspectPosition } from '@atv/astrology';
import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { inspectLifeAtlasProjection } from '../../../../../worker/src/life-atlas-calculators';
import { atlasPriorityFor, validAtlasChoices } from '../../atlas-priorities';
import { canonical } from '../reading';
import { bodyNames } from './canon';
import { purposeAspectPolicy } from './purpose-facts';

export const ATLAS_VERSION = 'atv-private-life-atlas/4.0.0';
export const atlasAspectPolicy = { ...purposeAspectPolicy, id: 'atv-atlas-natal-major-aspects' };
export const atlasMethod = {
	version: 'atv-atlas-priority-clusters/1.0.0',
	priorities: 'four-distinct-reported-areas-in-exact-order',
	correspondence: 'explicit-modern-symbolic-associations-not-measurements',
	houseMembership: 'cyclic-half-open-start-inclusive',
	selection: 'role-weight-plus-house-relevance;three-functions;two-linked-aspects',
	aspectPolicy: atlasAspectPolicy,
	applyingSeparating: false,
	path: [7, 14, 21, 30]
} as const;
export type AtlasData = {
	productId: 'life-atlas';
	native: CalculationSnapshot;
	natal: CalculationSnapshot;
	birth: NonNullable<WorkflowInput['birth']>;
	priorities: [string, string, string, string];
	priorityIds: string[];
	method: typeof atlasMethod;
};
/** Preserve the full native projection; editorial associations never change natal geometry. */
export function projectAtlasReading(
	input: WorkflowInput,
	native: CalculationSnapshot
): CalculationSnapshot {
	if (
		!parseWorkflowInput(input) ||
		input.productId !== 'life-atlas' ||
		!input.birth ||
		!input.atlas ||
		!validAtlasChoices(input.atlas.priorities) ||
		!inspectLifeAtlasProjection(native)
	)
		throw Error('Escolha quatro áreas distintas entre as opções do Atlas da Vida.');
	const natal = native.data.natal as CalculationSnapshot,
		provenance = natal.data.provenance as { temporal: { utcInstant: string } },
		houses = natal.data.houses as { status: string };
	if (
		canonical(native.data.priorities) !== canonical(input.atlas.priorities) ||
		Date.parse(provenance.temporal.utcInstant) !== Date.parse(input.birth.utcInstant) ||
		(houses.status === 'ok' &&
			Math.abs(input.birth.latitude) >= engineContract.placidusAbsoluteLatitudeExclusive) ||
		natal.facts.find((f) => f.id === 'personal-context')?.display !== input.context
	)
		throw Error('Prioridades, nascimento ou contexto divergentes da fonte do Atlas.');
	const privateAspects = calculateAspects(
		natal.data.positions as AspectPosition[],
		atlasAspectPolicy
	);
	const aspectLabels: Record<string, string> = {
		conjunction: 'conjunção',
		sextile: 'sextil',
		square: 'quadratura',
		trine: 'trígono',
		opposition: 'oposição'
	};
	return {
		...native,
		version: ATLAS_VERSION,
		facts: [
			...native.facts,
			{
				id: 'atlas-method',
				kind: 'reported',
				display:
					'As áreas e sua ordem foram escolhidas pela pessoa; as associações simbólicas são uma decisão editorial explícita.',
				source: atlasMethod.version
			},
			...privateAspects.aspects.map((a, i) => ({
				id: `private-natal-aspect-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.first]} — ${bodyNames[a.second]}: ${aspectLabels[a.kind]}; orbe ${a.orbDegrees.toFixed(3)}°`,
				source: `${privateAspects.algorithmVersion};${atlasAspectPolicy.id}@${atlasAspectPolicy.version}`
			}))
		],
		data: {
			...natal.data,
			productId: 'life-atlas',
			native: structuredClone(native),
			natal: structuredClone(natal),
			birth: structuredClone(input.birth),
			priorities: structuredClone(input.atlas.priorities),
			priorityIds: input.atlas.priorities.map((p) => atlasPriorityFor(p)!.id),
			method: atlasMethod,
			privateAspects
		},
		limits: [
			...natal.limits.filter((l) => !l.startsWith('Aspectos, síntese interpretativa')),
			'Prioridades são escolhas relatadas. As associações de casas e funções são simbólicas e editoriais, sem medir importância, necessidade, competência ou futuro.',
			'Casas Placidus quando disponíveis, pertencimento por intervalo cíclico com início inclusivo. Casas indisponíveis não são substituídas; aspectos maiores com orbes de 6°, sextil de 4°, sem aplicação/separação.',
			'Trinta dias são um roteiro relativo de observação, não um prazo previsto pelo céu. Os registros descrevem experiências, sem comprovar evolução ou sucesso.',
			'Experimentos sem despesa, privados e reversíveis; condições de saúde, classe, território, acesso e responsabilidades delimitam as escolhas. Sem diagnóstico ou prescrição profissional.'
		]
	};
}
export function assertAtlasProjection(input: WorkflowInput, c: CalculationSnapshot) {
	if (
		c.version !== ATLAS_VERSION ||
		canonical(c.data.birth) !== canonical(input.birth) ||
		canonical(projectAtlasReading(input, c.data.native as CalculationSnapshot)) !== canonical(c)
	)
		throw Error('Atlas divergente de sua fonte e prioridades preservadas.');
}
