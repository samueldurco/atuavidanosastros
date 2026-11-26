import { env as privateEnv } from '$env/dynamic/private';
import { error, redirect, type RequestEvent } from '@sveltejs/kit';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const list = (value: string | undefined) =>
	(value ?? '')
		.split(',')
		.map((item) => item.trim().toLowerCase())
		.filter(Boolean);

export async function requireLivrariaPreview(
	event: Pick<RequestEvent, 'locals' | 'platform' | 'url'>,
	api = false
): Promise<string> {
	if (!event.locals.supabase) error(503, 'Autenticação indisponível.');
	const { data, error: claimsError } = await event.locals.supabase.auth.getClaims();
	const claims = !claimsError ? data?.claims : undefined;
	if (
		!claims?.sub ||
		claims.role !== 'authenticated' ||
		claims.is_anonymous === true ||
		!uuid.test(claims.sub)
	) {
		if (api) error(401, 'Entre com uma conta autorizada.');
		redirect(303, `/entrar?next=${encodeURIComponent(event.url.pathname)}`);
	}
	const { data: userData, error: userError } = await event.locals.supabase.auth.getUser();
	const user = userData?.user;
	if (userError || !user || user.id !== claims.sub || user.is_anonymous)
		error(401, 'Sessão não autorizada. Entre novamente.');
	const env = privateEnv as Record<string, string | undefined>;
	const ownerIds = list(
		event.platform?.env.LIVRARIA_PREVIEW_OWNER_IDS ?? env.LIVRARIA_PREVIEW_OWNER_IDS
	);
	if (ownerIds.includes(claims.sub.toLowerCase())) return claims.sub;
	// Existing owner access is retained only after the Auth server confirms a
	// nonanonymous account and its confirmed email. No user_metadata is trusted.
	const adminEmails = list(event.platform?.env.ADMIN_EMAIL_ALLOWLIST ?? env.ADMIN_EMAIL_ALLOWLIST);
	if (adminEmails.length) {
		if (user.email_confirmed_at && user.email && adminEmails.includes(user.email.toLowerCase()))
			return claims.sub;
	}
	error(403, 'Esta prévia está restrita às contas autorizadas.');
}
