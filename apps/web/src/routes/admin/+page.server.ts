import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { authConfigured, user } = await parent();
	if (!authConfigured || !user) redirect(303, '/entrar');
	const allowed = (privateEnv.ADMIN_EMAIL_ALLOWLIST ?? '')
		.split(',')
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean);
	if (!user.email || !allowed.includes(user.email.toLowerCase())) error(403, 'Acesso restrito.');
	if (!publicEnv.PUBLIC_SUPABASE_URL || !privateEnv.SUPABASE_SERVICE_ROLE_KEY)
		return { products: [], flags: [], inbox: [] };
	const supabase = createClient(
		publicEnv.PUBLIC_SUPABASE_URL,
		privateEnv.SUPABASE_SERVICE_ROLE_KEY,
		{
			auth: { persistSession: false }
		}
	);
	const [products, flags, inbox] = await Promise.all([
		supabase.from('products').select('id,title,state,updated_at').order('id'),
		supabase.from('feature_flags').select('key,enabled,description,updated_at').order('key'),
		supabase
			.from('webhook_inbox')
			.select('id,event_type,processing_state,received_at')
			.order('received_at', { ascending: false })
			.limit(20)
	]);
	return { products: products.data ?? [], flags: flags.data ?? [], inbox: inbox.data ?? [] };
};
