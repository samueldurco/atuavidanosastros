import { error, redirect } from '@sveltejs/kit';
import { freeToolById } from '$lib/data/free-tools';
import { SITE } from '$lib/data/site';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const tool = freeToolById(params.tool);
	if (!tool) error(404, 'Ferramenta não encontrada.');
	if (params.tool !== tool.id) redirect(308, tool.href);
	const { authConfigured, user } = await parent();
	return {
		tool,
		canSave: authConfigured && Boolean(user),
		hasAccount: Boolean(user),
		seo: {
			path: tool.href,
			title: `${tool.label}${tool.label.includes('grátis') ? '' : ' grátis'} — ${SITE.name}`,
			description: tool.description,
			indexable: true,
			managePrimary: true
		}
	};
};
