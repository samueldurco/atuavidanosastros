import { interestNavigation } from '$lib/data/public-navigation';
import { editorialContent } from '$lib/data/editorial-content';
import { editorialTopic } from '$lib/data/editorial-topics';
import { publishedEditorial } from '$lib/server/editorial-registry';
import { legacySeo, safeJsonLd } from '$lib/seo';
import { SITE } from '$lib/data/site';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const selected = interestNavigation.find((item) => item.id === url.searchParams.get('tema'));
	const documents = await publishedEditorial();
	const topics = (selected ? [selected] : interestNavigation).map((item) => ({
		id: item.id,
		label: item.label,
		sections: editorialContent[item.id] ?? [],
		articles: documents.filter((document) => editorialTopic(document.path) === item.id)
	}));
	return {
		selected: selected?.id ?? null,
		topics,
		seo: {
			...legacySeo('/caderno')!,
			title: 'Artigos e guias — A Tua Vida nos Astros',
			description:
				'Encontre guias sobre mapa astral, ciclos, relacionamentos, Tarot, carreira e sonhos. Escolha um assunto e continue a leitura.',
			managePrimary: true,
			jsonLd: safeJsonLd({
				'@context': 'https://schema.org',
				'@type': 'CollectionPage',
				name: 'Artigos e guias',
				url: `${SITE.url}/caderno`,
				mainEntity: {
					'@type': 'ItemList',
					itemListElement: topics
						.flatMap((topic) => topic.articles)
						.map((document, index) => ({
							'@type': 'ListItem',
							position: index + 1,
							name: document.title,
							url: `${SITE.url}${document.path}`
						}))
				}
			})
		}
	};
};
