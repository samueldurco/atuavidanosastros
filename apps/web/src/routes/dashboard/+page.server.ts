import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { authConfigured, user } = await parent();
	if (authConfigured && !user) redirect(303, '/entrar');
	return { preview: !authConfigured, user };
};
