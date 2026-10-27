import { error } from '@sveltejs/kit';
import { shopPreviews } from '$lib/data/shop-products';
import type { PageLoad } from './$types';
export const load: PageLoad = ({ params }) => {
	const piece = shopPreviews.find((item) => item.slug === params.slug);
	if (!piece) error(404, 'Peça não encontrada');
	return { piece };
};
