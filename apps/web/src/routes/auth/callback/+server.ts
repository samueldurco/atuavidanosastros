import { redirect } from '@sveltejs/kit';
import { authReturnPath, loginHref } from '$lib/auth-return';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code');
	if (code && locals.supabase) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, authReturnPath(url.searchParams.get('next')));
	}
	redirect(303, `${loginHref(authReturnPath(url.searchParams.get('next')))}&erro=oauth`);
};
