import { createEditorialRead } from '$lib/server/editorial-registry';
import { editorialTopic } from '$lib/data/editorial-topics';
import { homeCatalogHighlights } from '$lib/server/home-catalog-highlights';
import type { PageServerLoad } from './$types';
import { commercialCheckoutEnabled } from '$lib/server/atv-plus-commercial-page';

export const load: PageServerLoad = async ({ platform }) => {
	const articles = await createEditorialRead().summaries((item) => item.kind !== 'horoscope');
	const topics = new Set<string>();
	const varied = articles.filter((item) => {
		const topic = editorialTopic(item.path);
		if (!topic || topics.has(topic)) return false;
		topics.add(topic);
		return true;
	});
	return {
		subscriptionCheckoutEnabled: commercialCheckoutEnabled(platform),
		...homeCatalogHighlights(),
		articles: [...varied, ...articles.filter((item) => !varied.includes(item))].slice(0, 3)
	};
};
