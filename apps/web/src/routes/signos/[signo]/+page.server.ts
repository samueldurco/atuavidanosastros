import { error } from '@sveltejs/kit';
import { exploreSigns } from '$lib/data/explore';
import { discoverySeo } from '$lib/seo';
import { createEditorialRead } from '$lib/server/editorial-registry';
import { loadEditorialDocument } from '$lib/server/editorial-load';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const sign = exploreSigns.find((entry) => entry.slug === params.signo);
	if (!sign) error(404, 'Signo não encontrado.');
	const guidePaths = ['/ascendente', '/mapa-astral', '/noticias/2026/10/sol-lua-ascendente'];
	const documents = await createEditorialRead().summaries(
		(entry) => entry.path === url.pathname || guidePaths.includes(entry.path)
	);
	const profile = documents.some((entry) => entry.path === url.pathname)
		? await loadEditorialDocument(url.pathname)
		: null;
	return {
		sign,
		profile,
		articles: documents
			.filter((entry) => guidePaths.includes(entry.path))
			.map(({ path, title }) => ({ path, title })),
		seo: profile?.seo ?? discoverySeo(url.pathname)
	};
};
