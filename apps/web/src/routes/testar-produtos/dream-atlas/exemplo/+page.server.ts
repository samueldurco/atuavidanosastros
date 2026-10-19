import { plusOwnerIdentity } from '$lib/server/atv-plus';
import { dreamAtlasExample } from '$lib/server/dream-atlas-example';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	await plusOwnerIdentity(locals);
	setHeaders({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
	return { saved: await dreamAtlasExample() };
};
