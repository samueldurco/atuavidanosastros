import { error } from '@sveltejs/kit';
import { parseHoroscopeArchivePath } from '$lib/public-horoscope';
import { loadEditorialDocument } from '$lib/server/editorial-load';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ url }) => {
	if (!parseHoroscopeArchivePath(url.pathname)) error(404, 'Leitura não encontrada.');
	return loadEditorialDocument(url.pathname);
};
