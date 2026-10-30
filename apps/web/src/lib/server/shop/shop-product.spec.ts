import { describe, expect, it, vi } from 'vitest';
import { shopCart, shopProduct } from './shop-http';

vi.mock('./shop-catalog-map', () => ({
	approvedShopProducts: {
		'synthetic-product': {
			handle: 'synthetic-product',
			productId: 'gid://shopify/Product/100',
			variantIds: Array.from({ length: 51 }, (_, i) => `gid://shopify/ProductVariant/${i + 1}`)
		}
	}
}));

const configured = {
	SHOPIFY_STORE_DOMAIN: 'test-shop.myshopify.com',
	SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'synthetic-private-token',
	SHOPIFY_STOREFRONT_API_VERSION: '2026-10'
};
const enabled = { ...configured, FEATURE_PHYSICAL_CHECKOUT: 'true' };
const slug = 'synthetic-product';
const line = { merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 2 };

function productPage(ids = [1], next: string | null = null) {
	return {
		data: {
			product: {
				id: 'gid://shopify/Product/100',
				handle: slug,
				title: 'Synthetic fixture',
				description: 'Only for local tests',
				availableForSale: true,
				featuredImage: null,
				variants: {
					nodes: ids.map((id) => ({
						id: `gid://shopify/ProductVariant/${id}`,
						title: `Size ${id}`,
						availableForSale: true,
						price: { amount: '125.00', currencyCode: 'BRL' },
						selectedOptions: [{ name: 'Size', value: String(id) }]
					})),
					pageInfo: { hasNextPage: next !== null, endCursor: next }
				}
			}
		}
	};
}

function provider(...payloads: unknown[]) {
	const fetcher = vi.fn<typeof fetch>();
	for (const payload of payloads)
		fetcher.mockResolvedValueOnce(
			new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } })
		);
	return fetcher;
}

function cartRequest(lines: unknown[] = [line]) {
	return new Request('https://site.example/api/shop/cart', {
		method: 'POST',
		headers: { origin: 'https://site.example', 'content-type': 'application/json' },
		body: JSON.stringify({ lines })
	});
}

describe('Approved physical product lookup', () => {
	it('checks the closed gate before configuration, slug or provider access', async () => {
		const fetcher = provider(productPage());
		const response = await shopProduct(configured, fetcher, '__proto__');
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ ok: false, code: 'physical_commerce_disabled' });
		expect(response.headers.get('cache-control')).toContain('no-store');
		expect(fetcher).not.toHaveBeenCalled();
	});
	it.each(['unapproved-product', '__proto__', 'constructor', '../../secrets'])(
		'rejects an unmapped slug %s without a provider call',
		async (unmapped) => {
			const fetcher = provider(productPage());
			expect((await shopProduct(enabled, fetcher, unmapped)).status).toBe(404);
			expect(fetcher).not.toHaveBeenCalled();
		}
	);
	it('requires private configuration and accepts an unpublished product as unavailable', async () => {
		const fetcher = provider({ data: { product: null } });
		expect((await shopProduct({ FEATURE_PHYSICAL_CHECKOUT: 'true' }, fetcher, slug)).status).toBe(
			503
		);
		expect(fetcher).not.toHaveBeenCalled();
		expect(await (await shopProduct(enabled, fetcher, slug)).json()).toEqual({
			ok: true,
			product: null
		});
	});
	it('collects every approved variant beyond the first 50 and uses the Brazil market', async () => {
		const fetcher = provider(
			productPage(
				Array.from({ length: 50 }, (_, i) => i + 1),
				'next-page'
			),
			productPage([51])
		);
		const response = await shopProduct(enabled, fetcher, slug, '203.0.113.10');
		expect(response.status).toBe(200);
		const text = await response.text();
		const { product } = JSON.parse(text);
		expect(product.variants).toHaveLength(51);
		expect(product.variants[50].id).toBe('gid://shopify/ProductVariant/51');
		expect(product.variantsPageInfo).toEqual({ hasNextPage: false, endCursor: null });
		expect(text).not.toContain(configured.SHOPIFY_STOREFRONT_PRIVATE_TOKEN);
		expect(text).not.toContain('variantIds');
		const requests = fetcher.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
		expect(requests[0].query).toContain('@inContext(country: BR)');
		expect(requests.map((item) => item.variables)).toEqual([
			{ handle: slug, cursor: null },
			{ handle: slug, cursor: 'next-page' }
		]);
	});
	it.each(['product-id', 'handle', 'variant-id', 'currency', 'zero-price'])(
		'fails closed on an unexpected %s without exposing provider data',
		async (kind) => {
			const payload = productPage();
			const product = payload.data.product;
			if (kind === 'product-id') product.id = 'gid://shopify/Product/999';
			if (kind === 'handle') product.handle = 'other';
			if (kind === 'variant-id') product.variants.nodes[0].id = 'gid://shopify/ProductVariant/999';
			if (kind === 'currency') product.variants.nodes[0].price.currencyCode = 'USD';
			if (kind === 'zero-price') product.variants.nodes[0].price.amount = '0.00';
			const response = await shopProduct(enabled, provider(payload), slug);
			expect(response.status).toBe(503);
			expect(await response.json()).toEqual({ ok: false, code: 'invalid_provider_response' });
		}
	);
	it.each(['duplicate-variant', 'repeated-cursor', 'empty-page', 'vanished-product'])(
		'rejects incomplete or non-progressing pagination: %s',
		async (kind) => {
			const first = productPage([1], 'next-page');
			const next =
				kind === 'vanished-product'
					? { data: { product: null } }
					: productPage(
							kind === 'duplicate-variant' ? [1] : kind === 'empty-page' ? [] : [2],
							kind === 'duplicate-variant' ? null : 'next-page'
						);
			const fetcher = provider(first, next);
			const response = await shopProduct(enabled, fetcher, slug);
			expect(response.status).toBe(503);
			expect(fetcher).toHaveBeenCalledTimes(2);
		}
	);
});

