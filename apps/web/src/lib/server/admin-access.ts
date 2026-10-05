import { error, redirect } from '@sveltejs/kit';

export async function requireAdmin(
	locals: App.Locals,
	adminEmailAllowlist: string
): Promise<{ id: string; email: string }> {
	if (!locals.supabase) error(503, 'Autenticação indisponível.');
	const { data, error: claimsError } = await locals.supabase.auth.getClaims();
	const claims = !claimsError ? data?.claims : undefined;
	if (!claims?.sub) redirect(303, '/entrar');

	const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
	const allowed = adminEmailAllowlist
		.split(',')
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean);
	if (!email || !allowed.includes(email)) error(403, 'Acesso restrito.');
	return { id: claims.sub, email };
}
