import { SCHEMA_VERSION } from '../../../../packages/ai/src/contracts';
import { createPurposeCalculators } from '../../../worker/src/purpose-calculators';
import { prepareProductFacts } from '../../../worker/src/product-editorial';
import { prepareProductDelivery } from '../../../worker/src/product-delivery';
import { careerEditorialTestFixture } from '../../../../scripts/helpers/career-editorial-test-fixture.mjs';
import type { WorkflowReaderData } from '../../src/lib/product-run';

/** Local-only rendering proof: actual experimental MC, synthetic text, no review authority. */
export async function careerCompassReaderFixture(
	state: string | null
): Promise<WorkflowReaderData> {
	const id = '00000000-0000-4000-8000-000000000117';
	const at = '2026-09-28T12:00:00Z';
	const calculation = await createPurposeCalculators()['career-compass'](
		{
			version: 'atv-workflow/1.0.0',
			productId: 'career-compass',
			birth: {
				localDateTime: '2000-01-01T12:00:00',
				utcInstant: '2000-01-01T12:00:00Z',
				timezone: 'UTC',
				latitude: 0,
				longitude: 0,
				locationSource: 'synthetic'
			},
			context: 'Contexto profissional sintético para testar a apresentação.',
			consent: {
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: false,
				continuity: false
			}
		},
		{ runId: id, signal: new AbortController().signal }
	);
	const facts = prepareProductFacts('career-compass', calculation);
	if (facts.status !== 'prepared') throw new Error('career_fixture_facts_invalid');
	const delivery = await prepareProductDelivery({
		runId: id,
		revision: 4,
		productId: 'career-compass',
		tier: 'free',
		calculation,
		output: {
			schemaVersion: SCHEMA_VERSION,
			capability: 'purpose-direction',
			scope: 'partial',
			title: 'Bússola de Carreira — exemplo sintético',
			relations: [],
			limits: ['Fixture de apresentação; interpretação e motor não homologados.'],
			...careerEditorialTestFixture(facts.facts)
		}
	});
	if (delivery.status !== 'prepared_for_review') throw new Error('career_fixture_delivery_invalid');
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
		item: {
			id,
			title: 'Bússola de Carreira — referência sintética',
			universe: 'proposito-prosperidade',
			created_at: at
		},
		run: {
			id,
			productId: 'career-compass',
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
