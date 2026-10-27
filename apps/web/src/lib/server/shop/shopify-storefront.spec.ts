import { afterEach, expect, it, vi } from 'vitest';
import {
	createShopCart,
	readShopCatalog,
	STOREFRONT_TIMEOUT_MS,
	type ShopCartLine,
	type StorefrontConfig
} from './shopify-storefront';

const config: StorefrontConfig = {
	shopDomain: 'synthetic-store.myshopify.com',
	privateToken: 'synthetic-private-token-for-tests',
	apiVersion: '2026-10'
};
const pageInfo = { hasNextPage: false, endCursor: null };
function catalogData() {
	return {
		data: {
			products: {
				nodes: [
					{
						id: 'gid://shopify/Product/100',
						handle: 'synthetic-product',
						title: 'Synthetic product',
						description: 'Only a unit test fixture',
						availableForSale: false,
						featuredImage: null,
						privateSupplierId: 'must-never-be-serialized',
						variants: {
							nodes: [
								{
									id: 'gid://shopify/ProductVariant/101',
									title: 'Synthetic variant',
									availableForSale: false,
									price: { amount: '23.4500', currencyCode: 'BRL' },
									selectedOptions: [{ name: 'Size', value: 'M' }]
								}
							],
							pageInfo: { hasNextPage: true, endCursor: 'variants-page-two' }
						}
					}
				],
				pageInfo: { hasNextPage: true, endCursor: 'products-page-two' }
			}
		}
	};
}
function cartData(
	totalQuantity = 0,
	checkoutUrl = 'https://synthetic-store.myshopify.com/cart/c/synthetic'
) {
	return {
		data: {
			cartCreate: {
				cart: {
					id: 'gid://shopify/Cart/synthetic?key=synthetic-test-key',
					checkoutUrl,
					totalQuantity
				},
				userErrors: []
			}
		}
	};
}
function fetchJson(value: unknown) {
	return vi.fn<typeof fetch>().mockResolvedValue(Response.json(value));
}
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

it('uses a private server token over the pinned HTTPS Storefront API and maps only public fields', async () => {
	const fetcher = fetchJson(catalogData());
	const result = await readShopCatalog(config, fetcher, '203.0.113.15');
	const [destination, init] = fetcher.mock.calls[0];
	expect(destination).toBe('https://synthetic-store.myshopify.com/api/2026-10/graphql.json');
	expect(new Headers(init?.headers).get('Shopify-Storefront-Private-Token')).toBe(
		config.privateToken
	);
	expect(new Headers(init?.headers).get('Shopify-Storefront-Buyer-IP')).toBe('203.0.113.15');
	expect(init).toMatchObject({
		method: 'POST',
		redirect: 'manual',
		cache: 'no-store',
		credentials: 'omit'
	});
	expect(init?.body).not.toContain(config.privateToken);
	expect(JSON.parse(String(init?.body)).variables).toEqual({ cursor: null });
	expect(result.products[0].variants[0].price).toEqual({ amount: '23.4500', currencyCode: 'BRL' });
	expect(result.products[0].availableForSale).toBe(false);
	expect(result.products[0]).not.toHaveProperty('privateSupplierId');
	expect(result.pageInfo).toEqual({ hasNextPage: true, endCursor: 'products-page-two' });
	expect(result.products[0].variantsPageInfo).toEqual({
		hasNextPage: true,
		endCursor: 'variants-page-two'
	});
});

it('returns a genuinely empty catalog without synthesized offers', async () => {
	const fetcher = fetchJson({ data: { products: { nodes: [], pageInfo } } });
	expect(await readShopCatalog(config, fetcher)).toEqual({ products: [], pageInfo });
	expect(new Headers(fetcher.mock.calls[0][1]?.headers).has('Shopify-Storefront-Buyer-IP')).toBe(
		false
	);
});

