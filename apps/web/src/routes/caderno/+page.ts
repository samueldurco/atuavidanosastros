import { interestNavigation } from '$lib/data/public-navigation';
import { editorialContent } from '$lib/data/editorial-content';
import { legacySeo } from '$lib/seo';

export function load({ url }: { url: URL }) {
	const selected = interestNavigation.find((item) => item.id === url.searchParams.get('tema'));
	const topics = (selected ? [selected] : interestNavigation).map((item) => ({
		id: item.id,
		label: item.label,
		sections: editorialContent[item.id] ?? []
	}));
	return {
		selected: selected?.id ?? null,
		topics,
		seo: {
			...legacySeo('/caderno')!,
			title: 'Artigos e guias — A Tua Vida nos Astros',
			managePrimary: true
		}
	};
}
