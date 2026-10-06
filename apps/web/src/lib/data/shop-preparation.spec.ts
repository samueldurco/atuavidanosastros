import { describe, expect, it } from 'vitest';
import {
	filterShopDirections,
	shopAudiences,
	shopDirections,
	shopFormats,
	shopTechniques
} from './shop-preparation';

describe('preparatory shop directions, not a commercial catalogue', () => {
	it('uses unique concepts and known descriptive options without offer fields', () => {
		expect(shopDirections).toHaveLength(19);
		expect(new Set(shopDirections.map((item) => item.id)).size).toBe(19);
		for (const item of shopDirections) {
			expect(item.formats.every((id) => id in shopFormats)).toBe(true);
			expect(item.techniques.every((id) => id in shopTechniques)).toBe(true);
			expect(item.audiences.every((id) => id in shopAudiences)).toBe(true);
			expect(Object.keys(item)).not.toEqual(expect.arrayContaining(['price', 'stock', 'sku']));
			expect('price' in item || 'stock' in item || 'sku' in item).toBe(false);
		}
	});
	it('combines filters and returns an empty result for incompatible directions', () => {
		expect(filterShopDirections({ technique: 'embroidery' })).toHaveLength(4);
		expect(filterShopDirections({ collection: 'simbolos-bordados', audience: 'baby' })).toEqual([]);
		expect(
			filterShopDirections({ technique: 'embroidery', format: 'polo' }).map((x) => x.id)
		).toEqual(['simbolos-bordados']);
	});
	it('normalizes accents, capitalization and whitespace', () => {
		expect(filterShopDirections({ query: '  ORBITA  ' }).map((x) => x.id)).toEqual([
			'orbita-zodiacal'
		]);
		expect(filterShopDirections({ query: 'CANECAS' }).length).toBeGreaterThan(0);
	});
	it('selects zodiac directions without claiming that any sign artwork exists', () => {
		expect(filterShopDirections({ sign: 'aries' })).toHaveLength(16);
		expect(filterShopDirections({ sign: 'aries' })).toEqual(
			filterShopDirections({ sign: 'peixes' })
		);
	});
	it('never expands an unknown concept or format into an offer', () => {
		expect(filterShopDirections({ collection: 'unknown' })).toEqual([]);
		expect(filterShopDirections({ format: 'unknown' })).toEqual([]);
	});
});
