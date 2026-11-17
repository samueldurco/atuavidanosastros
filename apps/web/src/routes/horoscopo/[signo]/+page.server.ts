import { loadPublicHoroscopeIndex } from '$lib/server/public-horoscope-index';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url, params, fetch }) =>
	loadPublicHoroscopeIndex(url, fetch, params.signo);
