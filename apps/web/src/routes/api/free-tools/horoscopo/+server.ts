import { error, json } from '@sveltejs/kit';
import { signs } from '$lib/data/site';
import { horoscopeIndexPath } from '$lib/public-horoscope';
import { createEditorialRead } from '$lib/server/editorial-registry';
import { publicHoroscopeIndex } from '$lib/server/public-horoscope-index';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const sign = signs.find((item) => item === url.searchParams.get('sign'));
	if (!sign) error(400, 'Escolha um signo.');
	const now = new Date();
	const read = createEditorialRead(now);
	const documents = await read.summaries();
	const index = publicHoroscopeIndex(documents, url, sign, now);
	const entry = index.current;
	const document = entry && (await read.document(entry.path, fetch));
	const availableLink = async (edition: typeof entry) => {
		if (!edition || !(await read.document(edition.path, fetch))) return null;
		const { path, startDate, endDateExclusive } = edition;
		return { path, startDate, endDateExclusive };
	};
	const [lastDaily, currentWeek] = document
		? [null, null]
		: await Promise.all([availableLink(index.lastDaily), availableLink(index.currentWeek)]);
	return json(
		{
			sign,
			period: index.period,
			current: document && entry ? { ...entry, sections: document.sections } : null,
			lastDaily,
			currentWeek,
			hasHistory: index.entries.some((item) => item.sign === sign && item.period === index.period),
			supportingGuides: index.supportingGuides,
			archive: horoscopeIndexPath(sign, index.period)
		},
		{ headers: { 'Cache-Control': 'public, max-age=60' } }
	);
};
