import { calculateTarot } from '@atv/domain';
import { SCHEMA_VERSION } from '../../../../packages/ai/src/contracts';
import { prepareProductFacts } from '../../../worker/src/product-editorial';
import { prepareProductDelivery } from '../../../worker/src/product-delivery';
import { threeQuestionsEditorialTestFixture } from '../../../../scripts/helpers/career-editorial-test-fixture.mjs';
import type { WorkflowReaderData } from '../../src/lib/product-run';

/** Local rendering only: saved deterministic draw, synthetic coverage, no review authority. */
export async function threeQuestionsReaderFixture(
	state: string | null
): Promise<WorkflowReaderData> {
	const id = '00000000-0000-4000-8000-000000000143';
	const at = '2026-09-29T12:00:00Z';
	const calculation = await calculateTarot(
		{
			version: 'atv-workflow/1.0.0',
			productId: 'three-questions',
			questions: [
				'Que possibilidade posso observar?',
				'Que limite quero reconhecer?',
				'Que alternativa posso experimentar?'
			],
			context: 'Relato sintético consentido.',
			consent: {
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: false,
				continuity: false
			}
		},
		id,
		new AbortController().signal
	);
	const facts = prepareProductFacts('three-questions', calculation);
	if (facts.status !== 'prepared') throw new Error('three_questions_fixture_facts_invalid');
	const delivery = await prepareProductDelivery({
		runId: id,
		revision: 4,
		productId: 'three-questions',
		tier: 'free',
		calculation,
		output: {
			schemaVersion: SCHEMA_VERSION,
			capability: 'tarot-reflection',
			scope: 'partial',
			title: 'Três Perguntas — exemplo sintético',
			limits: [
				'Fixture de apresentação; cobertura sintética, política e significados não aprovados.'
			],
			...threeQuestionsEditorialTestFixture(facts.facts)
		}
	});
	if (delivery.status !== 'prepared_for_review')
		throw new Error('three_questions_fixture_delivery_invalid');
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
			title: 'Três Perguntas — referência sintética',
			universe: 'tarot-arcanos',
			created_at: at
		},
		run: {
			id,
			productId: 'three-questions',
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
