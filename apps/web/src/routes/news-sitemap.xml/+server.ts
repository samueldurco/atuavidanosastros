import { publishedEditorial } from '$lib/server/editorial-registry';
import { newsChunks, newsSitemap, xmlResponse } from '$lib/server/editorial-feeds';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async () => {
	const now = new Date();
	return xmlResponse(newsSitemap(newsChunks(await publishedEditorial(now), now)[0]));
};
