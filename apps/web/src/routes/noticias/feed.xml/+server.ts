import { publishedEditorial } from '$lib/server/editorial-registry';
import { editorialRss, xmlResponse } from '$lib/server/editorial-feeds';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async () =>
	xmlResponse(editorialRss(await publishedEditorial()), true);
