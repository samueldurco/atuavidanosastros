import { loadEditorialHub } from '$lib/server/editorial-load';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = () => loadEditorialHub('/horoscopo');
