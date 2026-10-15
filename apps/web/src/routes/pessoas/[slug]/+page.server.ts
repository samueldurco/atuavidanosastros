import { error, redirect } from '@sveltejs/kit';
import { publishedEditorial } from '$lib/server/editorial-registry';
import { SITE } from '$lib/data/site';
import { publicEditorialAuthor } from '$lib/data/editorial-author';
import { safeJsonLd, type PageSeo } from '$lib/seo';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ params }) => {
	const documents = (await publishedEditorial()).filter(
		(document) =>
			document.author.id === params.slug ||
			publicEditorialAuthor(document.author).id === params.slug
	);
	const sourceAuthor = documents[0]?.author;
	if (!sourceAuthor) error(404, 'Este perfil ainda não está publicado.');
	const author = publicEditorialAuthor(sourceAuthor);
	const path = `/pessoas/${author.id}`;
	if (params.slug !== author.id) redirect(308, path);
	const seo: PageSeo = {
		title: `${author.name} — ${SITE.name}`,
		description: author.bio,
		path,
		indexable: true,
		managePrimary: true,
		jsonLd: safeJsonLd({
			'@context': 'https://schema.org',
			'@type': 'ProfilePage',
			mainEntity: {
				'@type': author.type ?? 'Person',
				name: author.name,
				description: author.bio,
				url: SITE.url + path
			}
		})
	};
	return { author, documents, seo };
};
