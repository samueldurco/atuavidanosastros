import { redirect } from '@sveltejs/kit';
import { launchProductDefinitions } from '@atv/domain';
import { trialIdentity } from '$lib/server/private-trials';
import { loginHref } from '$lib/auth-return';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent, url }) => {
	if (!(await parent()).user) redirect(303, loginHref(url.pathname));
	const identity = (await trialIdentity(locals))!;
	const result = await identity.supabase
		.from('atv_launch_preparations')
		.select('id,product_id,status,created_at')
		.eq('owner_id', identity.ownerId)
		.order('created_at', { ascending: false })
		.limit(100);
	return {
		products: launchProductDefinitions,
		preparations: result.error ? [] : (result.data ?? []),
		storageAvailable: !result.error
	};
};
