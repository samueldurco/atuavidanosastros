import { error, json } from '@sveltejs/kit';
import { signs } from '$lib/data/site';
import { horoscopeIndexPath } from '$lib/public-horoscope';
import { readPublicHoroscope } from '$lib/server/public-horoscope-index';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const sign = signs.find((item) => item === url.searchParams.get('sign'));
	if (!sign) error(400, 'Escolha um signo.');
	const index = await readPublicHoroscope(url, sign, fetch);
	const path = horoscopeIndexPath(sign, index.period);
	return json(
		{
			sign,
			period: index.period,
			current:
				index.reading && index.current
					? { ...index.current, ...index.reading, readingPath: path }
					: null,
			lastDaily: index.lastDaily,
			currentWeek:
				!index.reading && index.currentWeek
					? { ...index.currentWeek, path: horoscopeIndexPath(sign, 'weekly') }
					: null,
			hasHistory: index.history.length > 0,
			supportingGuides: index.supportingGuides,
			archive: path
		},
		{ headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } }
	);
};
