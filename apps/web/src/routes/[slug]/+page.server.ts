import type { PageServerLoad } from './$types';
import { evergreenGuidePaths } from '$lib/seo';
import { loadEditorialDocument } from '$lib/server/editorial-load';
import { publishedEditorial } from '$lib/server/editorial-registry';

export const load: PageServerLoad = async ({ url }) => {
	if (!evergreenGuidePaths.some((path) => path === url.pathname)) return { document: null };
	const document = (await publishedEditorial()).find((entry) => entry.path === url.pathname);
	return document ? loadEditorialDocument(url.pathname) : { document: null };
};
