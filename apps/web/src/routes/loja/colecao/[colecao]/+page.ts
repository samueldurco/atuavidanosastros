import { error } from '@sveltejs/kit';
import { getShopCollection } from '$lib/data/shop-collections';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const collection = getShopCollection(params.colecao);
	if (!collection || collection.href !== `/loja/colecao/${params.colecao}`) {
		error(404, 'Coleção não encontrada');
	}
	return { collection };
};
