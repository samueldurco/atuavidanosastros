import { discoverySeo } from '$lib/seo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ seo: discoverySeo('/signos') });
