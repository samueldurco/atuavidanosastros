import { error } from '@sveltejs/kit';
import { interestNavigation } from '$lib/data/public-navigation';
import { editorialTopic } from '$lib/data/editorial-topics';
import { publishedEditorial } from '$lib/server/editorial-registry';
import { subscribeToMagazineBulletin } from '$lib/server/magazine-bulletin';
import { horoscopeIndexPath, parseHoroscopeArchivePath } from '$lib/public-horoscope';
import { legacySeo, safeJsonLd } from '$lib/seo';
import { SITE, signs, signNames } from '$lib/data/site';
import type { Actions, PageServerLoad } from './$types';

const pageSize = 9;
const featuredPaths = ['/mercurio-retrogrado', '/noticias/2026/10/fases-da-lua', '/mapa-astral'];
const kindLabels: Record<string, string> = {
	guide: 'Guia',
	reporting: 'Artigo',
	column: 'Coluna',
	'sign-profile': 'Perfil de signo',
	horoscope: 'Horóscopo',
	compatibility: 'Relacionamentos'
};
const periodLabels = { daily: 'diário', weekly: 'semanal', monthly: 'mensal' };
const commonWords = new Set([
	'a',
	'o',
	'as',
	'os',
	'de',
	'da',
	'do',
	'das',
	'dos',
	'e',
	'em',
	'na',
	'no',
	'para'
]);
const date = new Intl.DateTimeFormat('pt-BR', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC'
});
const words = (value: string) =>
	value
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLocaleLowerCase('pt-BR')
		.match(/[\p{L}\p{N}]+/gu) ?? [];

type Entry = {
	id: string;
	path: string;
	title: string;
	description: string;
	kindLabel: string;
	publishedAt: string;
	topicId: (typeof interestNavigation)[number]['id'] | undefined;
	editions?: { path: string; sign: (typeof signs)[number] }[];
};

