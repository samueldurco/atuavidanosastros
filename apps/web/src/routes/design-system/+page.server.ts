import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
		error(404, 'Página não encontrada.');
	return {};
};
