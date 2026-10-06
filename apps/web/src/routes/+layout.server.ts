import type { LayoutServerLoad } from './$types';
import { legacySeo } from '$lib/seo';
import { withRpcDeadline } from '$lib/server/rpc-deadline';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const seo = legacySeo(url.pathname);
	if (!locals.supabase) return { authConfigured: false, user: null, trialAccess: false, seo };
	const { data, error } = await locals.supabase.auth.getClaims();
	const claims = !error ? data?.claims : undefined;
	let trialAccess = false;
	if (claims?.sub) {
		try {
			const grant = await withRpcDeadline((signal) =>
				locals.supabase!.rpc('has_atv_trial_access').abortSignal(signal)
			);
			trialAccess = !grant.error && grant.data === true;
		} catch {
			// A failed grant lookup never opens private tests.
		}
	}
	return {
		seo,
		authConfigured: true,
		trialAccess,
		user: claims?.sub
			? { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null }
			: null
	};
};
