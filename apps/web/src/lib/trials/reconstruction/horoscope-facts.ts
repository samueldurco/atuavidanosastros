import { calculateCrossAspects, type AspectPolicy } from '@atv/astrology';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { validHoroscopeProjection } from '../../../../../worker/src/horoscope-projection';
import { canonical } from '../reading';
import { bodyNames } from './canon';
import { aspectNames, projectDateReading } from './date-facts';

export const HOROSCOPE_VERSION = 'atv-private-horoscope-synthesis/4.0.0';
export const horoscopeAspectPolicy: AspectPolicy = {
	id: 'atv-horoscope-daily-major-aspects',
	version: '1.0.0',
	aspects: ['conjunction', 'sextile', 'square', 'trine', 'opposition'].map((kind) => ({
		kind: kind as AspectPolicy['aspects'][number]['kind'],
		orbDegrees: 2
	}))
};

/** Preserve the original sample and independently bind it to the complete natal chart. */
export function projectHoroscopeReading(
	input: WorkflowInput,
	base: CalculationSnapshot,
	natal: CalculationSnapshot
): CalculationSnapshot {
	if (input.productId !== 'horoscope' || !validHoroscopeProjection(base))
		throw new Error('Base do horóscopo inválida.');
	const verified = projectDateReading(
		{ ...input, productId: 'date-reading' },
		base.data.base as CalculationSnapshot,
		natal
	);
	const second = verified.data.second as { positions: Parameters<typeof calculateCrossAspects>[0] };
	const geometry = {
		...calculateCrossAspects(
			second.positions,
			natal.data.positions as typeof second.positions,
			horoscopeAspectPolicy
		),
		roles: ['daily-sample', 'natal'] as const
	};
	return {
		version: HOROSCOPE_VERSION,
		kind: 'cycles',
		status: 'experimental',
		facts: [
			...verified.facts.filter((f) => !f.id.startsWith('date-transit-')),
			...geometry.aspects.map((a, i) => ({
				id: `horoscope-transit-${i}`,
				kind: 'calculated' as const,
				display: `${bodyNames[a.first]} na amostra em ${aspectNames[a.kind]} com ${bodyNames[a.second]} natal; orbe ${a.orbDegrees.toFixed(6)}°.`,
				source: `${geometry.algorithmVersion};${horoscopeAspectPolicy.id}@${horoscopeAspectPolicy.version};${HOROSCOPE_VERSION}`
			}))
		],
		data: {
			...verified.data,
			productId: 'horoscope',
			base,
			transitGeometry: geometry,
			period: { kind: 'daily', date: input.targetDate, sampleInstant: verified.data.sampleInstant },
			events: [],
			compatibilityScore: null
		},
		limits: verified.limits.map((l) =>
			l.startsWith('Geometria experimental:')
				? 'Horóscopo diário experimental: comparação de dez corpos da data com dez posições natais, cinco aspectos maiores e orbe editorial de 2°. A seleção não certifica a precisão da efeméride.'
				: l
		)
	};
}

export function assertHoroscopeProjection(input: WorkflowInput, value: CalculationSnapshot) {
	if (
		value.version !== HOROSCOPE_VERSION ||
		canonical(value) !==
			canonical(
				projectHoroscopeReading(
					input,
					value.data.base as CalculationSnapshot,
					value.data.natal as CalculationSnapshot
				)
			)
	)
		throw new Error('Horóscopo divergente dos cálculos de origem.');
}
