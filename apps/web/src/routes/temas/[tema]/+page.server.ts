import { error } from '@sveltejs/kit';
import { interestNavigation } from '$lib/data/public-navigation';
import { freeTools } from '$lib/data/free-tools';
import { customerOffers } from '$lib/data/product-copy';
import { productDetails } from '$lib/data/product-details';
import { editorialTopic } from '$lib/data/editorial-topics';
import { publishedEditorial } from '$lib/server/editorial-registry';
import { discoverySeo, safeJsonLd } from '$lib/seo';
import { SITE } from '$lib/data/site';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const topic = interestNavigation.find((item) => item.slug === params.tema);
	if (!topic) error(404, 'Tema não encontrado.');
	const tools = freeTools.filter((tool) => tool.topicId === topic.id);
	const products = customerOffers
		.filter((product) => product.universe === topic.productUniverse)
		.map((product) => ({
			...product,
			details: productDetails[product.id as keyof typeof productDetails]
		}));
	const articles = (await publishedEditorial())
		.filter((document) => editorialTopic(document.path) === topic.id)
		.slice(0, 3);
	return {
		topic,
		tools,
		products,
		articles,
		seo: {
			...discoverySeo(topic.href)!,
			jsonLd: safeJsonLd({
				'@context': 'https://schema.org',
				'@type': 'CollectionPage',
				name: topic.label,
				description: topic.description,
				url: `${SITE.url}${topic.href}`,
				mainEntity: {
					'@type': 'ItemList',
					itemListElement: [...tools, ...products].map((item, index) => ({
						'@type': 'ListItem',
						position: index + 1,
						name: 'label' in item ? item.label : item.name,
						url: `${SITE.url}${item.href}`
					}))
				}
			})
		}
	};
};
