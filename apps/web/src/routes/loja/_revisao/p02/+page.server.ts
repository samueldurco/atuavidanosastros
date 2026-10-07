import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async ({ setHeaders, url }) => {
	// Only this branch's Pages preview may show the unlaunched collection.
	// The production domain and other previews remain closed; forwarded headers
	// cannot select the review environment.
	const previewHost = 'codex-p02-catalogo-revisao-v1.atuavidanosastros.pages.dev';
	if (!dev && (url.protocol !== 'https:' || url.hostname !== previewHost)) error(404);
	setHeaders({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
	return {};
};
