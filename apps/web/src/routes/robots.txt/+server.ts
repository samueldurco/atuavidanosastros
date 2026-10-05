import { SITE } from '$lib/data/site';
import { isProductionOrigin } from '$lib/seo';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) =>
	new Response(
		`User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /biblioteca\nDisallow: /conta\nDisallow: /admin\nDisallow: /api/\nDisallow: /entrar\nDisallow: /_spec/\n${isProductionOrigin(url) ? `\nSitemap: ${SITE.url}/sitemap.xml\n` : ''}`,
		{
			headers: {
				'content-type': 'text/plain; charset=utf-8',
				'cache-control': 'public, max-age=300'
			}
		}
	);
