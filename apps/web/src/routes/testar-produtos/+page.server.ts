import { productCatalog } from '@atv/domain';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ setHeaders }) => {
	setHeaders({ 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' });
	return { products: productCatalog };
};
