import { error, redirect } from '@sveltejs/kit';
import { isLaunchProductId, launchProductDefinitions, launchSpecs } from '@atv/domain';
import { trialIdentity } from '$lib/server/private-trials';
import { loginHref } from '$lib/auth-return';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, parent, params, url }) => {
	if (!(await parent()).user) redirect(303, loginHref(url.pathname));
	await trialIdentity(locals);
	if (!isLaunchProductId(params.productId)) error(404, 'Produto não encontrado.');
	return {
		product: launchProductDefinitions.find((p) => p.id === params.productId)!,
		spec: launchSpecs[params.productId]
	};
};
