import { loginHref } from '$lib/auth-return';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { readDashboard } from '$lib/server/dashboard';
import type { DashboardData } from '$lib/dashboard';
import { readTrialLibrary } from '$lib/server/trial-library';

export const load: PageServerLoad = async ({ parent, locals, setHeaders }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'referrer-policy': 'no-referrer',
		'x-robots-tag': 'noindex, nofollow'
	});
	const { authConfigured, user, trialAccess } = await parent();
	if (authConfigured && !user) redirect(303, loginHref('/dashboard'));
	if (!user)
		return {
			preview: true,
			items: [],
			libraryError: false,
			natal: { state: 'PREVIEW' },
			continuity: { state: 'PREVIEW' },
			trialLibrary: null
		} satisfies DashboardData & { trialLibrary: null };
	const [dashboard, trialLibrary] = await Promise.all([
		readDashboard(locals.supabase, user.id),
		trialAccess ? readTrialLibrary(locals.supabase, user.id) : null
	]);
	return { ...dashboard, trialLibrary };
};
