import { getP06PublicProducts } from '$lib/server/shop/p06';
import type { PageServerLoad } from './$types';
export const prerender = false;
export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	return { products: await getP06PublicProducts(), review: false };
};
