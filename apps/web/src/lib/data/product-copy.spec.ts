import { describe, expect, it } from 'vitest';
import { productCatalog } from '@atv/domain';
import { customerProducts, productCopy } from './product-copy';
import { productDetails } from './product-details';
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
				'solar-return',
				'direction-journey',
				'pair-preview',
				'synastry',
				'couple-dossier'
			].includes(product.id);
		expect(Boolean(supported)).toBe(true);
	});
	it('covers the 26 readings and ATV+ after replacing five old Tarot products with six methods', () => {
		expect(customerProducts).toHaveLength(27);
		expect(customerProducts.filter((product) => product.personalized)).toHaveLength(26);
	});
});
