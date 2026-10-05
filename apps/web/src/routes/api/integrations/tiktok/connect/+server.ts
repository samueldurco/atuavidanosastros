import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { requireAdmin } from '$lib/server/admin-access';
import { requireTikTokConfig } from '$lib/server/tiktok-config';
import { createTikTokAuthorizationUrl, TIKTOK_UPLOAD_SCOPES } from '@atv/integrations';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const OAUTH_COOKIE = 'atv_tiktok_oauth_state';

export const GET: RequestHandler = async ({ cookies, locals, url }) => {
	await requireAdmin(locals, privateEnv.ADMIN_EMAIL_ALLOWLIST ?? '');
	const { clientKey, redirectUri } = await requireTikTokConfig(privateEnv, publicEnv, url);

	const state = crypto.randomUUID().replace(/-/g, '');
	const authorizationUrl = createTikTokAuthorizationUrl({
		clientKey,
		redirectUri,
		state,
		scopes: TIKTOK_UPLOAD_SCOPES
	});
	cookies.set(OAUTH_COOKIE, state, {
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'lax',
		path: '/api/integrations/tiktok',
		maxAge: 10 * 60
	});
	redirect(303, authorizationUrl.toString());
};
