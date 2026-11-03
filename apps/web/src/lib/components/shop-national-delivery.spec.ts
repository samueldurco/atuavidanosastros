import { render } from 'svelte/server';
import { expect, it } from 'vitest';
import ShopNationalDelivery from './ShopNationalDelivery.svelte';

it('renders a postal-code pattern accepting Brazilian CEPs with or without a hyphen', () => {
	const { body } = render(ShopNationalDelivery, {
		props: {
			slug: 'caneca-aries',
			variantId: 'gid://shopify/ProductVariant/1',
			price: 79.9,
			postalCode: '',
			fallbackBuy: async () => {},
			submitting: false,
			allowFixedRate: true
		}
	});
	const pattern = /<input\b[^>]*\bid="shop-postal-code"[^>]*\bpattern="([^"]+)"/.exec(body)?.[1];
	expect(pattern).toBe('[0-9]{5}-?[0-9]{3}');
	const validity = new RegExp(`^(?:${pattern})$`, 'v');
	expect(validity.test('35160-001')).toBe(true);
	expect(validity.test('35160001')).toBe(true);
	expect(validity.test('35160-01')).toBe(false);
	expect(validity.test('3516-0001')).toBe(false);
});
