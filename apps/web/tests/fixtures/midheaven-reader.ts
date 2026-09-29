import { SCHEMA_VERSION } from '../../../../packages/ai/src/contracts';
import { createNatalCalculators } from '../../../worker/src/natal-calculators';
import { prepareProductFacts } from '../../../worker/src/product-editorial';
import { prepareProductDelivery } from '../../../worker/src/product-delivery';
import { validateCalculation } from '../../../worker/src/product-processing';
import { midheavenEditorialTestFixture } from '../../../../scripts/helpers/career-editorial-test-fixture.mjs';
import type { WorkflowReaderData } from '../../src/lib/product-run';

/** Local rendering only: experimental calculation, synthetic content, no review authority. */
export async function midheavenReaderFixture(state: string | null): Promise<WorkflowReaderData> {
	const id = '00000000-0000-4000-8000-000000000131';
	const at = '2026-09-28T12:00:00Z';
	const raw = await createNatalCalculators()['midheaven'](
		{
			version: 'atv-workflow/1.0.0',
			productId: 'midheaven',
			birth: {
				localDateTime: '2000-01-01T12:00:00',
				utcInstant: '2000-01-01T12:00:00Z',
				timezone: 'UTC',
				latitude: 0,
				longitude: 0,
				locationSource: 'synthetic'
			},
			consent: {
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: false,
				continuity: false
			}
		},
		{ runId: id, signal: new AbortController().signal }
	);
	const calculation = validateCalculation(raw, 'midheaven');
	if (!calculation) throw new Error('midheaven_fixture_calculation_invalid');
	const facts = prepareProductFacts('midheaven', calculation);
	if (facts.status !== 'prepared') throw new Error('midheaven_fixture_facts_invalid');
	const delivery = await prepareProductDelivery({
		runId: id,
		revision: 4,
		productId: 'midheaven',
		tier: 'free',
		calculation,
		output: {
			schemaVersion: SCHEMA_VERSION,
			capability: 'purpose-direction',
			scope: 'partial',
			title: 'Meio do Céu — exemplo sintético',
			limits: ['Fixture de apresentação; interpretação e motor não homologados.'],
			...midheavenEditorialTestFixture(facts.facts)
		}
	});
	if (delivery.status !== 'prepared_for_review')
		throw new Error('midheaven_fixture_delivery_invalid');
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
		item: { id, title: 'Meio do Céu — referência sintética', universe: 'meu-ceu', created_at: at },
		run: {
			id,
			productId: 'midheaven',
			state: states.at(-1)!,
			revision: states.length,
			parentId: null,
			createdAt: at,
			updatedAt: at,
			released: ready,
			canReprocess: false,
			libraryItemId: id,
			history: states.map((state, i) => ({ revision: i + 1, state, at })),
			cartography: null,
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
