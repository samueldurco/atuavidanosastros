import { newsConsentApi } from '$lib/server/news-consent';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => newsConsentApi(event, false);
export const POST: RequestHandler = (event) => newsConsentApi(event, true);
