import { parseHoroscopeArchivePath } from '$lib/public-horoscope';
import { createEditorialRead } from './editorial-registry';
import type { EditorialAssetFetch } from './dated-horoscope-archive';

/** Public document coordinates, never an anonymous or personal reading identifier. */
export async function publishedHoroscopeForDownload(url: URL, fetchAsset: EditorialAssetFetch) {
	const path = url.searchParams.get('leitura') ?? '';
	const revision = url.searchParams.get('revisao') ?? '';
	if (!parseHoroscopeArchivePath(path) || !/^[1-9][0-9]{0,8}$/.test(revision)) return null;
	const document = await createEditorialRead().document(path, fetchAsset);
	// The registry rechecks admission/revocation. A changed revision must never be
	// silently substituted for the text the visitor actually consulted.
	if (
		!document ||
		document.kind !== 'horoscope' ||
		!document.calculation ||
		document.path !== path ||
		document.revision !== Number(revision)
	)
		return null;
	return document;
}

export async function publicHoroscopeOperationId(id: string, revision: number) {
	const bytes = new Uint8Array(
		await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${id}:${revision}`))
	);
	bytes[6] = (bytes[6]! & 15) | 128;
	bytes[8] = (bytes[8]! & 63) | 128;
	const hex = Array.from(bytes.slice(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
