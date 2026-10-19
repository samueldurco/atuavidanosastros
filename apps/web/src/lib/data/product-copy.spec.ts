import { describe, expect, it } from 'vitest';
import { offeredProductIds, productCatalog } from '@atv/domain';
import { customerOffers, customerProducts, productCopy } from './product-copy';
import { productDetails } from './product-details';
import { freeTools, freeToolById } from './free-tools';
import { loginHref, authReturnPath } from '$lib/auth-return';
import { symbolicProduct } from '$lib/symbolic-intake';
import { natalProducts } from '$lib/natal-request';

describe('customer language across the complete catalog', () => {
	it.each(productCatalog)('keeps $id recognizable and its offer truthful', (product) => {
		const customer = customerProducts.find((item) => item.id === product.id)!;
		expect(customer).toBeDefined();
		expect(productCopy).toHaveProperty(product.id);
		expect(productDetails).toHaveProperty(product.id);
		expect(customer.delivery).toEqual(product.delivery);
		expect(customer.state).toBe(product.state);
		expect(customer.href).toBe(`/produtos/${product.slug}`);
		expect(customer.cta).toBe(`Conhecer ${product.name}`);
		expect(customer.summary.length).toBeGreaterThan(30);
		if (!product.personalized) return;
		const intake = `/biblioteca/nova/${product.id}`;
		expect(authReturnPath(intake)).toBe(intake);
		expect(loginHref(intake)).toBe(`/entrar?next=${encodeURIComponent(intake)}`);
		const supported =
			symbolicProduct(product.id) ||
			natalProducts.some((id) => id === product.id) ||
			[
				'date-reading',
				'week-reading',
				'horoscope',
				'personal-calendar',
				'career-forecast-30d',
				'solar-return',
				'direction-journey',
				'pair-preview',
				'synastry',
				'couple-dossier'
			].includes(product.id);
		expect(Boolean(supported)).toBe(true);
	});
	it('keeps historical entries separate from the 19 public offers and ATV+', () => {
		expect(customerProducts).toHaveLength(28);
		expect(customerProducts.filter((product) => product.personalized)).toHaveLength(27);
		expect(customerOffers.map((product) => product.id)).toEqual(offeredProductIds);
		expect(customerOffers).toHaveLength(19);
		expect(customerOffers.every((product) => product.id !== 'atv-plus')).toBe(true);
		expect(
			customerOffers.every(
				(product) => product.summary && productDetails[product.id as keyof typeof productDetails]
			)
		).toBe(true);
	});
	it('connects all nine tools to actual public offers and preserves old tool aliases', () => {
		expect(freeTools).toHaveLength(9);
		expect(new Set(freeTools.map((tool) => tool.id)).size).toBe(9);
		for (const tool of freeTools) {
			expect(tool.offerIds.length).toBeGreaterThan(0);
			for (const id of tool.offerIds)
				expect(customerOffers.some((product) => product.id === id)).toBe(true);
		}
		expect(freeToolById('bussola-de-carreira')?.id).toBe('meio-do-ceu');
		expect(freeToolById('tarot-sim-ou-nao')?.id).toBe('carta-do-amor');
		expect(freeToolById('__proto__')).toBeUndefined();
	});
});
