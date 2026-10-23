import { readFile } from 'node:fs/promises';
import { tarotArtwork } from './tarot-artwork';

/** The exact first-party JPEGs fetched by the browser PDF exporter. */
export async function localTarotArtwork(cardId: string) {
	const src = tarotArtwork(cardId);
	return new Uint8Array(await readFile(new URL(`../../../static${src}`, import.meta.url)));
}
