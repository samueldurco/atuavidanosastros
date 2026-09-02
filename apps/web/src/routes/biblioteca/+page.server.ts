import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { authConfigured, user } = await parent();
	if (authConfigured && !user) redirect(303, '/entrar');
	if (!user || !locals.supabase) return { preview: true, items: [] };
	const { data } = await locals.supabase
		.from('library_items')
		.select('id,title,universe,item_type,occurred_at,created_at')
		.order('created_at', { ascending: false });
	return { preview: false, items: data ?? [] };
};
