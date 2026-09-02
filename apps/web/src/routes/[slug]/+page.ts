import { error } from '@sveltejs/kit';
import { editorialPages } from '$lib/data/site';
import type { PageLoad } from './$types';
export const load: PageLoad = ({ params }) => {
	const page = editorialPages[params.slug as keyof typeof editorialPages];
	if (!page) error(404, 'Página não encontrada');
	return { page, slug: params.slug };
};
