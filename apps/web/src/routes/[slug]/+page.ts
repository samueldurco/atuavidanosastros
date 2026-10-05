import { error } from '@sveltejs/kit';
import { editorialPages } from '$lib/data/site';
import type { PageLoad } from './$types';
export const load: PageLoad = ({ params, data }) => {
	if (data.document) return { ...data, page: null, slug: params.slug };
	if (!Object.hasOwn(editorialPages, params.slug)) error(404, 'Página não encontrada');
	const page = editorialPages[params.slug as keyof typeof editorialPages];
	if (!page) error(404, 'Página não encontrada');
	return { ...data, page, slug: params.slug };
};
