import { productCatalog } from '@atv/domain';
import type { PageServerLoad } from './$types';
import { trialIdentity } from '$lib/server/private-trials';
import { readTrialLibrary } from '$lib/server/trial-library';
import { withRpcDeadline } from '$lib/server/rpc-deadline';

export const load: PageServerLoad = async ({ setHeaders, locals, url }) => {
	setHeaders({ 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' });
	const identity = await trialIdentity(locals, false);
	if (!identity)
		return { products: productCatalog, trialAccess: false, readings: [], feedback: [] };
	const cursors = url.searchParams.getAll('trialBefore');
	const [library, feedback] = await Promise.all([
		readTrialLibrary(
			identity.supabase,
			identity.ownerId,
			cursors.length > 1 ? '' : (cursors[0] ?? null)
		),
		withRpcDeadline((signal) =>
			identity.supabase
				.from('atv_trial_feedback')
				.select('product_id,reading_id,decision,updated_at')
				.eq('owner_id', identity.ownerId)
				.abortSignal(signal)
		).catch(() => ({ data: null, error: true }))
	]);
	return {
		products: productCatalog,
		trialAccess: true,
		readings: library.readings,
		trialLibrary: library,
		feedback: feedback.data ?? [],
		libraryUnavailable: library.unavailable,
		feedbackUnavailable: Boolean(feedback.error)
	};
};