export const load: PageServerLoad = async ({ url }) => {
	const selected = interestNavigation.find((item) => item.id === url.searchParams.get('tema'));
	const query = (url.searchParams.get('q') ?? '').trim().slice(0, 160);
	const queryWords = words(query).filter((word) => !commonWords.has(word));
	const terms = queryWords.length ? queryWords : words(query);
	const order = url.searchParams.get('ordem') === 'titulo' ? 'titulo' : '';
	const kindInput = url.searchParams.get('tipo') ?? '';
	const kind = Object.hasOwn(kindLabels, kindInput) ? kindInput : '';
	const pageParam = url.searchParams.get('pagina');
	const page = Number(pageParam ?? '1');
	if (
		!Number.isSafeInteger(page) ||
		page < 1 ||
		(pageParam !== null && !/^[1-9]\d*$/.test(pageParam))
	) {
		error(404, 'Página do acervo não encontrada.');
	}

	const documents = await publishedEditorial();
	const guides = new Map<string, Entry>();
	const archive = new Map<string, Entry>();
	for (const document of documents) {
		const edition = document.kind === 'horoscope' ? parseHoroscopeArchivePath(document.path) : null;
		const topic = interestNavigation.find((item) => item.id === editorialTopic(document.path));
		const topicId = topic?.id;
		const kindLabel = kindLabels[document.kind] ?? 'Artigo';
		const entry: Entry = {
			id: document.id,
			path: document.path,
			title: document.title,
			description: document.description,
			publishedAt: document.publishedAt,
			kindLabel,
			topicId
		};
		if (document.kind !== 'horoscope') guides.set(document.path, entry);
		if (
			(selected && topicId !== selected.id) ||
			(kind && document.kind !== kind) ||
			(selected && !kind && !query && edition)
		)
			continue;
		if (query) {
			const aliases = edition
				? `horóscopo ${signNames[edition.sign]} ${periodLabels[edition.period]} ${edition.period === 'weekly' ? 'semana' : edition.period === 'daily' ? 'hoje dia' : 'mês'} ${edition.startDate}`
				: 'artigo';
			const searchable = new Set(
				words(
					[
						document.title,
						document.description,
						kindLabel,
						topic?.label ?? '',
						aliases,
						...(document.sections ?? []).flatMap((section) => [
							section.heading,
							...section.paragraphs
						])
					].join(' ')
				)
			);
			if (!terms.length || !terms.every((term) => searchable.has(term))) continue;
		}
		if (!edition) {
			archive.set(entry.id, entry);
			continue;
		}
		const id = `${edition.period}-${edition.startDate}`;
		let group = archive.get(id);
		if (!group) {
			group = {
				...entry,
				id,
				title: `Horóscopo ${periodLabels[edition.period]} de ${date.format(new Date(edition.startDate))}`,
				description: '',
				editions: []
			};
			archive.set(id, group);
		}
		group.editions!.push({ path: document.path, sign: edition.sign });
	}

	const entries = [...archive.values()].sort((a, b) =>
		order
			? a.title.localeCompare(b.title, 'pt-BR')
			: (!query && !kind ? Number(Boolean(a.editions)) - Number(Boolean(b.editions)) : 0) ||
				b.publishedAt.localeCompare(a.publishedAt) ||
				a.id.localeCompare(b.id)
	);
	const lastPage = Math.max(1, Math.ceil(entries.length / pageSize));
	if (page > lastPage) error(404, 'Página do acervo não encontrada.');

	const pageHref = (number: number, anchor = '') => {
		const params = new URLSearchParams();
		if (selected) params.set('tema', selected.id);
		if (query) params.set('q', query);
		if (kind) params.set('tipo', kind);
		if (order) params.set('ordem', order);
		if (number > 1) params.set('pagina', String(number));
		return `/revista${params.size ? `?${params}` : ''}${anchor}`;
	};
	const articles = entries.slice((page - 1) * pageSize, page * pageSize);
	const showCover = page === 1 && !selected && !query && !kind && !order;
	const featured = showCover
		? [...new Set([...featuredPaths, ...guides.keys()])]
				.flatMap((path) => guides.get(path) ?? [])
				.slice(0, 3)
		: [];
	const topics = showCover
		? interestNavigation.flatMap((topic) => {
				const reads = [...guides.values()].filter((entry) => entry.topicId === topic.id);
				if (!reads.length) return [];
				return [
					{
						id: topic.id,
						label: topic.label,
						href: `/revista?tema=${topic.id}#acervo`,
						read: reads.find((entry) => !featured.some((item) => item.id === entry.id)) ?? reads[0]
					}
				];
			})
		: [];
	const title = selected
		? `${selected.label} — Revista ATVNA`
		: 'Revista ATVNA — A Tua Vida nos Astros';
	const canonical = query || selected || kind || order ? '/revista' : pageHref(page);
	const navigationPages = Array.from(
		new Set(
			[1, page - 2, page - 1, page, page + 1, page + 2, lastPage].filter(
				(number) => number >= 1 && number <= lastPage
			)
		)
	).sort((a, b) => a - b);
	return {
		query,
		showCover,
		selectedLabel: selected?.label,
		featured,
		topics,
		weeklySigns: signs.map((sign) => ({
			label: signNames[sign],
			href: horoscopeIndexPath(sign, 'weekly')
		})),
		articles,
		total: entries.length,
		pagination: {
			page,
			items: navigationPages.map((number) => ({ number, href: pageHref(number, '#acervo') })),
			previous: page > 1 ? pageHref(page - 1, '#acervo') : null,
			next: page < lastPage ? pageHref(page + 1, '#acervo') : null
		},
		seo: {
			...legacySeo('/revista')!,
			path: canonical,
			internalSearch: Boolean(query),
			indexable: !query,
			title: page > 1 ? `Página ${page} — ${title}` : title,
			description:
				'Acompanhe os ciclos do céu, leia guias sobre astrologia, Tarot e sonhos e consulte o horóscopo da semana.',
			jsonLd: query
				? undefined
				: safeJsonLd({
						'@context': 'https://schema.org',
						'@type': 'CollectionPage',
						name: title,
						url: `${SITE.url}${canonical}`,
						mainEntity: {
							'@type': 'ItemList',
							itemListElement: articles.map((entry, index) => ({
								'@type': 'ListItem',
								position: (page - 1) * pageSize + index + 1,
								name: entry.title,
								url: `${SITE.url}${entry.path}`
							}))
						}
					})
		}
	};
};

export const actions = { boletim: subscribeToMagazineBulletin } satisfies Actions;
