import { launchProducts } from '$lib/data/launch-products';

export const load = () => ({
	debut: launchProducts.filter((product) => product.phase === 'debut'),
	next: launchProducts.filter((product) => product.phase === 'next')
});
