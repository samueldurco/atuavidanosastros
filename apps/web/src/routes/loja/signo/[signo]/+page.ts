import { error } from '@sveltejs/kit';
import { signs, signNames, type SignSlug } from '$lib/data/site';
import type { PageLoad } from './$types';
export const load: PageLoad = ({ params }) => {
	if (!signs.includes(params.signo as SignSlug)) error(404, 'Signo não encontrado');
	return { slug: params.signo as SignSlug, name: signNames[params.signo as SignSlug] };
};
