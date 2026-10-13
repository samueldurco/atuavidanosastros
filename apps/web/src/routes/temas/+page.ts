import { interestNavigation } from '$lib/data/public-navigation';
import { discoverySeo } from '$lib/seo';

export function load() {
	return { topics: interestNavigation, seo: discoverySeo('/temas') };
}
