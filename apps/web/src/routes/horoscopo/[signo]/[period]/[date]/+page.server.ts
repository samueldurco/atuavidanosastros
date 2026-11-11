import { error } from '@sveltejs/kit';
import { horoscopeIndexPath, parseHoroscopeArchivePath } from '$lib/public-horoscope';
import { loadEditorialDocument } from '$lib/server/editorial-load';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ url, fetch }) => {
	const edition = parseHoroscopeArchivePath(url.pathname);
	if (!edition) error(404, 'Leitura não encontrada.');
	return {
		...(await loadEditorialDocument(url.pathname, fetch)),
		indexPath: horoscopeIndexPath(edition.sign, edition.period)
	};
};
