import { universes } from '$lib/data/site';
import { customerOffers } from '$lib/data/product-copy';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const selected = universes.find((item) => item.slug === url.searchParams.get('tema'));
	return {
		selected: selected?.slug ?? null,
		groups: (selected ? [selected] : universes).map((universe) => ({
			...universe,
			products: customerOffers.filter((product) => product.universe === universe.productUniverse)
		}))
	};
};
