import { freeTools } from '$lib/data/free-tools';
import { interestNavigation } from '$lib/data/public-navigation';
import { discoverySeo } from '$lib/seo';

export function load() {
	return { tools: freeTools, topics: interestNavigation, seo: discoverySeo('/ferramentas') };
}
