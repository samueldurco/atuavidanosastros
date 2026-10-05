import { error } from '@sveltejs/kit';
import { validateTikTokEncryptionKey } from './tiktok-credentials';

export async function requireTikTokConfig(
	privateEnv: Record<string, string | undefined>,
	publicEnv: Record<string, string | undefined>,
	requestUrl: URL
) {
	const clientKey = privateEnv.TIKTOK_CLIENT_KEY?.trim();
	const clientSecret = privateEnv.TIKTOK_CLIENT_SECRET?.trim();
	const redirectUri = privateEnv.TIKTOK_REDIRECT_URI?.trim();
	const encryptionKey = privateEnv.TIKTOK_TOKEN_ENCRYPTION_KEY?.trim();
	const serviceRole = privateEnv.SUPABASE_SERVICE_ROLE_KEY?.trim();
	const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL?.trim();
	if (!clientKey || !clientSecret || !redirectUri || !encryptionKey || !serviceRole || !supabaseUrl)
		error(503, 'A integração do TikTok ainda não está configurada.');
	try {
		const callback = new URL(redirectUri);
		const storage = new URL(supabaseUrl);
		if (
			callback.protocol !== 'https:' ||
			callback.origin !== requestUrl.origin ||
			callback.pathname !== '/api/integrations/tiktok/callback' ||
			callback.username ||
			callback.password ||
			callback.search ||
			callback.hash ||
			redirectUri.length >= 512 ||
			storage.protocol !== 'https:' ||
			storage.username ||
			storage.password ||
			storage.search ||
			storage.hash ||
			storage.pathname !== '/'
		)
			throw new Error('invalid configuration');
		await validateTikTokEncryptionKey(encryptionKey);
	} catch {
		error(503, 'A configuração segura do TikTok precisa ser corrigida.');
	}
	return { clientKey, clientSecret, redirectUri, encryptionKey, serviceRole, supabaseUrl };
}
