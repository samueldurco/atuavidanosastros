import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ parent, params }) => {
	const { preview } = await parent();
	const book = preview.catalog.find((item) => item.slug === params.slug);
	if (!book) error(404, 'Livro não encontrado.');
	return { book };
};
