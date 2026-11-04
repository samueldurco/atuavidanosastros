import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import {
	isLaunchProductId,
	launchProductDefinitions,
	launchSpecs,
	LAUNCH_INPUT_VERSION,
	prepareLaunchEvidence,
	parseLaunchInput,
	type LaunchAnswer
} from '@atv/domain';
import type { LaunchPreparation } from '$lib/server/launch-preparations';
import { calculateLaunchFacts } from '$lib/server/launch-calculation';
import {
	canComposeLaunchReading,
	composeLaunchReading,
	evaluateLaunchReading,
	type LaunchReading,
	type LaunchReadingReview
} from '$lib/trials/launch-reading';
import { launchExampleInputs, launchExampleExecutionId } from '$lib/trials/launch-reading.fixtures';
import type { PageServerLoad } from './$types';

// Local rendering evidence only. This route never grants access or persists data.
export const load: PageServerLoad = async ({ url, setHeaders }) => {
	if (!dev || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) error(404);
	setHeaders({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
	const productId = url.searchParams.get('product') ?? 'wedding-date-map';
	if (!isLaunchProductId(productId)) error(404);
	const product = launchProductDefinitions.find((item) => item.id === productId)!;
	const spec = launchSpecs[productId];
	const view = url.searchParams.get('view');
	const exampleIndex = launchExampleInputs.findIndex((item) => item.productId === productId);
	const birth = {
		localDateTime: '1990-05-10T10:30:00',
		utcInstant: '1990-05-10T13:30:00Z',
		timezone: 'America/Sao_Paulo',
		latitude: -23.55,
		longitude: -46.63,
		locationSource: 'synthetic'
	};
	const answers: Record<string, LaunchAnswer> = {};
	for (const field of spec.fields) {
		if (field.type === 'adult-confirmation') answers[field.key] = true;
		else if (field.type === 'date') answers[field.key] = '2027-05-10';
		else if (field.type === 'list')
			answers[field.key] = Array.from(
				{ length: field.minItems ?? 1 },
				(_, i) => `Item sintético ${i + 1}`
			);
		else if (field.type === 'ceremony-options')
			answers[field.key] = [10, 11].map((day, i) => ({
				...birth,
				label: `Opção ${i + 1}`,
				city: 'São Paulo',
				localDateTime: `2027-05-${day}T10:30:00`,
				utcInstant: `2027-05-${day}T13:30:00Z`
			}));
		else answers[field.key] = 'Situação sintética para conferir a interface.';
	}
	const input = parseLaunchInput(
		view === 'reader'
			? launchExampleInputs[exampleIndex]
			: {
					version: LAUNCH_INPUT_VERSION,
					productId,
					consent: { storage: true, policyVersion: 'atv-launch-consent/1' },
					answers,
					...(spec.requiresBirth ? { birth } : {})
				}
	);
	if (!input) error(500, 'Fixture inválida.');
	const id =
		view === 'reader'
			? launchExampleExecutionId(exampleIndex)
			: '8c6d9da2-d296-4b63-a30c-42ec8762f48f';
	const evidence = await prepareLaunchEvidence(input, id);
	// The saved-view fixture is deliberately a receipt, never a calculated/approved reading.
	const preparation: LaunchPreparation = {
		id,
		owner_id: '6cd36058-5a39-4b39-a97f-08285621cb51',
		// Repeated UUID is a local rendering fixture, never a credential.
		request_key: '22222222-2222-4222-8222-222222222222',
		product_id: productId,
		input,
		input_digest: evidence.inputDigest,
		evidence,
		status: 'AWAITING_CALCULATION',
		created_at: '2026-11-04T12:00:00Z'
	};
	let reader: LaunchReading | null = null;
	let readingReview: LaunchReadingReview | null = null;
	if (view === 'reader' && canComposeLaunchReading(productId)) {
		const calculation = await calculateLaunchFacts(input, id);
		reader = await composeLaunchReading(input, calculation);
		readingReview = await evaluateLaunchReading(input, calculation, reader);
	}
	return {
		product,
		spec,
		preparation,
		canCalculate: false,
		canCompose: false,
		savedReading: null,
		feedback: [],
		feedbackHistoryAvailable: false,
		reader,
		readingReview,
		view: view === 'reader' ? 'reader' : view === 'saved' ? 'saved' : 'intake'
	};
};
