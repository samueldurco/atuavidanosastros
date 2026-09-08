import { env } from '$env/dynamic/public';
import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const supabaseKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.PUBLIC_SUPABASE_ANON_KEY;
	if (env.PUBLIC_SUPABASE_URL && supabaseKey) {
		event.locals.supabase = createServerClient(env.PUBLIC_SUPABASE_URL, supabaseKey, {
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					for (const { name, value, options } of cookiesToSet) {
						event.cookies.set(name, value, { ...options, path: '/' });
					}
				}
			}
		});
	}

	const response = await resolve(event);
	response.headers.set('x-content-type-options', 'nosniff');
	if (!response.headers.has('referrer-policy'))
		response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	if (
		['/biblioteca', '/dashboard', '/conta'].some(
			(path) => event.url.pathname === path || event.url.pathname.startsWith(`${path}/`)
		)
	) {
		response.headers.set('cache-control', 'private, no-store');
		response.headers.set('referrer-policy', 'no-referrer');
		response.headers.set('x-robots-tag', 'noindex, nofollow');
	}
	response.headers.set(
		'permissions-policy',
		'camera=(), microphone=(), geolocation=(self), payment=()'
	);
	if (event.url.hostname.endsWith('.pages.dev') || event.url.hostname === 'localhost') {
		response.headers.set('x-robots-tag', 'noindex, nofollow');
	}
	return response;
};
