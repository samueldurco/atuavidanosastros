import { publishedEditorial } from '$lib/server/editorial-registry';
import { editorialTopic } from '$lib/data/editorial-topics';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const documents = await publishedEditorial();
	// The home only promotes published documents, with a different subject in each slot.
	const topics = ['meu-ceu', 'proposito', 'amor'];
	return {
		articles: topics.flatMap((topic) => {
			const document = documents.find((item) => editorialTopic(item.path) === topic);
			return document ? [document] : [];
		})
	};
};