it('continues a catalog using the previous page cursor as a GraphQL variable', async () => {
	const fetcher = fetchJson(catalogData());
	fetcher.mockResolvedValueOnce(Response.json(catalogData()));
	fetcher.mockResolvedValueOnce(Response.json({ data: { products: { nodes: [], pageInfo } } }));
	const firstPage = await readShopCatalog(config, fetcher);
	const result = await readShopCatalog(config, fetcher, undefined, firstPage.pageInfo.endCursor!);
	const body = JSON.parse(String(fetcher.mock.calls[1][1]?.body));
	expect(body.variables).toEqual({ cursor: 'products-page-two' });
	expect(body.query).toContain('query ShopRuntimeCatalog($cursor: String)');
	expect(body.query).toContain('products(first: 25, after: $cursor)');
	expect(body.query).not.toContain('products-page-two');
	expect(result).toEqual({ products: [], pageInfo });
});

it.each([
	{ label: 'ASCII', cursor: 'x'.repeat(2048) },
	{ label: 'UTF-8', cursor: 'é'.repeat(1024) }
])('accepts an opaque $label catalog cursor at the 2048-byte limit', async ({ cursor }) => {
	const fetcher = fetchJson(catalogData());
	await readShopCatalog(config, fetcher, undefined, cursor);
	expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).variables).toEqual({ cursor });
});

it.each([
	{ label: 'empty', cursor: '' },
	{ label: 'null', cursor: null },
	{ label: 'number', cursor: 42 },
	{ label: 'NUL', cursor: 'cursor\u0000' },
	{ label: 'newline', cursor: 'cursor\n' },
	{ label: 'carriage return', cursor: 'cursor\r' },
	{ label: 'DEL', cursor: 'cursor\u007f' },
	{ label: 'C1 control', cursor: 'cursor\u0085' },
	{ label: 'oversize ASCII', cursor: 'x'.repeat(2049) },
	{ label: 'oversize UTF-8', cursor: 'é'.repeat(1025) }
])('rejects an invalid $label catalog cursor before fetching Shopify', async ({ cursor }) => {
	const fetcher = fetchJson(catalogData());
	await expect(
		readShopCatalog(config, fetcher, undefined, cursor as unknown as string)
	).rejects.toMatchObject({ code: 'invalid_cursor', status: 400, message: 'invalid_cursor' });
	expect(fetcher).not.toHaveBeenCalled();
});

it.each([
	'https://synthetic-store.myshopify.com',
	'synthetic-store.myshopify.com.evil.example',
	'synthetic-store.myshopify.com:443',
	'someone@synthetic-store.myshopify.com',
	'synthetic-store.myshopify.com/elsewhere',
	'synthetic-store.other.example'
])('rejects noncanonical shop host %s before contacting a provider', async (shopDomain) => {
	const fetcher = fetchJson(catalogData());
	await expect(readShopCatalog({ ...config, shopDomain }, fetcher)).rejects.toMatchObject({
		code: 'invalid_configuration',
		status: 503
	});
	expect(fetcher).not.toHaveBeenCalled();
});

it.each([
	{ ...config, privateToken: '' },
	{ ...config, privateToken: 'long-token-with\r\nheader-injection' },
	{ ...config, apiVersion: '2025-01' },
	{ ...config, allowedCheckoutHosts: ['https://atvna.example'] }
])(
	'rejects missing credentials, header injection or an unpinned API without leaking configuration',
	async (invalid) => {
		const fetcher = fetchJson(catalogData());
		await expect(readShopCatalog(invalid as StorefrontConfig, fetcher)).rejects.toMatchObject({
			message: 'invalid_configuration'
		});
		expect(fetcher).not.toHaveBeenCalled();
	}
);

it.each(['203.0.113.256', '203.0.113.15, 192.0.2.1', '203.0.113.15\r\nCookie: bad', 'not-an-ip'])(
	'rejects a forged buyer IP %s before contacting Shopify',
	async (buyerIp) => {
		const fetcher = fetchJson(catalogData());
		await expect(readShopCatalog(config, fetcher, buyerIp)).rejects.toMatchObject({
			code: 'invalid_buyer_ip'
		});
		expect(fetcher).not.toHaveBeenCalled();
	}
);

