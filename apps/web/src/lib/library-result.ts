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
export const isUuid = (value: string): boolean =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export interface SavedCompass {
	midheaven: number;
	sign: (typeof zodiacSigns)[number];
	degree: number;
	status: 'ok' | 'not-applicable';
	warning: string | null;
	provenance: { provider: string; providerVersion: string; calculatedAt: string | null };
}
export interface LibraryItemSummary {
	id: string;
	title: string;
	universe: string;
	created_at: string;
}
export interface LibraryReaderData {
	state: 'ready' | 'unavailable' | 'unsupported';
	item: LibraryItemSummary | null;
	result: SavedCompass | null;
	synthetic?: boolean;
}

const record = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
export function parseSavedCompass(value: unknown, provenance: unknown): SavedCompass | null {
	if (!record(value) || !record(provenance)) return null;
	if (
		typeof value.midheaven !== 'number' ||
		!Number.isFinite(value.midheaven) ||
		value.midheaven < 0 ||
		value.midheaven >= 360
	)
		return null;
	if (
		typeof value.degree !== 'number' ||
		!Number.isFinite(value.degree) ||
		value.degree < 0 ||
		value.degree >= 30
	)
		return null;
	const sign = zodiacSigns[Math.floor(value.midheaven / 30)];
	if (!sign || value.sign !== sign || Math.abs(value.degree - (value.midheaven % 30)) > 0.000001)
		return null;
	if (value.status !== 'ok' && value.status !== 'not-applicable') return null;
	if (
		value.warning !== null &&
		value.warning !== undefined &&
		(typeof value.warning !== 'string' || value.warning.length > 600)
	)
		return null;
	if (
		typeof provenance.provider !== 'string' ||
		!provenance.provider.trim() ||
		provenance.provider.length > 80 ||
		typeof provenance.providerVersion !== 'string' ||
		!provenance.providerVersion.trim() ||
		provenance.providerVersion.length > 80
	)
		return null;
	return {
		midheaven: value.midheaven,
		sign,
		degree: value.degree,
		status: value.status,
		warning: typeof value.warning === 'string' ? value.warning : null,
		provenance: {
			provider: provenance.provider,
			providerVersion: provenance.providerVersion,
			calculatedAt:
				typeof provenance.calculatedAt === 'string' &&
				Number.isFinite(Date.parse(provenance.calculatedAt))
					? provenance.calculatedAt
					: null
		}
	};
}
