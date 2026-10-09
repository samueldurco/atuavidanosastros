import type { SavedTrial } from './reading';

export const bodyNames: Record<string, string> = {
	sun: 'Sol',
	moon: 'Lua',
	mercury: 'Mercúrio',
	venus: 'Vênus',
	mars: 'Marte',
	jupiter: 'Júpiter',
	saturn: 'Saturno',
	uranus: 'Urano',
	neptune: 'Netuno',
	pluto: 'Plutão'
};
export const signNames = [
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
];
// Vector glyphs avoid depending on an operating system's astrological font.
export const bodyGlyphs: Record<string, string> = {
	sun: 'M 0 -8 A 8 8 0 1 1 0 8 A 8 8 0 1 1 0 -8 M -1 0 L 1 0',
	moon: 'M 3 -8 A 8 8 0 1 0 3 8 A 9 9 0 0 1 3 -8',
	mercury:
		'M -5 -11 Q 0 -4 5 -11 M 0 -6 A 5 5 0 1 1 0 4 A 5 5 0 1 1 0 -6 M 0 4 L 0 11 M -4 8 L 4 8',
	venus: 'M 0 -9 A 6 6 0 1 1 0 3 A 6 6 0 1 1 0 -9 M 0 3 L 0 11 M -4 8 L 4 8',
	mars: 'M -3 -3 A 6 6 0 1 1 -3 9 A 6 6 0 1 1 -3 -3 M 1 -1 L 9 -9 M 3 -9 L 9 -9 L 9 -3',
	jupiter: 'M -6 -8 Q 3 -10 -5 2 L 7 2 M 4 -10 L 4 10',
	saturn: 'M -3 -10 L -3 8 M -7 -6 L 2 -6 M -3 0 Q 7 -5 4 5 Q 1 10 6 10',
	uranus:
		'M -7 -8 L -7 3 M 7 -8 L 7 3 M -7 -3 L 7 -3 M 0 -8 L 0 5 M 0 5 A 3 3 0 1 1 0 11 A 3 3 0 1 1 0 5',
	neptune: 'M -7 -9 L -7 -3 Q 0 6 7 -3 L 7 -9 M 0 -10 L 0 11 M -4 7 L 4 7',
	pluto: 'M 0 -10 A 3 3 0 1 1 0 -4 A 3 3 0 1 1 0 -10 M -6 -4 Q 0 7 6 -4 M 0 2 L 0 11 M -4 8 L 4 8'
};
const angle = (n: unknown): n is number =>
	typeof n === 'number' && Number.isFinite(n) && n >= 0 && n < 360;
export function trialGeometry(saved: SavedTrial, person?: 'first' | 'second') {
	const root =
		saved.product_id === 'couple-dossier' &&
		saved.calculation.version !== 'atv-private-couple-dossier-synthesis/4.0.0'
			? (saved.calculation.data.base as { data: Record<string, unknown> }).data
			: saved.calculation.data;
	const data = person
		? (root[person] as Record<string, unknown>)
		: saved.product_id === 'life-atlas'
			? (root.natal as { data?: Record<string, unknown> } | undefined)?.data
			: root;
	if (!data) throw Error('geometry_missing');
	const positions = (data.positions ?? []) as {
		body: string;
		longitude: number;
		retrograde?: boolean;
	}[];
	const angles = (person ? { ascendant: null, midheaven: null } : data.angles) as {
		ascendant: number | null;
		midheaven: number | null;
	};
	const houses = (person ? { status: 'not-calculated', cusps: [] } : data.houses) as {
		status: string;
		cusps: number[];
	};
	if (
		!Array.isArray(positions) ||
		positions.length !==
			(['ascendant', 'midheaven'].includes(saved.product_id) &&
			![
				'atv-private-natal-synthesis/4.0.0',
				'atv-private-ascendant/5.0.0',
				'atv-private-midheaven/5.0.0'
			].includes(saved.calculation.version)
				? 0
				: saved.product_id === 'pair-preview'
					? 3
					: 10) ||
		(saved.product_id === 'pair-preview' &&
			positions.some((p) => !['moon', 'venus', 'mars'].includes(p.body))) ||
		positions.some((p) => !bodyNames[p.body] || !angle(p.longitude)) ||
		new Set(positions.map((p) => p.body)).size !== positions.length ||
		!angles ||
		![angles.ascendant, angles.midheaven].every((a) => a === null || angle(a)) ||
		(saved.product_id === 'ascendant' && !angle(angles.ascendant)) ||
		!houses ||
		!Array.isArray(houses.cusps) ||
		![0, 12].includes(houses.cusps.length) ||
		houses.cusps.some((c) => !angle(c))
	)
		throw Error('geometry_invalid');
	const raw = person
		? []
		: ((
				root.privateAspects as
					{ aspects?: { first: string; second: string; kind: string }[] } | undefined
			)?.aspects ?? []);
	if (
		!Array.isArray(raw) ||
		raw.some(
			(a) =>
				!positions.some((p) => p.body === a.first) ||
				!positions.some((p) => p.body === a.second) ||
				!['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.kind)
		)
	)
		throw Error('aspects_invalid');
	// Keep true longitudes; choose a label track only to separate neighboring glyphs.
	const tracks = new Map<string, number>();
	for (const p of [...positions].sort((a, b) => a.longitude - b.longitude)) {
		const used = positions
			.filter(
				(q) =>
					tracks.has(q.body) &&
					Math.min(Math.abs(q.longitude - p.longitude), 360 - Math.abs(q.longitude - p.longitude)) <
						10
			)
			.map((q) => tracks.get(q.body));
		let track = 0;
		while (used.includes(track)) track++;
		tracks.set(p.body, track);
	}
	return { positions, angles, houses, aspects: raw, tracks };
}
export const nominalDegree = (a: number) => {
	const minutes = Math.round(a * 60) % 21600;
	return `${Math.floor((minutes % 1800) / 60)}°${String(minutes % 60).padStart(2, '0')}′ ${signNames[Math.floor(minutes / 1800)]}`;
};
