import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { p06Products } from '@atv/integrations';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
export const prerender = false;
export const load: PageServerLoad = ({ url, getClientAddress, setHeaders }) => {
	if (
		!dev ||
		env.ATV_P06_LOCAL_REVIEW !== 'true' ||
		!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
		!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(getClientAddress())
	)
		error(404);
	setHeaders({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
	return {
		products: p06Products.map((product) => ({ ...product, available: false })),
		review: true
	};
};
