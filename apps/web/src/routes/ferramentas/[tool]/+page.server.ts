import { error, redirect } from '@sveltejs/kit';
import { freeToolById } from '$lib/data/free-tools';
import { SITE } from '$lib/data/site';
import { publishedEditorialDocument } from '$lib/server/editorial-registry';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	const tool = freeToolById(params.tool);
	if (!tool) error(404, 'Ferramenta não encontrada.');
	if (params.tool !== tool.id) redirect(308, tool.href);
	const { authConfigured, user } = await parent();
	const consentGuide =
		tool.id === 'combinacao-do-casal'
			? await publishedEditorialDocument('/noticias/2026/10/sinastria-dados-e-consentimento')
			: undefined;
	const learningGuide =
		tool.id === 'ascendente' || tool.id === 'mapa-astral'
			? await publishedEditorialDocument(`/${tool.id}`)
			: undefined;
	return {
		tool,
		consentGuidePath: consentGuide?.path ?? null,
		learningGuide: learningGuide
			? {
					path: learningGuide.path,
					title: learningGuide.title,
					description: learningGuide.description
				}
			: null,
		canSave: authConfigured && Boolean(user),
		hasAccount: Boolean(user),
		seo: {
			path: tool.href,
			title: `${tool.label}${/grátis/i.test(tool.label) ? '' : ' grátis'} — ${SITE.name}`,
			description: tool.description,
			indexable: true,
			managePrimary: true
		}
	};
};
