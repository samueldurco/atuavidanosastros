import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.supabase) return { authConfigured: false, user: null };
	const { data, error } = await locals.supabase.auth.getClaims();
	const claims = !error ? data?.claims : undefined;
	return {
		authConfigured: true,
		user: claims?.sub
			? { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null }
			: null
	};
};
