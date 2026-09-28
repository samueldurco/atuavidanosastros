import { SCHEMA_VERSION } from '../../../../packages/ai/src/contracts';
import { createNatalCalculators } from '../../../worker/src/natal-calculators';
import { prepareProductFacts } from '../../../worker/src/product-editorial';
import { prepareProductDelivery } from '../../../worker/src/product-delivery';
import { threePillarsEditorialTestFixture } from '../../../../scripts/helpers/career-editorial-test-fixture.mjs';
import type { WorkflowReaderData } from '../../src/lib/product-run';

/** Local rendering only: experimental calculation, synthetic content, no review authority. */
export async function threePillarsReaderFixture(state: string | null): Promise<WorkflowReaderData> {
	const id = '00000000-0000-4000-8000-000000000121';
	const at = '2026-09-28T12:00:00Z';
	const calculation = await createNatalCalculators()['three-pillars'](
		{
			version: 'atv-workflow/1.0.0',
			productId: 'three-pillars',
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
	const facts = prepareProductFacts('three-pillars', calculation);
	if (facts.status !== 'prepared') throw new Error('three_pillars_fixture_facts_invalid');
	const delivery = await prepareProductDelivery({
		runId: id,
		revision: 4,
		productId: 'three-pillars',
		tier: 'free',
		calculation,
		output: {
			schemaVersion: SCHEMA_VERSION,
			capability: 'natal-synthesis',
			scope: 'partial',
			title: 'Três Pilares — exemplo sintético',
			limits: ['Fixture de apresentação; interpretação e motor não homologados.'],
			...threePillarsEditorialTestFixture(facts.facts)
		}
	});
	if (delivery.status !== 'prepared_for_review')
		throw new Error('three_pillars_fixture_delivery_invalid');
	const ready = state === 'ready';
	const states =
		state === 'failed'
			? (['QUEUED', 'FAILED'] as const)
			: ready || state === 'revoked'
				? (['QUEUED', 'CALCULATED', 'AWAITING_EDITORIAL', 'READY'] as const)
				: (['QUEUED', 'CALCULATED', 'AWAITING_EDITORIAL'] as const);
	return {
		state: 'workflow',
		synthetic: true,
		item: { id, title: 'Três Pilares — referência sintética', universe: 'meu-ceu', created_at: at },
		run: {
			id,
			productId: 'three-pillars',
			state: states.at(-1)!,
			revision: states.length,
			parentId: null,
			createdAt: at,
			updatedAt: at,
			released: ready,
			canReprocess: false,
			libraryItemId: id,
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
