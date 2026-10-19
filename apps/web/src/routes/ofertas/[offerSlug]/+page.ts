import { error } from '@sveltejs/kit';
import { contextualOfferForSlug } from '$lib/data/contextual-offers';
import { customerOffers } from '$lib/data/product-copy';
import { productDetails } from '$lib/data/product-details';
import { SITE } from '$lib/data/site';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const presentation = contextualOfferForSlug(params.offerSlug);
	if (!presentation) error(404, 'Apresentação não encontrada.');
	const source = customerOffers.find((item) => item.id === presentation.sourceId);
	const product = customerOffers.find((item) => item.id === presentation.targetId);
	if (!source || !product) error(404, 'Produto não encontrado.');
	return {
		presentation,
		source,
		product,
		sourceDetails: productDetails[source.id as keyof typeof productDetails],
		productDetails: productDetails[product.id as keyof typeof productDetails],
		seo: {
			title: `${presentation.headline} — ${SITE.name}`,
			description: presentation.opening,
			path: `/ofertas/${params.offerSlug}`,
			indexable: false,
			managePrimary: true
		}
	};
};
