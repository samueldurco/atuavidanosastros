import type { PublicHoroscopeSnapshot } from '../../../../worker/src/public-horoscope-calculation';
import type { EditorialDocument } from './editorial';
import { parseHoroscopeArchivePath } from '$lib/public-horoscope';

function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value !== null && typeof value === 'object')
		return `{${Object.entries(value)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
			.join(',')}}`;
	return JSON.stringify(value);
}

export async function publicHoroscopeDigest(snapshot: PublicHoroscopeSnapshot): Promise<string> {
	const { assertPublicHoroscopeSnapshot } =
		await import('../../../../worker/src/public-horoscope-calculation');
	assertPublicHoroscopeSnapshot(snapshot);
	const digest = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(canonical(snapshot))
	);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Metadata alone is insufficient. A signed forecast must name the exact, bundled
// observations and the deterministic projection validated above. This does not
// certify the ephemeris' accuracy or replace the independent editorial approval.
export async function verifiedPublicHoroscopeFacts(
	document: EditorialDocument,
	snapshots: readonly PublicHoroscopeSnapshot[]
): Promise<boolean> {
	try {
		const calculation = document.calculation;
		if (!calculation) return false;
		const archive = parseHoroscopeArchivePath(document.path);
		let matches = 0;
		for (const snapshot of snapshots) {
			if (
				archive &&
				(archive.period !== snapshot.period || archive.startDate !== snapshot.startDate)
			)
				continue;
			if (
				calculation.engine !== snapshot.engine ||
				calculation.version !== snapshot.version ||
				calculation.coverageStart !== `${snapshot.startDate}T00:00:00.000Z` ||
				calculation.coverageEnd !== `${snapshot.endDateExclusive}T00:00:00.000Z`
			)
				continue;
			if ((await publicHoroscopeDigest(snapshot)) === calculation.factsDigest) matches++;
		}
		return matches === 1;
	} catch {
		return false;
	}
}

export type { PublicHoroscopeSnapshot };
