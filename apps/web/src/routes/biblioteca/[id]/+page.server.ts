import { error, redirect } from '@sveltejs/kit';
import { readLibraryResult } from '$lib/server/library-reader';
import { libraryReturnCursor } from '$lib/library-page';
import { readIntakeAccess } from '$lib/server/symbolic-intake';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals, params, url, setHeaders }) => {
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
	const libraryBefore = libraryReturnCursor(url.searchParams);
	if (data.state === 'workflow') {
		const atlasAccess =
			data.run.productId === 'dream-atlas'
				? await readIntakeAccess(locals.supabase, 'dream-atlas')
				: undefined;
		return { ...data, ownerId: user.id, libraryBefore, atlasAccess };
	}
	return { ...data, libraryBefore };
};
