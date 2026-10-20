import { loginHref } from '$lib/auth-return';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { readDashboard } from '$lib/server/dashboard';
import type { DashboardData } from '$lib/dashboard';
import { readTrialLibrary } from '$lib/server/trial-library';
import { readAccountRights } from '$lib/server/account-rights';
import type { AccountRights } from '$lib/account-rights';
import { readAccountOrders } from '$lib/server/account-orders';
import type { AccountOrders } from '$lib/account-orders';

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
			trialLibrary: null,
			accountRights: { status: 'ready', items: [] },
			accountOrders: { status: 'ready', items: [] }
		} satisfies DashboardData & {
			trialLibrary: null;
			accountRights: AccountRights;
			accountOrders: AccountOrders;
		};
	const [dashboard, trialLibrary, accountRights, accountOrders] = await Promise.all([
		readDashboard(locals.supabase, user.id),
		trialAccess ? readTrialLibrary(locals.supabase, user.id) : null,
		readAccountRights(locals.supabase, user.id),
		readAccountOrders(locals.supabase, user.id)
	]);
	return { ...dashboard, trialLibrary, accountRights, accountOrders };
};