describe('Direct cart submission', () => {
	it('rechecks a real variant before creating a Brazil cart and returns only the checkout handoff', async () => {
		const fetcher = provider(productPage(), {
			data: {
				cartCreate: {
					cart: {
						id: 'gid://shopify/Cart/test?key=private-cart-secret',
						checkoutUrl: 'https://test-shop.myshopify.com/checkouts/test',
						totalQuantity: 2
					},
					userErrors: []
				}
			}
		});
		const response = await shopCart(cartRequest(), enabled, fetcher);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			ok: true,
			checkoutUrl: 'https://test-shop.myshopify.com/checkouts/test',
			totalQuantity: 2
		});
		expect(fetcher).toHaveBeenCalledTimes(2);
		const mutation = JSON.parse(String(fetcher.mock.calls[1][1]?.body));
		expect(mutation.variables).toEqual({
			input: { lines: [line], buyerIdentity: { countryCode: 'BR' } }
		});
	});
	it.each(['zero-price', 'currency', 'unavailable-variant', 'unavailable-product', 'unpublished'])(
		'does not let a direct POST bypass %s checks',
		async (kind) => {
			const payload = productPage();
			if (kind === 'zero-price') payload.data.product.variants.nodes[0].price.amount = '0';
			if (kind === 'currency') payload.data.product.variants.nodes[0].price.currencyCode = 'USD';
			if (kind === 'unavailable-variant')
				payload.data.product.variants.nodes[0].availableForSale = false;
			if (kind === 'unavailable-product') payload.data.product.availableForSale = false;
			const fetcher = provider(kind === 'unpublished' ? { data: { product: null } } : payload);
			const response = await shopCart(cartRequest(), enabled, fetcher);
			expect(response.status).toBe(['zero-price', 'currency'].includes(kind) ? 503 : 409);
			expect(fetcher).toHaveBeenCalledTimes(1);
			expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).query).not.toContain('cartCreate');
		}
	);
	it.each([
		[{ ...line, merchandiseId: 'gid://shopify/ProductVariant/999' }],
		[{ ...line, quantity: 0 }],
		[{ ...line, quantity: 11 }],
		[{ ...line, price: 1 }],
		[line, line],
		[null]
	])('rejects invalid or unmapped lines before any provider call: %j', async (...lines) => {
		const fetcher = provider(productPage());
		const response = await shopCart(cartRequest(lines), enabled, fetcher);
		expect(response.status).toBe(400);
		expect(fetcher).not.toHaveBeenCalled();
	});
});
