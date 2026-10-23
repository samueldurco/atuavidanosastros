import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tarotCanon } from './reconstruction/tarot-canon';
import { tarotArtwork } from './tarot-artwork';

describe('first-party Tarot artwork', () => {
	it('has a provenance-checked image for every card in the actual deck', async () => {
		const directory = join(process.cwd(), 'static', 'tarot', 'rws');
		const manifest = JSON.parse(await readFile(join(directory, 'sources.json'), 'utf8')) as {
			cards: {
				cardId: string;
				file: string;
				sha256: string;
				width: number;
				height: number;
				license: string;
				source: string;
			}[];
		};
		expect(manifest.cards.map((card) => card.cardId).sort()).toEqual(
			Object.keys(tarotCanon).sort()
		);
		expect((await readdir(directory)).filter((file) => file.endsWith('.jpg')).length).toBe(78);
		for (const card of manifest.cards) {
			expect(tarotArtwork(card.cardId)).toBe(`/tarot/rws/${card.file}`);
			expect(
				createHash('sha256')
					.update(await readFile(join(directory, card.file)))
					.digest('hex')
			).toBe(card.sha256);
			expect(card.width).toBeGreaterThanOrEqual(500);
			expect(card.height).toBeGreaterThan(card.width);
			expect(card.license).toMatch(/public domain|PD/i);
			expect(card.source).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
		}
	});

	it.each(['major-22', 'cups-0', 'wands-15', 'swords-01', '../major-0', ''])(
		'rejects an unknown or unsafe card reference: %s',
		(cardId) => expect(() => tarotArtwork(cardId)).toThrow('tarot_artwork_card')
	);
});
