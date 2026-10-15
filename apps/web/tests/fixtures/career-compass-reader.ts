import {
	CaelusEphemerisProvider,
	type EphemerisProvider
} from '../../../../packages/astrology/src';
import { prepareCareerCompassCandidate } from '../../../worker/src/career-compass-candidate';
import { createPurposeCalculators } from '../../../worker/src/purpose-calculators';
import { prepareProductFacts } from '../../../worker/src/product-editorial';
import { CAREER_COMPASS_READER_VERSION } from '../../../worker/src/product-delivery';
import type { WorkflowReaderData } from '../../src/lib/product-run';

/** Local-only fictional inputs shared with the private free-reading review samples. */
const profiles = {
	'ana-carga': {
		id: '00000000-0000-4000-8000-000000000101',
		name: 'Ana',
		time: '00:00:00',
		context: 'Estou sobrecarregada e quero reduzir a carga.'
	},
	'bruno-transicao': {
		id: '00000000-0000-4000-8000-000000000102',
		name: 'Bruno',
		time: '08:00:00',
		context: 'Quero mudar de carreira.'
	},
	'lia-territorio': {
		id: '00000000-0000-4000-8000-000000000103',
		name: 'Lia',
		time: '16:00:00',
		context: 'Quero mudar de cidade por oportunidades de trabalho.'
	}
} as const;

const reviewClock = '2026-10-15T00:00:00.000Z';
const engine = new CaelusEphemerisProvider();
const reviewProvider: EphemerisProvider = {
	name: engine.name,
	version: engine.version,
	async calculate(input) {
		const chart = await engine.calculate(input);
		return {
			...chart,
			provenance: { ...chart.provenance, calculatedAt: reviewClock }
		};
	}
};
const calculate = createPurposeCalculators(reviewProvider)['career-compass'];

/** Preview the engine's blocked reader projection, without creating a release or receipt. */
export async function careerCompassReaderFixture(
	state: string | null,
	profileId: string | null
): Promise<WorkflowReaderData> {
	const profile = profiles[(profileId ?? 'ana-carga') as keyof typeof profiles];
	if (!profile) throw new Error('career_fixture_unknown_profile');
	const localDateTime = `2000-01-01T${profile.time}`;
	const calculation = await calculate(
		{
			version: 'atv-workflow/1.0.0',
			productId: 'career-compass',
			birth: {
				localDateTime,
				utcInstant: `${localDateTime}Z`,
				timezone: 'UTC',
				latitude: 0,
				longitude: 0,
				locationSource: 'synthetic'
			},
			context: profile.context,
			consent: {
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: false,
				continuity: false
			}
		},
		{ runId: profile.id, signal: new AbortController().signal }
	);
	const candidate = await prepareCareerCompassCandidate({
		runId: profile.id,
		revision: 1,
		tier: 'free',
		calculation
	});
	if (
		candidate.status !== 'prepared_for_review' ||
		candidate.publication !== 'blocked' ||
		candidate.delivery.status !== 'prepared_for_review' ||
		candidate.delivery.publication !== 'blocked' ||
		candidate.delivery.content.version !== CAREER_COMPASS_READER_VERSION
	)
		throw new Error('career_fixture_candidate_not_blocked_for_review');
	const prepared = prepareProductFacts('career-compass', calculation);
	if (prepared.status !== 'prepared') throw new Error('career_fixture_calculation_invalid');
	const midheaven = prepared.calculation.facts.find((fact) => fact.id === 'angle-midheaven');
	const claim = candidate.reading.claims.find((item) => item.id === 'midheaven-fact');
	if (
		!midheaven ||
		!claim ||
		claim.text !== midheaven.display ||
		candidate.delivery.content.sections.length !== 6 ||
		candidate.delivery.content.sections[0].evidence[0] !== 'angle-midheaven'
	)
		throw new Error('career_fixture_reader_diverged_from_engine');

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
			id: profile.id,
			title: `Bússola de Carreira — ${profile.name}, perfil fictício`,
			universe: 'proposito-prosperidade',
			created_at: reviewClock
		},
		run: {
			id: profile.id,
			productId: 'career-compass',
			state: states.at(-1)!,
			revision: states.length,
			parentId: null,
			createdAt: reviewClock,
			updatedAt: reviewClock,
			released: ready,
			canReprocess: false,
			libraryItemId: profile.id,
			history: states.map((state, i) => ({ revision: i + 1, state, at: reviewClock })),
			calculation: {
				version: prepared.calculation.version,
				facts: prepared.calculation.facts,
				limits: prepared.calculation.limits
			},
			editorial: ready
				? {
						...candidate.delivery.content,
						promotionId: 'fixture-not-approved',
						reviewDigest: '0'.repeat(64)
					}
				: null
		}
	};
}
