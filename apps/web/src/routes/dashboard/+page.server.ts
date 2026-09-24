import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { readDashboard } from '$lib/server/dashboard';
import type { DashboardData } from '$lib/dashboard';

export const load: PageServerLoad = async ({ parent, locals, setHeaders }) => {
	setHeaders({
		'cache-control': 'private, no-store',
		'referrer-policy': 'no-referrer',
		'x-robots-tag': 'noindex, nofollow'
	});
	const { authConfigured, user } = await parent();
	if (authConfigured && !user) redirect(303, '/entrar');
	if (!user)
		return {
			preview: true,
			items: [],
			libraryError: false,
			natal: { state: 'PREVIEW' }
		} satisfies DashboardData;
	return readDashboard(locals.supabase, user.id);
};
