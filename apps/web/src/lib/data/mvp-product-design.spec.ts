import { productCatalog } from '@atv/domain';
import { describe, expect, it } from 'vitest';
import design from './mvp-product-design.json';

describe('approved MVP product art', () => {
	it('covers exactly the visible catalog, including ATV+, without retired products', () => {
		const catalogIds = productCatalog.map((product) => product.id).sort();
		expect(Object.keys(design).sort()).toEqual(catalogIds);
	});

	it('keeps the approved Career Compass composition and asset', () => {
		const compass = design['career-compass'];
		expect(compass.theme).toBe('proposito');
		expect(compass.composition).toBe('compass');
		expect([compass.ink, compass.accent, compass.tint]).toEqual([
			'#385240',
			'#95a244',
			'#e7ebcf'
		]);
		expect(compass.art).toContain('/brand/mvp/assets/revisao/bussola-gravada.webp');
		expect(compass.art).toContain('--pa-ink:#385240;--pa-tint:#e7ebcf');
		expect(compass.art).not.toContain('/brand/redesign-2026-10-14/');
	});
});
