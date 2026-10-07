import { error, redirect } from '@sveltejs/kit';
import { loginHref } from '$lib/auth-return';
import { productCatalog } from '@atv/domain';
import { trialIdentity } from '$lib/server/private-trials';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, parent }) => {
	if (!(await parent()).user) redirect(303, loginHref('/testar-produtos/atv-plus'));
	const identity = (await trialIdentity(locals))!;
	const [readings, feedback] = await Promise.all([
		identity.supabase
			.from('atv_trial_readings')
			.select('id,product_id,created_at,version:reading->>version')
			.eq('owner_id', identity.ownerId)
			.order('created_at', { ascending: false })
			.limit(100),
		identity.supabase
			.from('atv_trial_club_feedback')
			.select('*')
			.eq('owner_id', identity.ownerId)
			.maybeSingle()
	]);
	if (readings.error || feedback.error)
		error(503, 'Não foi possível abrir seu clube privado. Tente novamente.');
	return {
		products: productCatalog.filter((p) => p.id !== 'atv-plus'),
		readings: readings.data,
		feedback: feedback.data
	};
};
