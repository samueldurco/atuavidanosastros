import { describe, expect, it } from 'vitest';
import { shopPreviews } from './shop-products';
import { catalogPrice, filterCatalog } from './shop-catalog';

const defaults = { query: '', sign: '', partner: '', category: '', available: false };
describe('Storefront discovery', () => {
	it('finds Portuguese names without accents and combines search with type', () => {
		const found = filterCatalog(
			shopPreviews,
			{ ...defaults, query: 'caneca cancer', category: 'Caneca' },
			'featured',
			() => false
		);
		expect(found.length).toBeGreaterThan(0);
		expect(found.every((piece) => piece.sign === 'Câncer' && piece.category === 'Caneca')).toBe(
			true
		);
	});
	it('matches a pair regardless of selection order and distinguishes two equal signs', () => {
		const search = (sign: string, partner: string) =>
			filterCatalog(shopPreviews, { ...defaults, sign, partner }, 'featured', () => false);
		expect(search('Áries', 'Câncer').map((p) => p.slug)).toEqual(
			search('Câncer', 'Áries').map((p) => p.slug)
		);
		expect(search('Áries', 'Câncer')).toHaveLength(3);
		expect(search('Áries', 'Áries').every((p) => p.sign === 'Áries + Áries')).toBe(true);
	});
	it('keeps unavailable prices out of sorting and supports an online-only filter', () => {
		const canBuy = (slug: string) => slug === 'caneca-aries' || slug === 'caneca-cancer';
		for (const order of ['price-asc', 'price-desc'] as const) {
			const found = filterCatalog(shopPreviews, defaults, order, canBuy);
			expect(found.slice(0, 2).every((p) => canBuy(p.slug))).toBe(true);
			expect(catalogPrice(found[0].slug)).toBe(79.9);
		}
		expect(
			filterCatalog(shopPreviews, { ...defaults, available: true }, 'featured', canBuy)
		).toHaveLength(2);
	});
});
