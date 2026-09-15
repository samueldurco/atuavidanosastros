export const CARTOGRAPHY_VERSION = 'atv-cartography/1.0.0';
export const NATAL_SOURCE_VERSION = 'atv-natal-product-calculation/1.0.0';
export const cartographyBodies = [
	'sun',
	'moon',
	'mercury',
	'venus',
	'mars',
	'jupiter',
	'saturn',
	'uranus',
	'neptune',
	'pluto'
] as const;
export type CartographyBody = (typeof cartographyBodies)[number];
export interface ProductCartography {
	version: typeof CARTOGRAPHY_VERSION;
	sourceVersion: typeof NATAL_SOURCE_VERSION;
	zodiac: 'tropical';
	referenceFrame: 'geocentric-apparent-ecliptic-of-date';
	accuracyStatus: 'experimental';
	positions: { body: CartographyBody; longitude: number }[];
	angles: { ascendant: number | null; midheaven: number | null };
	houses: {
		system: 'placidus';
		status: 'ok' | 'not-applicable' | 'not-requested';
		cusps: number[];
	};
}
const record = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
const angle = (v: unknown): v is number =>
	typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 360;

/** Optional, minimized projection. Invalid/older geometry never falls back to parsing display strings. */
export function parseProductCartography(
	v: unknown,
	productId: string,
	sourceVersion: string
): ProductCartography | null {
	if (
		!['birth-chart', 'ascendant'].includes(productId) ||
		sourceVersion !== NATAL_SOURCE_VERSION ||
		!record(v) ||
		v.version !== CARTOGRAPHY_VERSION ||
		v.sourceVersion !== sourceVersion ||
		v.zodiac !== 'tropical' ||
		v.referenceFrame !== 'geocentric-apparent-ecliptic-of-date' ||
		v.accuracyStatus !== 'experimental' ||
		!Array.isArray(v.positions) ||
		!record(v.angles) ||
		!record(v.houses)
	)
		return null;
	const full = productId === 'birth-chart',
		a = v.angles,
		h = v.houses;
	if (
		v.positions.length !== (full ? 10 : 0) ||
		h.system !== 'placidus' ||
		!Array.isArray(h.cusps) ||
		!['ok', 'not-applicable', 'not-requested'].includes(String(h.status)) ||
		(a.ascendant !== null && !angle(a.ascendant)) ||
		(a.midheaven !== null && !angle(a.midheaven))
	)
		return null;
	if (
		full
			? !angle(a.midheaven) || h.status === 'not-requested'
			: h.status !== 'not-requested' || a.midheaven !== null || a.ascendant === null
	)
		return null;
	if (
		h.status === 'ok'
			? h.cusps.length !== 12 || a.ascendant === null || h.cusps.some((x) => !angle(x))
			: h.cusps.length !== 0
	)
		return null;
	if (h.status === 'not-applicable' && a.ascendant !== null) return null;
	const positions: ProductCartography['positions'] = [];
	for (const p of v.positions) {
		if (
			!record(p) ||
			!cartographyBodies.includes(p.body as CartographyBody) ||
			!angle(p.longitude) ||
			positions.some((x) => x.body === p.body)
		)
			return null;
		positions.push({ body: p.body as CartographyBody, longitude: p.longitude });
	}
	// Stable display order only. Coordinates are copied exactly, never rounded, shifted or recalculated.
	positions.sort((a, b) => cartographyBodies.indexOf(a.body) - cartographyBodies.indexOf(b.body));
	return {
		version: CARTOGRAPHY_VERSION,
		sourceVersion: NATAL_SOURCE_VERSION,
		zodiac: 'tropical',
		referenceFrame: 'geocentric-apparent-ecliptic-of-date',
		accuracyStatus: 'experimental',
		positions,
		angles: { ascendant: a.ascendant as number | null, midheaven: a.midheaven as number | null },
		houses: {
			system: 'placidus',
			status: h.status as ProductCartography['houses']['status'],
			cusps: [...h.cusps] as number[]
		}
	};
}
