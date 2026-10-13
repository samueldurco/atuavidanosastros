import { error, redirect } from '@sveltejs/kit';
import { freeToolById } from '$lib/data/free-tools';
import { SITE } from '$lib/data/site';
import { loadPublicHoroscopeIndex } from '$lib/server/public-horoscope-index';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const tool = freeToolById(params.tool);
	if (!tool) error(404, 'Ferramenta não encontrada.');
	if (tool.id === 'bussola-de-carreira') redirect(308, '/bussola-de-carreira');
	const { authConfigured, user } = await parent();
	return {
		tool,
		canSave: authConfigured && Boolean(user),
		hasAccount: Boolean(user),
		horoscope: tool.id === 'horoscopo' ? await loadPublicHoroscopeIndex(url) : null,
		seo: {
			path: tool.href,
			title: `${tool.label}${tool.label.includes('grátis') ? '' : ' grátis'} — ${SITE.name}`,
			description: tool.description,
			indexable: true,
			managePrimary: true
		}
	};
};
