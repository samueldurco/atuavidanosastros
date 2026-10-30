import { describe, expect, it } from 'vitest';
import { readShopSellerIdentity } from './seller-identity';

describe('public shop seller identity', () => {
	it('exposes only the explicitly public identity fields', () => {
		expect(
			readShopSellerIdentity({
				SHOP_SELLER_PUBLIC_NAME: ' Seller Example ',
				SHOP_SELLER_PUBLIC_ADDRESS: ' Example address ',
				SHOP_SELLER_PUBLIC_EMAIL: ' seller@example.test ',
				SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'never-public',
				SHOP_SELLER_PRIVATE_TAX_ID: 'never-public'
			})
		).toEqual({ name: 'Seller Example', address: 'Example address', email: 'seller@example.test' });
	});

	it('omits incomplete or invalid runtime identity instead of inventing a seller', () => {
		expect(readShopSellerIdentity({})).toBeNull();
		expect(
			readShopSellerIdentity({
				SHOP_SELLER_PUBLIC_NAME: 'Seller Example',
				SHOP_SELLER_PUBLIC_ADDRESS: 'Example address',
				SHOP_SELLER_PUBLIC_EMAIL: 'not an email'
			})
		).toBeNull();
	});
});
