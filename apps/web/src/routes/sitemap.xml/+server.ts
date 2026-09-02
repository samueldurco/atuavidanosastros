import { SITE } from '$lib/data/site';
import type { RequestHandler } from './$types';
const publicPaths = [
	'',
	'/meu-ceu',
	'/ciclos',
	'/amor',
	'/proposito',
	'/tarot',
	'/sonhos',
	'/meio-do-ceu',
	'/bussola-de-carreira',
	'/vocacao-no-mapa-astral',
	'/carreira-no-mapa-astral',
	'/casa-10',
	'/loja'
];
export const GET: RequestHandler = () => {
	const urls = publicPaths
		.map(
			(path) =>
				`<url><loc>${SITE.url}${path}</loc><changefreq>${path === '' ? 'weekly' : 'monthly'}</changefreq></url>`
		)
		.join('');
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
		{
			headers: {
				'content-type': 'application/xml; charset=utf-8',
				'cache-control': 'public, max-age=3600'
			}
		}
	);
};
