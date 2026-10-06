import { loginHref } from '$lib/auth-return';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { readLibraryPage } from '$lib/server/library-page';
import type { LibraryPageData } from '$lib/library-page';
import { readTrialLibrary } from '$lib/server/trial-library';

export const load: PageServerLoad = async ({ parent, locals, url, setHeaders }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'referrer-policy': 'no-referrer',
		'x-robots-tag': 'noindex, nofollow'
	});
	const { authConfigured, user, trialAccess } = await parent();
	if (authConfigured && !user) redirect(303, loginHref('/biblioteca'));
	if (!user)
		return {
			preview: true,
			items: [],
			libraryError: false,
			pagination: { before: null, next: null, expired: false },
			trialLibrary: null
		} satisfies LibraryPageData & { trialLibrary: null };
	const cursors = url.searchParams.getAll('before');
	const [library, trialLibrary] = await Promise.all([
		readLibraryPage(locals.supabase, user.id, cursors.length > 1 ? '' : (cursors[0] ?? null)),
		trialAccess ? readTrialLibrary(locals.supabase, user.id) : null
	]);
	return { ...library, trialLibrary };
};
