import { getP06PublicProducts } from '$lib/server/shop/p06';
import type { PageServerLoad } from './$types';
export const prerender = false;
export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const products = await getP06PublicProducts();
	return { p06Available: products.length > 0 };
};
