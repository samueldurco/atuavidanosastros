import { error } from '@sveltejs/kit';
import { shopPreviews } from '$lib/data/shop-products';
import { isShopCommerceEligible } from '$lib/data/shop-commerce';
import type { PageLoad } from './$types';
export const load: PageLoad = async ({ params, parent }) => {
	const piece = shopPreviews.find((item) => item.slug === params.slug);
	if (!piece) error(404, 'Peça não encontrada');
	return {
		piece,
		purchaseEligible: isShopCommerceEligible(piece.slug, (await parent()).ariesOnly)
	};
};
