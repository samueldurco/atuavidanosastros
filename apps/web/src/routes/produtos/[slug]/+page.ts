import { error, redirect } from '@sveltejs/kit';
import { productDefinitionForSlug } from '@atv/domain';
import { customerOffers } from '$lib/data/product-copy';
import { productDetails } from '$lib/data/product-details';
import { SITE } from '$lib/data/site';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const definition = productDefinitionForSlug(params.slug);
	if (definition && definition.slug !== params.slug) redirect(308, `/produtos/${definition.slug}`);
	const product = customerOffers.find((item) => item.id === definition?.id);
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
