import { json } from '@sveltejs/kit';
import { publishedHoroscopeForDownload } from '$lib/server/public-horoscope-download';
import type { RequestHandler } from './$types';

/** Public availability only; text is always loaded from the admitted registry. */
export const GET: RequestHandler = async ({ url, fetch }) => {
	const document = await publishedHoroscopeForDownload(url, fetch);
	return json(
		{ available: Boolean(document) },
		{ status: document ? 200 : 404, headers: { 'cache-control': 'no-store' } }
	);
};
