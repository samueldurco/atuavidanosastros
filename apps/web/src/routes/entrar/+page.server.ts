import { env } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';
import { authCallbackHref, authReturnPath } from '$lib/auth-return';
import { supabaseAuthBindings } from '$lib/server/runtime-bindings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url }) => {
	const next = authReturnPath(url.searchParams.get('next'));
	const sessionStatus = url.searchParams.get('sessao');
	const { user } = await parent();
	if (user && sessionStatus !== 'erro') redirect(303, next);
	const issue = url.searchParams.get('erro');
	const loginError =
		issue === 'oauth'
			? 'Não foi possível concluir o acesso com o Google. Tente entrar novamente.'
			: issue === 'confirmacao'
				? 'Não foi possível confirmar o link de acesso. Tente entrar com o Google.'
				: null;
	return {
		next,
		loginError,
		logoutStatus:
			sessionStatus === 'erro' ? 'error' : sessionStatus === 'encerrada' ? 'success' : null
	};
};

export const actions: Actions = {
	google: async (event) => {
		const { locals, url } = event;
		if (!locals.supabase) return fail(503, { message: 'Autenticação ainda não configurada.' });
		let authOrigin: string;
		try {
			const configured = new URL(supabaseAuthBindings(event).url ?? '');
			const localHttp =
				configured.protocol === 'http:' &&
				['localhost', '127.0.0.1', '[::1]'].includes(configured.hostname);
			if (
				(configured.protocol !== 'https:' && !localHttp) ||
				configured.username ||
				configured.password
			)
				return fail(503, { message: 'Autenticação ainda não configurada.' });
			authOrigin = configured.origin;
		} catch {
			return fail(503, { message: 'Autenticação ainda não configurada.' });
		}
		const { data, error } = await locals.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: authCallbackHref(url.origin, url.searchParams.get('next')),
				scopes: 'openid email profile',
				skipBrowserRedirect: true
			}
		});
		if (error || !data.url) return fail(502, { message: 'Não foi possível iniciar o login.' });
		let destination: URL;
		try {
			destination = new URL(data.url);
		} catch {
			return fail(502, { message: 'Não foi possível iniciar o login.' });
		}
		if (destination.origin !== authOrigin || destination.username || destination.password)
			return fail(502, { message: 'Não foi possível iniciar o login.' });
		redirect(303, destination.href, { external: [authOrigin] });
	},
	magic: async ({ request, locals, url }) => {
		if (env.FEATURE_MAGIC_LINK !== 'true')
			return fail(404, { message: 'Link mágico indisponível.' });
		if (!locals.supabase) return fail(503, { message: 'Autenticação ainda não configurada.' });
		const email = String((await request.formData()).get('email') ?? '').trim();
		if (!/^\S+@\S+\.\S+$/.test(email)) return fail(400, { message: 'Informe um e-mail válido.' });
		const { error } = await locals.supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: authCallbackHref(url.origin, url.searchParams.get('next')) }
		});
		if (error) return fail(502, { message: 'Não foi possível enviar o link.' });
		return { message: 'Enviamos o link de acesso, se o endereço puder ser usado.' };
	}
};
