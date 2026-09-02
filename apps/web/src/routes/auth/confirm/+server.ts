import type { EmailOtpType } from '@supabase/supabase-js';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as EmailOtpType | null;
	if (tokenHash && type && locals.supabase) {
		const { error } = await locals.supabase.auth.verifyOtp({ type, token_hash: tokenHash });
		if (!error) redirect(303, '/dashboard');
	}
	redirect(303, '/entrar?erro=confirmacao');
};
