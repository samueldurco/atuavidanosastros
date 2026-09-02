import { CaelusEphemerisProvider, type CalculationInput } from '@atv/astrology';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const signs = [
	'Áries',
	'Touro',
	'Gêmeos',
	'Câncer',
	'Leão',
	'Virgem',
	'Libra',
	'Escorpião',
	'Sagitário',
	'Capricórnio',
	'Aquário',
	'Peixes'
] as const;

export const POST: RequestHandler = async ({ request }) => {
	const value = (await request.json()) as Partial<CalculationInput>;
	if (!value.utcInstant || !value.localDateTime || !value.timezone || !value.locationSource)
		return json({ code: 'invalid_input' }, { status: 400 });
	const latitude = Number(value.latitude);
	const longitude = Number(value.longitude);
	try {
		const chart = await new CaelusEphemerisProvider().calculate({
			localDateTime: value.localDateTime,
			timezone: value.timezone,
			utcInstant: value.utcInstant,
			latitude,
			longitude,
			locationSource: value.locationSource
		});
		const longitudeMc = chart.houses.midheaven;
		const signIndex = Math.floor(longitudeMc / 30) % 12;
		return json({
			midheaven: longitudeMc,
			sign: signs[signIndex],
			degree: longitudeMc % 30,
			status: chart.houses.status,
			warning: chart.houses.warning ?? null,
			provenance: chart.provenance
		});
	} catch {
		return json({ code: 'calculation_failed' }, { status: 422 });
	}
};
