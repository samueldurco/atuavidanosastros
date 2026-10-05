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
	return { document, seo: articleSeo(document) };
}
