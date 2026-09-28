import { SCHEMA_VERSION } from '../../../../packages/ai/src/contracts';
import { createNatalCalculators } from '../../../worker/src/natal-calculators';
import { prepareProductFacts } from '../../../worker/src/product-editorial';
import { prepareProductDelivery } from '../../../worker/src/product-delivery';
import { validateCalculation } from '../../../worker/src/product-processing';
import { birthChartEditorialTestFixture } from '../../../../scripts/helpers/career-editorial-test-fixture.mjs';
import type { WorkflowReaderData } from '../../src/lib/product-run';
import { parseProductCartography, CARTOGRAPHY_VERSION } from '../../src/lib/product-cartography';

/** Local rendering only: experimental calculation, synthetic content, no review authority. */
export async function birthChartReaderFixture(state: string | null): Promise<WorkflowReaderData> {
	const id = '00000000-0000-4000-8000-000000000124';
	const at = '2026-09-28T12:00:00Z';
	const rawCalculation = await createNatalCalculators()['birth-chart'](
		{
			version: 'atv-workflow/1.0.0',
			productId: 'birth-chart',
			birth: {
				localDateTime: '2000-01-01T12:00:00',
				utcInstant: '2000-01-01T12:00:00Z',
				timezone: 'UTC',
				latitude: 0,
				longitude: 0,
				locationSource: 'synthetic'
			},
			context: 'Relato pessoal sintético para verificar a apresentação.',
			consent: {
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: false,
				continuity: false
			}
		},
		{ runId: id, signal: new AbortController().signal }
	);
	const calculation = validateCalculation(rawCalculation, 'birth-chart');
	if (!calculation) throw new Error('birth_chart_fixture_calculation_invalid');
	const facts = prepareProductFacts('birth-chart', calculation);
	if (facts.status !== 'prepared') throw new Error('birth_chart_fixture_facts_invalid');
	const delivery = await prepareProductDelivery({
		runId: id,
		revision: 4,
		productId: 'birth-chart',
		tier: 'intermediate',
		calculation,
		output: {
			schemaVersion: SCHEMA_VERSION,
			capability: 'natal-synthesis',
			scope: 'partial',
			title: 'Mapa Astral — exemplo sintético',
			limits: ['Fixture de apresentação; interpretação e motor não homologados.'],
			...birthChartEditorialTestFixture(facts.facts)
		}
	});
	if (delivery.status !== 'prepared_for_review')
		throw new Error('birth_chart_fixture_delivery_invalid');
	const ready = state === 'ready';
	const cartography = parseProductCartography(
		{
			version: CARTOGRAPHY_VERSION,
			sourceVersion: calculation.version,
			zodiac: 'tropical',
			referenceFrame: 'geocentric-apparent-ecliptic-of-date',
			accuracyStatus: 'experimental',
			positions: calculation.data.positions,
			angles: calculation.data.angles,
			houses: calculation.data.houses
		},
		'birth-chart',
		calculation.version
	);
	if (!cartography) throw new Error('birth_chart_fixture_cartography_invalid');
	const states =
		state === 'failed'
			? (['QUEUED', 'FAILED'] as const)
			: ready || state === 'revoked'
				? (['QUEUED', 'CALCULATED', 'AWAITING_EDITORIAL', 'READY'] as const)
				: (['QUEUED', 'CALCULATED', 'AWAITING_EDITORIAL'] as const);
	return {
		state: 'workflow',
		synthetic: true,
		item: { id, title: 'Mapa Astral — referência sintética', universe: 'meu-ceu', created_at: at },
		run: {
			id,
			productId: 'birth-chart',
			state: states.at(-1)!,
			revision: states.length,
			parentId: null,
			createdAt: at,
			updatedAt: at,
			released: ready,
			canReprocess: false,
			libraryItemId: id,
			cartography: ready ? cartography : null,
			history: states.map((state, i) => ({ revision: i + 1, state, at })),
			calculation: {
				version: facts.calculation.version,
				facts: facts.calculation.facts,
				limits: facts.calculation.limits
			},
			editorial: ready
				? { ...delivery.content, promotionId: 'fixture-not-approved', reviewDigest: '0'.repeat(64) }
				: null
		}
	};
}
