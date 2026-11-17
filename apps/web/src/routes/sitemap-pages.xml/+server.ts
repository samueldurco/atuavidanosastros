import { publishedEditorial, readLiveHoroscopes } from '$lib/server/editorial-registry';
import { horoscopeDay } from '$lib/server/live-horoscope';
import { pagesSitemap, xmlResponse } from '$lib/server/editorial-feeds';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const now = new Date();
	const [history, today] = await Promise.all([
		publishedEditorial(now),
		readLiveHoroscopes(now).summaries('daily', horoscopeDay(now))
	]);
	const visibleFrom = new Date(horoscopeDay(now) + 'T00:00:00-03:00').toISOString();
	const published = today.map((edition) => ({
		...edition,
		modifiedAt: edition.modifiedAt > visibleFrom ? edition.modifiedAt : visibleFrom
	}));
	return xmlResponse(pagesSitemap([...history, ...published]));
};
