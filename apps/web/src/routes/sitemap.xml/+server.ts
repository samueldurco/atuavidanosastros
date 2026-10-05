import { publishedEditorial } from '$lib/server/editorial-registry';
import { sitemapIndex, xmlResponse } from '$lib/server/editorial-feeds';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async () => {
	const now = new Date();
	return xmlResponse(sitemapIndex(await publishedEditorial(now), now));
};
