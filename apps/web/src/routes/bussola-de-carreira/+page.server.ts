import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { authConfigured, user } = await parent();
	return { canSave: authConfigured && Boolean(user) };
};
