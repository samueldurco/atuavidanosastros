import { calculateDreamRecord } from '@atv/domain';
import { SCHEMA_VERSION } from '../../../../packages/ai/src/contracts';
import { prepareProductFacts } from '../../../worker/src/product-editorial';
import { prepareProductDelivery } from '../../../worker/src/product-delivery';
import { dreamReadingEditorialTestFixture } from '../../../../scripts/helpers/career-editorial-test-fixture.mjs';
import type { WorkflowReaderData } from '../../src/lib/product-run';

/** Local rendering only: saved owned report, synthetic coverage, no review authority. */
export async function dreamReadingReaderFixture(state: string | null): Promise<WorkflowReaderData> {
	const id = '00000000-0000-4000-8000-000000000149';
	const at = '2026-09-29T12:00:00Z';
	const calculation = await calculateDreamRecord({
		version: 'atv-workflow/1.0.0',
		productId: 'dream-reading',
		dream: {
			date: '2026-09-29',
			narrative:
				'Sonhei com uma porta azul. ' +
				'Uma caminhada pelo jardim. '.repeat(85) +
				'O relato termina aqui.',
			emotions: ['curiosidade', 'tranquilidade'],
			associations: ['Casa antiga', 'Uma mudança recente']
		},
		context: 'Relato sintético consentido.',
		consent: {
			storage: true,
			policyVersion: 'atv-input-consent/1',
			partner: false,
			continuity: false
		}
	});
	const facts = prepareProductFacts('dream-reading', calculation);
	if (facts.status !== 'prepared') throw new Error('dream_reading_fixture_facts_invalid');
	const delivery = await prepareProductDelivery({
		runId: id,
		revision: 4,
		productId: 'dream-reading',
		tier: 'free',
		calculation,
		output: {
			schemaVersion: SCHEMA_VERSION,
			capability: 'dream-exploration',
			scope: 'partial',
			title: 'Leitura Essencial de Sonhos — exemplo sintético',
			limits: [
				'Fixture de apresentação; cobertura sintética, política e significados não aprovados.'
			],
			...dreamReadingEditorialTestFixture(facts.facts)
		}
	});
	if (delivery.status !== 'prepared_for_review')
		throw new Error('dream_reading_fixture_delivery_invalid');
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
			title: 'Leitura Essencial de Sonhos — referência sintética',
			universe: 'sonhos-simbolos',
			created_at: at
		},
		run: {
			id,
			productId: 'dream-reading',
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
