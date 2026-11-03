import { loadEditorialDocument } from '$lib/server/editorial-load';
import { loadPublicHoroscopeIndex } from '$lib/server/public-horoscope-index';
import { createEditorialRead } from '$lib/server/editorial-registry';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ url, params }) => {
	// Preserve a signed legacy article at its original canonical path.
	const [legacy] = await createEditorialRead().summaries((entry) => entry.path === url.pathname);
	if (legacy) return { mode: 'article' as const, ...(await loadEditorialDocument(url.pathname)) };
	return { mode: 'index' as const, ...(await loadPublicHoroscopeIndex(url, params.signo)) };
};
