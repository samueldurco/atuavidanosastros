import { loginHref } from '$lib/auth-return';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { readLibraryPage } from '$lib/server/library-page';
import type { LibraryPageData } from '$lib/library-page';
import { readTrialLibrary } from '$lib/server/trial-library';
import { readAccountRights } from '$lib/server/account-rights';
import type { AccountRights } from '$lib/account-rights';

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
			trialLibrary: null,
			accountRights: { status: 'ready', items: [] }
		} satisfies LibraryPageData & { trialLibrary: null; accountRights: AccountRights };
	const cursors = url.searchParams.getAll('before');
	const library = await readLibraryPage(
		locals.supabase,
		user.id,
		cursors.length > 1 ? '' : (cursors[0] ?? null)
	);
	if (library.pagination.expired)
		return {
			...library,
			trialLibrary: null,
			accountRights: { status: 'ready', items: [] } satisfies AccountRights
		};
	const [trialLibrary, accountRights] = await Promise.all([
		trialAccess ? readTrialLibrary(locals.supabase, user.id) : null,
		readAccountRights(locals.supabase, user.id)
	]);
	return { ...library, trialLibrary, accountRights };
};
