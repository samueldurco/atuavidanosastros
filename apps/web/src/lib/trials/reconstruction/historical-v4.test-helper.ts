// Test-only frozen calculation for saved edition 4. Never used by the live generator.
import { calculateAspects, type AspectPosition, type AspectPolicy } from '@atv/astrology';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { createProductCalculators } from '../../../../../worker/src/product-runtime';
import { bodyNames as labels, aspectNames as aspectLabels, modernRulers } from './canon';
const trialAspectPolicy: AspectPolicy = {
	id: 'atv-private-test-major-aspects',
	version: '1.0.0',
	aspects: [
		{ kind: 'conjunction', orbDegrees: 6 },
		{ kind: 'sextile', orbDegrees: 4 },
		{ kind: 'square', orbDegrees: 6 },
		{ kind: 'trine', orbDegrees: 6 },
		{ kind: 'opposition', orbDegrees: 6 }
	]
};
const calculators = createProductCalculators();
export function calculateTrialAngleContacts(
	positions: AspectPosition[],
	angles: { ascendant: number | null; midheaven: number | null }
) {
	return positions.flatMap((p) =>
		(['ascendant', 'midheaven'] as const).flatMap((angle) => {
			const value = angles[angle];
			if (typeof value !== 'number' || !Number.isFinite(value)) return [];
			const distance = Math.abs(p.longitude - value),
				separation = Math.min(distance, 360 - distance);
			return (
				[
					['conjunction', 0],
					['sextile', 60],
					['square', 90],
					['trine', 120],
					['opposition', 180]
				] as const
			).flatMap(([kind, exact]) =>
				Math.abs(separation - exact) <= 3
					? [{ body: p.body, angle, kind, orb: Math.abs(separation - exact) }]
					: []
			);
		})
	);
}

export async function calculateHistoricalNatalV4(
	input: WorkflowInput,
	runId: string
): Promise<CalculationSnapshot> {
	const natal = (await calculators['birth-chart']!(
		{ ...input, productId: 'birth-chart' },
		{ runId, signal: AbortSignal.timeout(25000) }
	)) as CalculationSnapshot;
	const positions = natal.data.positions as AspectPosition[];
	const aspects = calculateAspects(positions, trialAspectPolicy);
	const mc = natal.data.angles as { midheaven: number | null; ascendant: number | null };
	const ruler = mc.midheaven === null ? null : modernRulers[Math.floor(mc.midheaven / 30)];
	const ascRuler = mc.ascendant === null ? null : modernRulers[Math.floor(mc.ascendant / 30)];
	// Fixed three-degree angle policy. Geometry comes from the deterministic calculator.
	const angleContacts = calculateTrialAngleContacts(positions, mc);
	return {
		...natal,
		version: 'atv-private-natal-synthesis/4.0.0',
		facts: [
			...natal.facts,
			...(ascRuler
				? [
						{
							id: 'natal-asc-ruler',
							kind: 'calculated' as const,
							display: `Regente moderno do Ascendente: ${labels[ascRuler]}`,
							source: 'atv-humanistic-modern/1.0.0; natal.angles.ascendant'
						}
					]
				: []),
			...(ruler
				? [
						{
							id: 'career-mc-ruler',
							kind: 'calculated' as const,
							display: `Regente moderno do Meio do Céu: ${labels[ruler]}`,
							source: 'atv-humanistic-modern/1.0.0; natal.angles.midheaven'
						}
					]
				: []),
			...angleContacts.map((a, i) => ({
				id: `private-angle-contact-${i}`,
				kind: 'calculated' as const,
				display: `${labels[a.body]} — ${a.angle === 'ascendant' ? 'Ascendente' : 'Meio do Céu'}: ${aspectLabels[a.kind]}; orbe ${a.orb.toFixed(3)}°`,
				source: 'atv-private-angle-contacts/1.0.0; nominal 3°'
			})),
			...aspects.aspects.map((a, i) => ({
				id: `private-natal-aspect-${i}`,
				kind: 'calculated' as const,
				display: `${labels[a.first]} — ${labels[a.second]}: ${aspectLabels[a.kind]}; orbe ${a.orbDegrees.toFixed(3)}°`,
				source: `${aspects.algorithmVersion};${trialAspectPolicy.id}@${trialAspectPolicy.version}`
			}))
		],
		data: {
			...natal.data,
			productId: input.productId,
			privateAspects: aspects,
			angleContacts,
			natalSynthesis: { version: '4.0.0', ascRuler, rulership: 'modern', angleOrb: 3 },
			career: {
				version: '4.0.0',
				mcRuler: ruler,
				rulership: 'modern',
				houses: [2, 6, 10],
				factors: ['sun', 'mercury', 'mars', 'jupiter', 'saturn']
			}
		},
		limits: [
			...natal.limits.filter((limit) => !limit.startsWith('Aspectos, síntese interpretativa')),
			'Regência moderna tropical; casas Placidus somente quando calculáveis. A leitura não determina profissão nem renda.',
			'Aspectos maiores nominais com orbes de teste; sem certificação de aplicação/separação.'
		]
	};
}
