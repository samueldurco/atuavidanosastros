import { createSynastryCalculators } from '../../../worker/src/synastry-calculators';
import { prepareProductFacts } from '../../../worker/src/product-editorial';
import { prepareProductDelivery } from '../../../worker/src/product-delivery';
import { synastryEditorialTestFixture } from '../../../../scripts/helpers/synastry-editorial-test-fixture.mjs';
import type { WorkflowReaderData } from '../../src/lib/product-run';

/** Local rendering only, synthetic structural specimen, no review authority. */
export async function synastryReaderFixture(
	state: string | null,
	withContext = true
): Promise<WorkflowReaderData> {
	const id = '00000000-0000-4000-8000-000000000163';
	const at = '2026-09-29T12:00:00Z';
	const birth = {
		localDateTime: '2000-01-01T12:00:00',
		utcInstant: '2000-01-01T12:00:00Z',
		timezone: 'UTC',
		latitude: 0,
		longitude: 0,
		locationSource: 'synthetic-reader-test'
	};
	const calculation = await createSynastryCalculators({
		id: 'synthetic-synastry-reader-not-approved',
		version: 'qa-fixture-1',
		aspects: [
			{ kind: 'conjunction', orbDegrees: 5 },
			{ kind: 'sextile', orbDegrees: 3 },
			{ kind: 'square', orbDegrees: 5 },
			{ kind: 'trine', orbDegrees: 5 },
			{ kind: 'opposition', orbDegrees: 5 }
		]
	}).synastry(
		{
			version: 'atv-workflow/1.0.0',
			productId: 'synastry',
			birth,
			partner: {
				...birth,
				localDateTime: '2001-07-03T12:00:00',
				utcInstant: '2001-07-03T12:00:00Z'
			},
			consent: {
				storage: true,
				partner: true,
				continuity: false,
				policyVersion: 'atv-input-consent/1'
			},
			...(withContext
				? { context: 'Contexto sintético consentido: conversar sobre autonomia e reparação.' }
				: {})
		},
		{ runId: id, signal: new AbortController().signal }
	);
	const facts = prepareProductFacts('synastry', calculation);
	if (facts.status !== 'prepared') throw new Error('synastry_fixture_facts_invalid');
	const delivery = await prepareProductDelivery({
		runId: id,
		revision: 4,
		productId: 'synastry',
		tier: 'premium',
		calculation,
		output: synastryEditorialTestFixture(facts.facts)
	});
	if (delivery.status !== 'prepared_for_review')
		throw new Error(`synastry_fixture_delivery_invalid:${delivery.reason}`);
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
			title: 'Sinastria — referência sintética',
			universe: 'amor-relacoes',
			created_at: at
		},
		run: {
			id,
			productId: 'synastry',
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
			calculation: ready
				? {
						version: facts.calculation.version,
						facts: facts.calculation.facts,
						limits: facts.calculation.limits
					}
				: null,
			editorial: ready
				? { ...delivery.content, promotionId: 'fixture-not-approved', reviewDigest: '0'.repeat(64) }
				: null
		}
	};
}
