import { error, redirect } from '@sveltejs/kit';
import { readLibraryResult } from '$lib/server/library-reader';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals, params, setHeaders }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'x-robots-tag': 'noindex, nofollow',
		'referrer-policy': 'no-referrer'
	});
	const { user } = await parent();
	if (!user) redirect(303, '/entrar');
	if (!locals.supabase) error(503, 'Não foi possível acessar sua Biblioteca.');
	const data = await readLibraryResult(locals.supabase, user.id, params.id);
	if (data.state === 'not-found') error(404, 'Este item não está disponível na sua Biblioteca.');
	return data;
};
