import { describe, expect, it, vi } from 'vitest';
import { shopCollections } from './shop-collections';
import { shopPreviews } from './shop-products';

vi.mock('./shop-reviewed-offers.json', () => ({
	default: [{ slug: 'poster-aries' }, { slug: 'quadro-aries' }]
}));

describe('wall pieces with reviewed national offers', () => {
	it('uses the domestic model for each reviewed listing and preserves its collection', () => {
		const aries = shopCollections.find((c) => c.slug === 'aries')!;
		for (const slug of ['poster-aries', 'quadro-aries']) {
			const piece = shopPreviews.find((p) => p.slug === slug)!;
			expect(piece.provider).toBe('Digipix Pro');
			expect(aries.products).toContain(piece);
			expect(piece.imageNote).toContain('referência');
			if (slug === 'poster-aries') {
				expect(piece.material).toContain('verniz brilhante');
				expect(piece.construction.value).toContain('sem moldura');
			} else {
				expect(piece.material).toContain('vidro');
				expect(piece.construction.value).toContain('34 × 44');
				expect(piece.colors[0].images.every((image) => !image.alt.includes('30 × 40'))).toBe(true);
			}
		}
		expect(shopPreviews.find((p) => p.slug === 'poster-touro')?.provider).toBe('Gelato');
	});
});
