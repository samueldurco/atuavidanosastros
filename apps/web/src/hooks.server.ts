import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit/hooks';
import { permanentPublicDestination } from '$lib/server/public-redirects';
import { supabaseAuthBindings } from '$lib/server/runtime-bindings';

export const handle: Handle = async ({ event, resolve }) => {
	const destination = ['GET', 'HEAD'].includes(event.request?.method ?? '')
		? permanentPublicDestination(event.url)
		: null;
	if (destination) {
		const headers = new Headers({ location: destination, 'x-content-type-options': 'nosniff' });
		if (event.url.hostname.endsWith('.pages.dev') || event.url.hostname === 'localhost')
			headers.set('x-robots-tag', 'noindex, nofollow');
		return new Response(null, { status: 301, headers });
	}
	const { url: supabaseUrl, key: supabaseKey } = supabaseAuthBindings(event);
	if (supabaseUrl && supabaseKey) {
		event.locals.supabase = createServerClient(supabaseUrl, supabaseKey, {
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
	// Catalog pages also contain server-derived, account-specific trial availability.
	if (event.cookies.getAll().some(({ name }) => /^sb-.*-auth-token(?:\.\d+)?$/.test(name)))
		response.headers.set('cache-control', 'private, no-store');
	if (
		[
			'/entrar',
			'/sair',
			'/biblioteca',
			'/dashboard',
			'/conta',
			'/admin',
			'/api/workflows',
			'/api/integrations',
			'/api/private-trials',
			'/testar-produtos',
			'/compartilhar/leitura'
		].some((path) => event.url.pathname === path || event.url.pathname.startsWith(`${path}/`))
	) {
		response.headers.set('cache-control', 'private, no-store');
		// HTML forms need their same-origin Origin for SvelteKit's CSRF check.
		// External destinations still receive no referrer from private pages.
		response.headers.set(
			'referrer-policy',
			response.headers.get('content-type')?.startsWith('text/html') ? 'same-origin' : 'no-referrer'
		);
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
