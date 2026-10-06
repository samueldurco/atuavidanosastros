import { productCatalog } from '@atv/domain';
import type { PageServerLoad } from './$types';
import { trialIdentity } from '$lib/server/private-trials';

export const load: PageServerLoad = async ({ setHeaders, locals }) => {
	setHeaders({ 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' });
	const identity = await trialIdentity(locals, false);
	if (!identity)
		return { products: productCatalog, trialAccess: false, readings: [], feedback: [] };
	const [readings, feedback] = await Promise.all([
		identity.supabase
			.from('atv_trial_readings')
			.select('id,product_id,created_at')
			.eq('owner_id', identity.ownerId)
			.order('created_at', { ascending: false })
			.limit(100),
		identity.supabase
			.from('atv_trial_feedback')
			.select('product_id,reading_id,decision,updated_at')
			.eq('owner_id', identity.ownerId)
	]);
	return {
		products: productCatalog,
		trialAccess: true,
		readings: readings.data ?? [],
		feedback: feedback.data ?? [],
		libraryUnavailable: Boolean(readings.error || feedback.error)
	};
};
