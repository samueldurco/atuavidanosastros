import { describe, expect, it } from 'vitest';
import { p02Commerce, p02PriceFor, p02Products } from './shop-p02';

describe('P02 commercial release', () => {
	it('binds each approved artwork to its own BRL price and manufacturing file', () => {
		const prices = p02Products.map(p02PriceFor);
		expect(new Set(prices.map((price) => price.id)).size).toBe(2);
		expect(prices.map((price) => price.productId)).toEqual(
			p02Products.map((product) => product.id)
		);
		expect(
			prices.every(
				(price) =>
					price.currency === 'BRL' && price.amountMinor === 14900 && price.status === 'DRAFT'
			)
		).toBe(true);
		expect(new Set(p02Products.map((product) => product.binding.fileId)).size).toBe(2);
	});

	it('does not turn a provider registration into a customer checkout', () => {
		expect(p02Commerce.state).toBe('PREPARING');
		expect(p02Commerce.checkoutUrl).toBeNull();
		expect(p02Commerce.blockers).toContain('PAYMENT_ACCESS');
		expect(p02Commerce.blockers).toContain('FULFILLMENT');
	});
});
