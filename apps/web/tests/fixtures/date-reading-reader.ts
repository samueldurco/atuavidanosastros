import { createContextCalculators } from '../../../worker/src/context-calculators';
import { SCHEMA_VERSION } from '../../../../packages/ai/src/contracts';
import { prepareProductFacts } from '../../../worker/src/product-editorial';
import { prepareProductDelivery } from '../../../worker/src/product-delivery';
import { dateReadingEditorialTestFixture } from '../../../../scripts/helpers/career-editorial-test-fixture.mjs';
import type { WorkflowReaderData } from '../../src/lib/product-run';

/** Local rendering only: saved owned report, synthetic coverage, no review authority. */
export async function dateReadingReaderFixture(
	state: string | null,
	withContext = true
): Promise<WorkflowReaderData> {
	const id = '00000000-0000-4000-8000-000000000152';
	const at = '2026-09-29T12:00:00Z';
	const calculation = await createContextCalculators()['date-reading'](
		{
			version: 'atv-workflow/1.0.0',
			productId: 'date-reading',
			targetDate: '2026-09-29',
			birth: {
				localDateTime: '2000-01-01T09:00:00',
				utcInstant: '2000-01-01T12:00:00Z',
				timezone: 'UTC-03:00',
				latitude: 70,
				longitude: -40,
				locationSource: 'synthetic-reader-test'
			},
			consent: {
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: false,
				continuity: false
			},
			...(withContext
				? { context: 'Contexto sintético consentido. Uma escolha que gostaria de observar.' }
				: {})
		},
		{ runId: id, signal: new AbortController().signal }
	);
	const facts = prepareProductFacts('date-reading', calculation);
	if (facts.status !== 'prepared') throw new Error('date_reading_fixture_facts_invalid');
	const delivery = await prepareProductDelivery({
		runId: id,
		revision: 4,
		productId: 'date-reading',
		tier: 'free',
		calculation,
		output: {
			schemaVersion: SCHEMA_VERSION,
			capability: 'cycle-context',
			scope: 'partial',
			title: 'Leitura da Data — exemplo sintético',
			limits: [
				'Fixture de apresentação; cobertura sintética, política e significados não aprovados.'
			],
			...dateReadingEditorialTestFixture(facts.facts)
		}
	});
	if (delivery.status !== 'prepared_for_review')
		throw new Error('date_reading_fixture_delivery_invalid');
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
			title: 'Leitura da Data — referência sintética',
			universe: 'ciclos-tempo',
			created_at: at
		},
		run: {
			id,
			productId: 'date-reading',
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
