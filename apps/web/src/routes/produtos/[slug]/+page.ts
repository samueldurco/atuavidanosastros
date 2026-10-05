import { error } from '@sveltejs/kit';
import { customerProducts } from '$lib/data/product-copy';
import { productDetails } from '$lib/data/product-details';
import { SITE } from '$lib/data/site';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const product = customerProducts.find((item) => item.slug === params.slug);
	if (!product) error(404, 'Produto não encontrado.');
	return {
		product,
		details: productDetails[product.id as keyof typeof productDetails],
		seo: {
			title: `${product.name} — ${SITE.name}`,
			description: product.summary,
			path: `/produtos/${product.slug}`,
			indexable: product.state === 'ACTIVE',
			managePrimary: true
		}
	};
};
