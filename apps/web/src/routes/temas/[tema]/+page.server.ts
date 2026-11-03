import { error } from '@sveltejs/kit';
import { interestNavigation } from '$lib/data/public-navigation';
import { freeTools } from '$lib/data/free-tools';
import { customerOffers } from '$lib/data/product-copy';
import { productDetails } from '$lib/data/product-details';
import { editorialTopicPaths, topicIntroductions } from '$lib/data/editorial-topics';
import { signWithHoroscope } from '$lib/server/editorial';
import { publishedEditorial } from '$lib/server/editorial-registry';
import { discoverySeo, safeJsonLd } from '$lib/seo';
import { SITE, signs } from '$lib/data/site';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const topic = interestNavigation.find((item) => item.slug === params.tema);
	if (!topic) error(404, 'Tema não encontrado.');
	const tools = freeTools.filter((tool) => tool.topicId === topic.id);
	const startHref = topic.id === 'meu-ceu' ? '/ferramentas/mapa-astral' : topic.toolHref;
	const products = customerOffers
		.filter((product) => product.universe === topic.productUniverse)
		.map((product) => ({
			...product,
			details: productDetails[product.id as keyof typeof productDetails]
		}));
	const published = await publishedEditorial();
	const signArchive = topic.id === 'ciclos' ? new Set(published.map(signWithHoroscope)) : null;
	const articles = editorialTopicPaths[topic.id].flatMap((path) => {
		const guide = published.find((document) => document.kind === 'guide' && document.path === path);
		return guide
			? [{ id: guide.id, path: guide.path, title: guide.title, description: guide.description }]
			: [];
	});
	return {
		topic,
		introduction: topicIntroductions[topic.id],
		startTool: tools.find((tool) => tool.href === startHref),
		tools,
		products,
		articles,
		horoscopeSigns: signArchive ? signs.filter((sign) => signArchive.has(sign)) : [],
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
