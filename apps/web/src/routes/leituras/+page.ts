import { universes } from '$lib/data/site';
import { customerOffers } from '$lib/data/product-copy';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	return {
		groups: universes.map((universe) => ({
			...universe,
			products: customerOffers.filter((product) => product.universe === universe.productUniverse)
		}))
	};
};
