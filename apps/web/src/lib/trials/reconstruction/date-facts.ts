import { calculateCrossAspects, type AspectPolicy, type AspectPosition } from '@atv/astrology';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { validDateReadingProjection } from '../../../../../worker/src/date-reading-projection';
import { inspectBirthChartProjection } from '../../../../../worker/src/natal-calculators';
import { bodyNames } from './canon';

export const DATE_VERSION = 'atv-private-date-synthesis/4.0.0';
/** ATVNA's finite editorial selection policy; not a measured ephemeris error bound. */
export const dateAspectPolicy: AspectPolicy = {
	id: 'atv-date-sample-major-aspects',
	version: '1.0.0',
	aspects: ['conjunction', 'sextile', 'square', 'trine', 'opposition'].map((kind) => ({
		kind: kind as AspectPolicy['aspects'][number]['kind'],
		orbDegrees: 2
	}))
};
export const aspectNames: Record<string, string> = {
	conjunction: 'conjunção',
	sextile: 'sextil',
	square: 'quadratura',
	trine: 'trígono',
	opposition: 'oposição'
};
const stable = (value: unknown): string => {
	if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
	if (value && typeof value === 'object')
		return (
			'{' +
			Object.entries(value)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([k, v]) => JSON.stringify(k) + ':' + stable(v))
				.join(',') +
			'}'
		);
	return JSON.stringify(value);
};

/** The old context projection remains intact. Both source calculations are retained. */
export function projectDateReading(
	input: WorkflowInput,
	base: CalculationSnapshot,
	natal: CalculationSnapshot
): CalculationSnapshot {
	if (
		input.productId !== 'date-reading' ||
		!validDateReadingProjection(base) ||
		!inspectBirthChartProjection(natal) ||
		base.data.targetDate !== input.targetDate
	)
		throw new Error('Base da data inválida.');
	const first = base.data.first as {
		positions: AspectPosition[];
		provenance: Record<string, unknown>;
	};
	const second = base.data.second as {
		positions: AspectPosition[];
		provenance: Record<string, unknown>;
	};
	const natalPositions = natal.data.positions as AspectPosition[];
	const withoutTimestamp = (value: Record<string, unknown>) =>
		Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'calculatedAt'));
	const firstProvenance = withoutTimestamp(first.provenance);
	const natalProvenance = withoutTimestamp(natal.data.provenance as Record<string, unknown>);
	if (
		stable(first.positions) !== stable(natalPositions) ||
		stable(firstProvenance) !== stable(natalProvenance) ||
		base.facts.find((f) => f.id === 'personal-context')?.display !== input.context ||
		natal.facts.find((f) => f.id === 'personal-context')?.display !== input.context
	)
		throw new Error('Mapa natal ou contexto divergente.');
	const cross = calculateCrossAspects(second.positions, natalPositions, dateAspectPolicy);
	const geometry = { ...cross, roles: ['date-sample', 'natal'] as const };
	return {
		version: DATE_VERSION,
		kind: 'cycles',
		status: 'experimental',
		facts: [
			...natal.facts.map((fact) => ({
				...fact,
				display: fact.display
					.replace('movimento direto da candidata', 'movimento direto no nascimento')
					.replace('movimento retrógrado da candidata', 'movimento retrógrado no nascimento')
			})),
			...base.facts.filter((f) => f.id.startsWith('sample-')),
			...geometry.aspects.map((a, i) => ({
				id: `date-transit-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.first]} na amostra em ${aspectNames[a.kind]} com ${bodyNames[a.second]} natal; orbe ${a.orbDegrees.toFixed(6)}°.`,
				source: `${geometry.algorithmVersion};${dateAspectPolicy.id}@${dateAspectPolicy.version};${DATE_VERSION}`
			}))
		],
		data: {
			productId: input.productId,
			base,
			natal,
			positions: natal.data.positions,
			angles: natal.data.angles,
			houses: natal.data.houses,
			provenance: natal.data.provenance,
			first: { ...natal.data, role: 'natal' },
			second,
			sampleInstant: base.data.sampleInstant,
			targetDate: input.targetDate,
			transitGeometry: geometry,
			events: [],
			compatibilityScore: null
		},
		limits: [
			...new Set([
				...base.limits.filter(
					(l) =>
						!l.startsWith('Base parcial experimental') &&
						!l.startsWith('Casas, ângulos, aspectos entre mapas')
				),
				'Geometria experimental: dez corpos na amostra comparados com dez posições natais, cinco aspectos maiores e orbe editorial de até 2°. Este orbe não certifica a precisão da efeméride.',
				'Casas e ângulos pertencem ao nascimento. Nenhuma casa da data, local atual ou fuso atual foi inferido.',
				'Não foram calculados aplicação/separação, passagens repetidas, duração dos trânsitos ou eventos exatos. A Lua e os demais corpos podem mudar de relação fora desta amostra.',
				'A interpretação propõe observações e escolhas possíveis; não prevê acontecimentos nem indica datas favoráveis.'
			])
		]
	};
}

export function assertDateProjection(input: WorkflowInput, calculation: CalculationSnapshot) {
	if (
		calculation.version !== DATE_VERSION ||
		stable(
			projectDateReading(
				input,
				calculation.data.base as CalculationSnapshot,
				calculation.data.natal as CalculationSnapshot
			)
		) !== stable(calculation)
	)
		throw new Error('Relações da data sem correspondência com os cálculos de origem.');
}
