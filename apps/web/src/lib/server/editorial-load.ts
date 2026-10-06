import { error, redirect } from '@sveltejs/kit';
import { articleSeo, canonicalPair, hubDocuments, hubSeo } from './editorial';
import { publishedEditorial } from './editorial-registry';
import type { EditorialHub } from '$lib/seo';

export async function loadEditorialHub(path: EditorialHub) {
	const documents = await publishedEditorial();
	return { documents: hubDocuments(documents, path), seo: hubSeo(path, documents) };
}
export async function loadEditorialDocument(path: string) {
	const documents = await publishedEditorial();
	const pair = path.match(/^\/compatibilidade\/([a-z]+)-([a-z]+)$/);
	const canonical = pair ? canonicalPair(pair[1], pair[2]) : path;
	const document = documents.find((entry) => entry.path === canonical);
	if (!document) error(404, 'Esta leitura ainda não está publicada.');
	if (canonical !== path) redirect(301, document.path);
	const groups = [
		[
			'/ascendente',
			'/noticias/2026/10/sol-lua-ascendente',
			'/mapa-astral',
			'/noticias/2026/10/horario-nascimento-mapa-astral',
			'/noticias/2026/10/meio-do-ceu-e-reflexao-de-carreira'
		],
		['/mercurio-retrogrado', '/noticias/2026/10/fases-da-lua'],
		[
			'/noticias/2026/10/sinastria-e-combinacao-de-signos',
			'/noticias/2026/10/sinastria-dados-e-consentimento'
		],
		['/noticias/2026/10/arcanos-maiores-e-menores', '/noticias/2026/10/perguntas-para-o-tarot'],
		['/noticias/2026/10/diario-de-sonhos']
	];
	const group = groups.find((paths) => paths.includes(document.path)) ?? [];
	const related = documents
		.filter((entry) => entry.id !== document.id && group.includes(entry.path))
		.slice(0, 3)
		.map(({ path, title }) => ({ path, title }));
	return { document, related, seo: articleSeo(document) };
}
