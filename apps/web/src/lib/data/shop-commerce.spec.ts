import { describe, expect, it } from 'vitest';
import { shopCommerceSlugs } from './shop-commerce';
import { shopPreviews } from './shop-products';
import { shopCollections } from './shop-collections';
import { approvedShopProducts } from '$lib/server/shop/shop-catalog-map';

describe('Commercial product references', () => {
	it('keeps every eligible existing piece mapped and discoverable after its supplier model changes', () => {
		for (const slug of shopCommerceSlugs) {
			const pieces = shopPreviews.filter((piece) => piece.slug === slug);
			expect(pieces, slug).toHaveLength(1);
			expect(approvedShopProducts[slug]?.variantIds.length, slug).toBeGreaterThan(0);
			expect(
				shopCollections.some((collection) =>
					collection.products.some((piece) => piece.slug === slug)
				),
				slug
			).toBe(true);
			expect(pieces[0].provider, slug).toBe('Dimona');
			expect(pieces[0].imageNote, slug).toContain('referência');
		}
	});
});