it('forwards a valid IPv6 address without turning it into client identity data', async () => {
	const fetcher = fetchJson({ data: { products: { nodes: [], pageInfo } } });
	await readShopCatalog(config, fetcher, '2001:db8::1');
	expect(new Headers(fetcher.mock.calls[0][1]?.headers).get('Shopify-Storefront-Buyer-IP')).toBe(
		'2001:db8::1'
	);
});

it('creates an empty cart for a controlled smoke test, without requesting an order or payment', async () => {
	const fetcher = fetchJson(cartData());
	const result = await createShopCart(config, fetcher, []);
	const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
	expect(body.variables).toEqual({ input: { lines: [] } });
	expect(body.query).toContain('cartCreate');
	expect(body.query).not.toMatch(/orderCreate|draftOrder|payment|checkoutComplete/);
	expect(result).toMatchObject({
		checkoutUrl: 'https://synthetic-store.myshopify.com/cart/c/synthetic',
		totalQuantity: 0
	});
});

it('sends only variant IDs and quantities, keeping Shopify authoritative for price', async () => {
	const fetcher = fetchJson(cartData(2));
	const lines = [{ merchandiseId: 'gid://shopify/ProductVariant/101', quantity: 2 }];
	await createShopCart(config, fetcher, lines, '203.0.113.15');
	expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).variables).toEqual({
		input: { lines }
	});
});

it.each(
	[
		[{ merchandiseId: 'gid://shopify/Product/100', quantity: 1 }],
		[{ merchandiseId: 'gid://shopify/ProductVariant/101', quantity: 0 }],
		[{ merchandiseId: 'gid://shopify/ProductVariant/101', quantity: 11 }],
		[{ merchandiseId: 'gid://shopify/ProductVariant/101', quantity: 1.5 }],
		[{ merchandiseId: 'gid://shopify/ProductVariant/101', quantity: 1, price: 1 }],
		[
			{ merchandiseId: 'gid://shopify/ProductVariant/101', quantity: 1 },
			{ merchandiseId: 'gid://shopify/ProductVariant/101', quantity: 1 }
		],
		Array.from({ length: 21 }, (_, i) => ({
			merchandiseId: `gid://shopify/ProductVariant/${i + 1}`,
			quantity: 1
		}))
	].map((lines) => [lines])
)('rejects forged or excessive cart lines before calling Shopify', async (lines) => {
	const fetcher = fetchJson(cartData());
	await expect(createShopCart(config, fetcher, lines as ShopCartLine[])).rejects.toMatchObject({
		code: 'invalid_cart',
		status: 422
	});
	expect(fetcher).not.toHaveBeenCalled();
});

it.each([
	'http://synthetic-store.myshopify.com/cart/c/test',
	'https://evil.example/cart/c/test',
	'https://someone:password@synthetic-store.myshopify.com/cart/c/test',
	'https://synthetic-store.myshopify.com/cart/c/test#secret'
])('rejects a checkout destination outside the permitted HTTPS hosts', async (destination) => {
	await expect(
		createShopCart(config, fetchJson(cartData(0, destination)), [])
	).rejects.toMatchObject({ code: 'invalid_provider_response' });
});

it('allows an explicitly configured custom checkout host and rejects a mismatched quantity', async () => {
	const custom = 'https://shop.atvna.example/cart/c/test';
	expect(
		(
			await createShopCart(
				{ ...config, allowedCheckoutHosts: ['shop.atvna.example'] },
				fetchJson(cartData(0, custom)),
				[]
			)
		).checkoutUrl
	).toBe(custom);
	await expect(createShopCart(config, fetchJson(cartData(1)), [])).rejects.toMatchObject({
		code: 'invalid_provider_response'
	});
});

