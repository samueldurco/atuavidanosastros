import { publishedEditorial } from '$lib/server/editorial-registry';
import { editorialTopic } from '$lib/data/editorial-topics';
import { homeCatalogHighlights } from '$lib/server/home-catalog-highlights';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const documents = await publishedEditorial();
	// One verified snapshot; favor different interests without reserving hidden article slots.
	const articles = documents.filter((item) => item.kind !== 'horoscope');
	const topics = new Set<string>();
	const varied = articles.filter((item) => {
		const topic = editorialTopic(item.path);
		if (!topic || topics.has(topic)) return false;
		topics.add(topic);
		return true;
	});
	return {
		...homeCatalogHighlights(),
		articles: [...varied, ...articles.filter((item) => !varied.includes(item))].slice(0, 3)
	};
};
