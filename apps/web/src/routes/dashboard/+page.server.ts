import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { authConfigured, user } = await parent();
	if (authConfigured && !user) redirect(303, '/entrar');
	if (!user || !locals.supabase)
		return { preview: true, user: null, items: [], libraryError: false };
	const { data, error } = await locals.supabase
		.from('library_items')
		.select('id,title,universe,item_type,occurred_at,created_at')
		.order('created_at', { ascending: false })
		.limit(3);
	return { preview: false, user, items: data ?? [], libraryError: Boolean(error) };
};
