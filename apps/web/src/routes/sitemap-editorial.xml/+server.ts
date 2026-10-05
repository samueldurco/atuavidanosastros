import { publishedEditorial } from '$lib/server/editorial-registry';
import { editorialSitemap, xmlResponse } from '$lib/server/editorial-feeds';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async () =>
	xmlResponse(editorialSitemap(await publishedEditorial()));
