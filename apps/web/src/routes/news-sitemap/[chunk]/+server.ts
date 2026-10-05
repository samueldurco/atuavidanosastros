import { error } from '@sveltejs/kit';
import { publishedEditorial } from '$lib/server/editorial-registry';
import { newsChunks, newsSitemap, xmlResponse } from '$lib/server/editorial-feeds';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async ({ params }) => {
	if (!/^[2-9]\d*\.xml$|^1\d+\.xml$/.test(params.chunk)) error(404);
	const number = Number(params.chunk.slice(0, -4));
	const now = new Date();
	const chunk = newsChunks(await publishedEditorial(now), now)[number - 1];
	if (!chunk) error(404);
	return xmlResponse(newsSitemap(chunk));
};
