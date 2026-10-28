import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { readSmallJson } from '$lib/server/request-json';
import type { RequestEvent } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const headers = {
	'cache-control': 'private, no-store',
	'referrer-policy': 'no-referrer',
	'x-content-type-options': 'nosniff'
};
const enabled = (event: RequestEvent) =>
	(event.platform?.env?.FEATURE_MAGIC_LINK ?? env.FEATURE_MAGIC_LINK) === 'true';
export const GET: RequestHandler = async (event) => {
	if (event.request.headers.get('sec-fetch-site') === 'cross-site')
		return json({ code: 'cross_origin_denied' }, { status: 403, headers });
	const user = event.locals.supabase ? await event.locals.supabase.auth.getUser() : null;
	return json(
		{
			identified: Boolean(user && !user.error && user.data.user?.email_confirmed_at),
			emailCodeAvailable: enabled(event) && Boolean(event.locals.supabase)
		},
		{ headers }
	);
};
export const POST: RequestHandler = async (event) => {
	if (
		event.request.headers.get('origin') !== event.url.origin ||
		event.request.headers.get('sec-fetch-site') === 'cross-site'
	)
		return json({ code: 'cross_origin_denied' }, { status: 403, headers });
	// Same provider gate as /entrar. Enable only after the email-code template and SMTP pass release checks.
	if (!enabled(event) || !event.locals.supabase)
		return json({ code: 'identity_unavailable' }, { status: 503, headers });
	const input = (await readSmallJson(event.request, 2048)) as {
		action?: string;
		email?: string;
		code?: string;
	} | null;
	if (
		!input ||
		typeof input.email !== 'string' ||
		input.email.length > 254 ||
		!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
	)
		return json({ code: 'invalid_input' }, { status: 400, headers });
	const email = input.email.trim();
	if (input.action === 'request') {
		const { error } = await event.locals.supabase.auth.signInWithOtp({ email });
		if (error)
			return json(
				{ code: error.status === 429 ? 'rate_limited' : 'identity_unavailable' },
				{ status: error.status === 429 ? 429 : 503, headers }
			);
		return json({ ok: true }, { headers });
	}
	if (
		input.action === 'verify' &&
		typeof input.code === 'string' &&
		/^\d{6,10}$/.test(input.code)
	) {
		const { error } = await event.locals.supabase.auth.verifyOtp({
			email,
			token: input.code,
			type: 'email'
		});
		if (error) return json({ code: 'invalid_code' }, { status: 400, headers });
		return json({ ok: true }, { headers });
	}
	return json({ code: 'invalid_input' }, { status: 400, headers });
};
