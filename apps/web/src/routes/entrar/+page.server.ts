import { env } from '$env/dynamic/private';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	google: async ({ locals, url }) => {
		if (!locals.supabase) return fail(503, { message: 'Autenticação ainda não configurada.' });
		const { data, error } = await locals.supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${url.origin}/auth/callback`,
				scopes: 'openid email profile',
				skipBrowserRedirect: true
			}
		});
		if (error || !data.url) return fail(502, { message: 'Não foi possível iniciar o login.' });
		redirect(303, data.url);
	},
	magic: async ({ request, locals, url }) => {
		if (env.FEATURE_MAGIC_LINK !== 'true')
			return fail(404, { message: 'Link mágico indisponível.' });
		if (!locals.supabase) return fail(503, { message: 'Autenticação ainda não configurada.' });
		const email = String((await request.formData()).get('email') ?? '').trim();
		if (!/^\S+@\S+\.\S+$/.test(email)) return fail(400, { message: 'Informe um e-mail válido.' });
		const { error } = await locals.supabase.auth.signInWithOtp({
			email,
			options: { emailRedirectTo: `${url.origin}/auth/callback` }
		});
		if (error) return fail(502, { message: 'Não foi possível enviar o link.' });
		return { message: 'Enviamos o link de acesso, se o endereço puder ser usado.' };
	}
};
