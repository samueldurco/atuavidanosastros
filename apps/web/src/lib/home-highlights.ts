/** Only dated, published entries can become automatic home news. Catalog state stays canonical. */
export interface HomeHighlight {
	id: string;
	title: string;
	href: string;
	status: 'PUBLISHED' | 'PREPARING' | 'DRAFT' | 'PAUSED';
	publishedAt?: string;
	topicId?: string;
	image?: string;
	fallbackIllustration?: string;
}

export function selectHomeHighlights(
	items: readonly HomeHighlight[],
	{
		topic,
		excluded = [],
		limit = 3,
		now = Date.now()
	}: {
		topic?: string;
		excluded?: readonly string[];
		limit?: number;
		now?: number;
	} = {}
) {
	return items
		.filter(
			(item) =>
				item.status === 'PUBLISHED' &&
				item.title &&
				item.href.startsWith('/') &&
				!item.href.startsWith('//') &&
				(item.image || item.fallbackIllustration) &&
				(!topic || item.topicId === topic) &&
				!excluded.includes(item.href) &&
				Number.isFinite(Date.parse(item.publishedAt ?? '')) &&
				Date.parse(item.publishedAt!) <= now
		)
		.sort(
			(a, b) =>
				Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!) ||
				a.href.localeCompare(b.href, 'pt-BR')
		)
		.filter((item, index, all) => all.findIndex((other) => other.href === item.href) === index)
		.slice(0, limit);
}
