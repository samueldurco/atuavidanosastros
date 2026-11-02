import { describe, expect, it } from 'vitest';
import { isShopCommerceEligible, reviewedUnitPrice, shopCommerceSlugs } from './shop-commerce';
import reviewedOffers from './shop-reviewed-offers.json' with { type: 'json' };
import { shopPreviews } from './shop-products';
import { shopCollections } from './shop-collections';
import { approvedShopProducts } from '$lib/server/shop/shop-catalog-map';
import { physicalOffer } from '$lib/server/shop/national-freight';

describe('Commercial product references', () => {
	it.each([
		['bone-', 59.9, ['300100237', '300100283']],
		['cropped-', 79.9, ['11910110110', '11910110111']]
	] as const)(
		'preserves all twelve signs and only the approved physical variants for %s',
		(prefix, price, skus) => {
			const pieces = shopPreviews.filter(({ slug }) => slug.startsWith(prefix));
			expect(pieces).toHaveLength(12);
			for (const piece of pieces) {
				const offers = reviewedOffers.filter(({ slug }) => slug === piece.slug);
				expect(offers, piece.slug).toHaveLength(2);
				expect(isShopCommerceEligible(piece.slug, true)).toBe(true);
				expect(offers.map(({ variantId }) => physicalOffer(variantId).dimonaSku).sort()).toEqual(
					skus
				);
				const variants = approvedShopProducts[piece.slug].variantIds;
				for (const { variantId } of offers) {
					expect(variants).toContain(variantId);
					expect(reviewedUnitPrice(variantId)).toBe(price);
				}
				for (const id of variants.filter((id) => !offers.some(({ variantId }) => variantId === id)))
					expect(() => physicalOffer(id)).toThrow();
				expect(
					shopCollections.find(({ slug }) => slug === piece.slug.slice(prefix.length))?.products
				).toContain(piece);
				expect(piece.provider).toBe('Dimona');
				if (prefix === 'bone-') {
					expect(piece.artOnly).toBe(true);
					expect(piece.printDescription).toContain('DTF plano');
					expect(piece.colors).toHaveLength(1);
					const src = new URL(piece.colors[0].images[0].src);
					expect(src.hostname).toBe('cdn.shopify.com');
					expect(src.pathname).toContain('/atvna-' + piece.slug + '-dtf.png');
				} else {
					expect(piece.colors.map(({ name }) => name)).toEqual(['Branco']);
					expect(piece.colors[0].images.length).toBeGreaterThan(0);
					expect(piece.colors[0].images.every((image) => /branc[oa]/i.test(image.alt))).toBe(true);
					expect(piece.measurements?.map((row) => row[0])).toEqual(['G', 'GG']);
				}
			}
		}
	);
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
