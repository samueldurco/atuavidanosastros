import { error, json } from '@sveltejs/kit';
import { signs } from '$lib/data/site';
import { publishedEditorial, publishedEditorialDocument } from '$lib/server/editorial-registry';
import { publicHoroscopeIndex } from '$lib/server/public-horoscope-index';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const sign = signs.find((item) => item === url.searchParams.get('sign'));
	if (!sign) error(400, 'Escolha um signo.');
	const documents = await publishedEditorial();
	const index = publicHoroscopeIndex(documents, url, sign);
	const entry = index.current;
	const document = entry && await publishedEditorialDocument(entry.path, fetch);
	return json(
		{
			sign,
			period: index.period,
			current: document && entry ? { ...entry, sections: document.sections } : null,
			hasHistory: index.entries.some((item) => item.sign === sign && item.period === index.period),
			supportingGuides: index.supportingGuides,
			archive: `/horoscopo/${sign}?period=${index.period}`
		},
		{ headers: { 'Cache-Control': 'public, max-age=60' } }
	);
};