it('sanitizes GraphQL and cart user errors rather than echoing provider payloads', async () => {
	await expect(
		readShopCatalog(
			config,
			fetchJson({ errors: [{ message: 'token=private value and buyer data' }] })
		)
	).rejects.toMatchObject({ message: 'provider_unavailable', status: 503 });
	await expect(
		createShopCart(
			config,
			fetchJson({
				data: {
					cartCreate: {
						cart: null,
						userErrors: [
							{ field: ['lines'], message: 'private provider diagnostic', code: 'INVALID' }
						]
					}
				}
			}),
			[]
		)
	).rejects.toMatchObject({ message: 'invalid_cart', status: 422 });
});

it('sanitizes transport errors and fails closed on an HTTP error', async () => {
	const failing = vi
		.fn<typeof fetch>()
		.mockRejectedValue(new Error(`credential ${config.privateToken}`));
	await expect(readShopCatalog(config, failing)).rejects.toMatchObject({
		message: 'provider_unavailable',
		providerDiagnostic: { category: 'transport_error' }
	});
	const denied = vi
		.fn<typeof fetch>()
		.mockResolvedValue(new Response('private response', { status: 401 }));
	await expect(readShopCatalog(config, denied)).rejects.toMatchObject({
		code: 'provider_unavailable',
		status: 503,
		providerDiagnostic: { category: 'http_error', httpStatus: 401 }
	});
});

it('rejects a redirect without following its destination or exposing its response', async () => {
	const redirect = vi.fn<typeof fetch>().mockResolvedValue(
		new Response('private redirect response', {
			status: 302,
			headers: { location: 'https://untrusted.example/collect-token' }
		})
	);
	await expect(readShopCatalog(config, redirect)).rejects.toMatchObject({
		code: 'provider_unavailable',
		status: 503,
		message: 'provider_unavailable',
		providerDiagnostic: { category: 'http_error', httpStatus: 302 }
	});
	expect(redirect).toHaveBeenCalledTimes(1);
	expect(redirect.mock.calls[0][1]?.redirect).toBe('manual');
});

it('aborts a stalled Shopify request at the bounded deadline with a sanitized timeout', async () => {
	vi.useFakeTimers();
	const stalled = vi.fn<typeof fetch>().mockImplementation(
		(_url, init) =>
			new Promise((_resolve, reject) => {
				init?.signal?.addEventListener('abort', () =>
					reject(new Error('private transport diagnostic'))
				);
			})
	);
	const assertion = expect(readShopCatalog(config, stalled)).rejects.toMatchObject({
		code: 'provider_timeout',
		status: 504,
		providerDiagnostic: { category: 'timeout' }
	});
	await vi.advanceTimersByTimeAsync(STOREFRONT_TIMEOUT_MS);
	await assertion;
});

it('rejects HTML, malformed JSON, an oversized streamed response and impossible catalog data', async () => {
	const html = vi
		.fn<typeof fetch>()
		.mockResolvedValue(
			new Response('<html>bad</html>', { headers: { 'content-type': 'text/html' } })
		);
	await expect(readShopCatalog(config, html)).rejects.toMatchObject({
		code: 'invalid_provider_response'
	});
	const invalid = vi
		.fn<typeof fetch>()
		.mockResolvedValue(new Response('{', { headers: { 'content-type': 'application/json' } }));
	await expect(readShopCatalog(config, invalid)).rejects.toMatchObject({
		code: 'invalid_provider_response'
	});
	const huge = vi
		.fn<typeof fetch>()
		.mockResolvedValue(
			new Response('x'.repeat(1_048_577), { headers: { 'content-type': 'application/json' } })
		);
	await expect(readShopCatalog(config, huge)).rejects.toMatchObject({
		code: 'invalid_provider_response'
	});
	const data = catalogData();
	data.data.products.nodes[0].variants.nodes[0].price.amount = '-1';
	await expect(readShopCatalog(config, fetchJson(data))).rejects.toMatchObject({
		code: 'invalid_provider_response'
	});
});
