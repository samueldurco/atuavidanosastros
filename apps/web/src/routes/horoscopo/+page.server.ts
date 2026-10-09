import { loadPublicHoroscopeIndex } from '$lib/server/public-horoscope-index';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ url }) => loadPublicHoroscopeIndex(url);
