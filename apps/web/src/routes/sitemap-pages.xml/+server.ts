import { publishedEditorial } from '$lib/server/editorial-registry';
import { pagesSitemap, xmlResponse } from '$lib/server/editorial-feeds';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async () =>
	xmlResponse(pagesSitemap(await publishedEditorial()));
