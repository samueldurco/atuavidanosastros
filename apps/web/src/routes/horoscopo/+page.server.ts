import { loadPublicHoroscopeIndex } from '$lib/server/public-horoscope-index';
import { error, redirect } from '@sveltejs/kit';
import { signs } from '$lib/data/site';
import { horoscopeIndexPath, horoscopePeriods, type PublicPeriod } from '$lib/public-horoscope';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url, fetch }) => {
	if (url.searchParams.has('sign')) {
		const sign = signs.find((value) => value === url.searchParams.get('sign'));
		const period = (url.searchParams.get('period') ?? 'daily') as PublicPeriod;
		if (!sign || !horoscopePeriods.includes(period)) error(400, 'Signo ou período inválido.');
		redirect(303, horoscopeIndexPath(sign, period));
	}
	return loadPublicHoroscopeIndex(url, fetch);
};
