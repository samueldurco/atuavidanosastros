import { publishedEditorial } from '$lib/server/editorial-registry';
import { editorialTopic } from '$lib/data/editorial-topics';
import { universes } from '$lib/data/site';
import { homeCatalogHighlights } from '$lib/server/home-catalog-highlights';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const documents = await publishedEditorial();
	// One verified snapshot per request; contextual slots do not repeat in the magazine.
	const contextualArticles = Object.fromEntries(
		universes.map((universe) => [
			universe.slug,
			documents.find((item) => editorialTopic(item.path) === universe.slug)
		])
	);
	const used = new Set(
		Object.values(contextualArticles)
			.filter(Boolean)
			.map((item) => item!.path)
	);
	return {
		...homeCatalogHighlights(),
		contextualArticles,
		articles: documents
			.filter((item) => !used.has(item.path) && item.kind !== 'horoscope')
			.slice(0, 3)
	};
};
