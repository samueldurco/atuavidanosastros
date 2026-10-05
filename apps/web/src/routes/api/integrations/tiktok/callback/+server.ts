import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { requireAdmin } from '$lib/server/admin-access';
import { requireTikTokConfig } from '$lib/server/tiktok-config';
import { encryptTikTokTokens, oauthStateMatches } from '$lib/server/tiktok-credentials';
import { exchangeTikTokAuthorizationCode, TikTokDisplayClient } from '@atv/integrations';
import { createClient } from '@supabase/supabase-js';
import { error, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const OAUTH_COOKIE = 'atv_tiktok_oauth_state';

export const GET: RequestHandler = async ({ cookies, locals, url }) => {
	const admin = await requireAdmin(locals, privateEnv.ADMIN_EMAIL_ALLOWLIST ?? '');
	const expectedState = cookies.get(OAUTH_COOKIE) ?? '';
	cookies.delete(OAUTH_COOKIE, { path: '/api/integrations/tiktok' });

	if (url.searchParams.has('error')) error(400, 'A autorização do TikTok não foi concluída.');
	const receivedState = url.searchParams.get('state') ?? '';
	if (!(await oauthStateMatches(expectedState, receivedState))) {
		error(400, 'Retorno OAuth do TikTok inválido ou expirado.');
	}

	const code = url.searchParams.get('code')?.trim();
	if (!code) error(400, 'Código de autorização TikTok ausente.');
	const { clientKey, clientSecret, redirectUri, encryptionKey, serviceRole, supabaseUrl } =
		await requireTikTokConfig(privateEnv, publicEnv, url);

	try {
		const tokens = await exchangeTikTokAuthorizationCode({
			clientKey,
			clientSecret,
			redirectUri,
			code
		});
		const missingScopes = ['user.info.basic'].filter((scope) => !tokens.scopes.includes(scope));
		if (missingScopes.length > 0)
			error(400, 'O TikTok não concedeu todas as permissões necessárias.');

		const profile = await new TikTokDisplayClient({ accessToken: tokens.accessToken }).getProfile();
		if (profile.openId !== tokens.openId)
			error(400, 'A identidade retornada pelo TikTok não confere.');
		const encrypted = await encryptTikTokTokens(tokens, encryptionKey);
		const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
		const { error: storageError } = await supabase.from('tiktok_connections').upsert({
			id: 'primary',
			owner_user_id: admin.id,
			open_id: tokens.openId,
			display_name: profile.displayName,
			avatar_url: profile.avatarUrl,
			scopes: tokens.scopes,
			access_expires_at: tokens.accessExpiresAt,
			refresh_expires_at: tokens.refreshExpiresAt,
			token_ciphertext: encrypted.ciphertext,
			token_iv: encrypted.iv,
			last_verified_at: new Date().toISOString()
		});
		if (storageError) error(503, 'Não foi possível armazenar a conexão do TikTok.');
		redirect(303, '/admin?tiktok=connected');
	} catch (failure) {
		if (isHttpError(failure) || isRedirect(failure)) throw failure;
		error(503, 'Não foi possível concluir a conexão do TikTok. Tente autorizar novamente.');
	}
};
