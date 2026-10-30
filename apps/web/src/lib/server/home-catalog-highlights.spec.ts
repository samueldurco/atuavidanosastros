import { describe, expect, it } from 'vitest';
import { catalogPublications } from '$lib/data/home-publications';
import { customerOffers } from '$lib/data/product-copy';
import { shopPreviews } from '$lib/data/shop-products';
import { homeCatalogHighlights } from './home-catalog-highlights';

describe('home publication snapshot', () => {
	it('joins the deployed collection presentations to real catalog images and destinations', () => {
		const result = homeCatalogHighlights();
		expect(result.shopHighlights).toHaveLength(3);
		for (const entry of result.shopHighlights) {
			const product = shopPreviews.find((item) => item.slug === entry.id)!;
			expect(
				product.colors.flatMap((color) => color.images).some((image) => image.src === entry.image)
			).toBe(true);
			expect(entry.href).toBe(`/loja/peca/${product.slug}`);
		}
	});
	it('does not promote missing, undated, unpublished or unapproved presentations', () => {
		const record = catalogPublications[0];
		expect(
			homeCatalogHighlights([
				{ ...record, id: 'missing' },
				{ ...record, publishedAt: '' },
				{ ...record, source: '' },
				{ ...record, image: 'invented.webp' },
				{ ...record, publishedAt: '2999-01-01T00:00:00Z' }
			]).shopHighlights
		).toEqual([]);
	});
	it('selects a newly published real catalog entry without changing the home component', () => {
		const product = shopPreviews.find(
			(item) => !catalogPublications.some((record) => record.id === item.slug)
		)!;
		const image = product.colors.flatMap((color) => color.images)[0];
		const result = homeCatalogHighlights([
			{
				kind: 'shop',
				id: product.slug,
				image: image.src,
				publishedAt: '2026-10-20T00:00:00Z',
				source: 'test-publication'
			}
		]);
		expect(result.shopHighlights.map((item) => item.id)).toEqual([product.slug]);
	});
	it('cannot turn a digital product in preparation into a launch by adding a date', () => {
		const product = customerOffers.find((item) => item.state === 'PREPARING')!;
		expect(
			homeCatalogHighlights([
				{
					kind: 'digital',
					id: product.id,
					publishedAt: '2026-10-20T00:00:00Z',
					source: 'test-publication'
				}
			]).digitalHighlights
		).toEqual([]);
	});
});
