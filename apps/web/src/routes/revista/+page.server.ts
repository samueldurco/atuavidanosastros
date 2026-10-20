import { interestNavigation } from '$lib/data/public-navigation';
import { editorialTopic } from '$lib/data/editorial-topics';
import { publishedEditorial } from '$lib/server/editorial-registry';
import { legacySeo, safeJsonLd } from '$lib/seo';
import { SITE } from '$lib/data/site';
import type { PageServerLoad } from './$types';

const kindLabels: Record<string, string> = {
	guide: 'Guia',
	reporting: 'Reportagem',
	column: 'Coluna',
	'sign-profile': 'Perfil de signo',
	horoscope: 'Horóscopo',
	compatibility: 'Relacionamentos'
};
const searchText = (value: string) =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase('pt-BR');

export const load: PageServerLoad = async ({ url }) => {
	const selected = interestNavigation.find((item) => item.id === url.searchParams.get('tema'));
	const documents = await publishedEditorial();
	const kinds = [...new Set(documents.map((document) => document.kind))].map((id) => ({
		id,
		label: kindLabels[id] ?? 'Artigo'
	}));
	const kind = kinds.find((item) => item.id === url.searchParams.get('tipo'))?.id ?? '';
	const query = (url.searchParams.get('q') ?? '').trim().slice(0, 160);
	const order = url.searchParams.get('ordem') === 'titulo' ? 'titulo' : 'recentes';
	const articles = documents
		.filter((document) => {
			const topicId = editorialTopic(document.path);
			return (
				(!selected || topicId === selected.id) &&
				(!kind || document.kind === kind) &&
				(!query ||
					searchText(
						`${document.title} ${document.description} ${(document.sections ?? []).map((section) => `${section.heading} ${section.paragraphs.join(' ')}`).join(' ')}`
					).includes(searchText(query)))
			);
		})
		.sort((a, b) =>
			order === 'titulo'
				? a.title.localeCompare(b.title, 'pt-BR')
				: b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title, 'pt-BR')
		)
		.map((document) => ({
			id: document.id,
			path: document.path,
			title: document.title,
			description: document.description,
			kindLabel: kindLabels[document.kind] ?? 'Artigo',
			publishedAt: document.publishedAt,
			topicId: editorialTopic(document.path) ?? 'meu-ceu'
		}));
	return {
		selected: selected?.id ?? null,
		query,
		kind,
		kinds,
		order,
		articles,
		total: documents.length,
		seo: {
			...legacySeo('/revista')!,
			title: selected
				? `${selected.label} — Revista ATVNA`
				: 'Revista ATVNA — A Tua Vida nos Astros',
			description:
				'Artigos para entender seu mapa, acompanhar os ciclos e explorar amor, carreira, Tarot e sonhos. Escolha um assunto e continue a leitura.',
			managePrimary: true,
			jsonLd: safeJsonLd({
				'@context': 'https://schema.org',
				'@type': 'CollectionPage',
				name: 'Revista ATVNA',
				url: `${SITE.url}/revista`,
				mainEntity: {
					'@type': 'ItemList',
					itemListElement: articles.map((document, index) => ({
						'@type': 'ListItem',
						position: index + 1,
						name: document.title,
						url: `${SITE.url}${document.path}`
					}))
				}
			})
		}
	};
};
