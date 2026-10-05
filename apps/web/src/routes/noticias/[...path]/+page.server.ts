import { loadEditorialDocument } from '$lib/server/editorial-load';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ url }) => loadEditorialDocument(url.pathname);
