import { error } from '@sveltejs/kit';
import { publishedEditorial } from '$lib/server/editorial-registry';
import { SITE } from '$lib/data/site';
import { safeJsonLd, type PageSeo } from '$lib/seo';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ params }) => {
	const documents = (await publishedEditorial()).filter(
		(document) => document.author.id === params.slug
	);
	const author = documents[0]?.author;
	if (!author) error(404, 'Este perfil ainda não está publicado.');
	const path = `/pessoas/${author.id}`;
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
				'@type': 'Person',
				name: author.name,
				description: author.bio,
				url: SITE.url + path
			}
		})
	};
	return { author, documents, seo };
};
