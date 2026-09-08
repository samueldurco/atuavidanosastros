import {
	CaelusEphemerisProvider,
	validateCalculationInput,
	type CalculationInput
} from '@atv/astrology';

export const zodiacSigns = [
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

export interface MidheavenResult {
	midheaven: number;
	sign: (typeof zodiacSigns)[number];
	degree: number;
	status: 'ok' | 'not-applicable';
	warning: string | null;
	provenance: { provider: string; providerVersion: string };
}

export function parseCalculationInput(value: unknown): CalculationInput | null {
	if (!value || typeof value !== 'object') return null;
	const record = value as Record<string, unknown>;
	if (
		typeof record.utcInstant !== 'string' ||
		typeof record.localDateTime !== 'string' ||
		typeof record.timezone !== 'string' ||
		typeof record.locationSource !== 'string'
	)
		return null;
	const coordinate = (value: unknown) =>
		typeof value === 'number'
			? value
			: typeof value === 'string' && /^[-+]?\d+(?:\.\d+)?$/.test(value.trim())
				? Number(value)
				: NaN;
	const latitude = coordinate(record.latitude);
	const longitude = coordinate(record.longitude);
	if (
		!Number.isFinite(latitude) ||
		!Number.isFinite(longitude) ||
		latitude < -90 ||
		latitude > 90 ||
		longitude < -180 ||
		longitude > 180 ||
		!record.localDateTime.trim() ||
		record.localDateTime.length > 40 ||
		!record.timezone.trim() ||
		record.timezone.length > 80 ||
		!record.locationSource.trim() ||
		record.locationSource.length > 80 ||
		record.utcInstant.length > 40 ||
		Number.isNaN(Date.parse(record.utcInstant))
	)
		return null;
	const input = {
		utcInstant: record.utcInstant,
		localDateTime: record.localDateTime,
		timezone: record.timezone,
		latitude,
		longitude,
		locationSource: record.locationSource
	};
	try {
		validateCalculationInput(input);
		return input;
	} catch {
		return null;
	}
}

export function fingerprintMaterial(input: CalculationInput): string {
	return JSON.stringify({
		utcInstant: input.utcInstant,
		localDateTime: input.localDateTime,
		timezone: input.timezone,
		latitude: input.latitude,
		longitude: input.longitude,
		locationSource: input.locationSource
	});
}

export async function calculateMidheaven(input: CalculationInput): Promise<MidheavenResult> {
	const chart = await new CaelusEphemerisProvider().calculate(input);
	const midheaven = chart.houses.midheaven;
	const signIndex = Math.floor(midheaven / 30) % 12;
	return {
		midheaven,
		sign: zodiacSigns[signIndex],
		degree: midheaven % 30,
		status: chart.houses.status,
		warning: chart.houses.warning ?? null,
		provenance: chart.provenance
	};
}
