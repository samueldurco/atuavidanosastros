import { describe, expect, it, vi } from 'vitest';
import { shopCart, shopCatalog, shopDiagnostic } from './shop-http';

const token = 'private-token-never-in-response';
const diagnosticToken = 'diagnostic-token-private-and-at-least-thirty-two';
const configured = {
	SHOPIFY_STORE_DOMAIN: 'test-shop.myshopify.com',
	SHOPIFY_STOREFRONT_PRIVATE_TOKEN: token,
	SHOPIFY_STOREFRONT_API_VERSION: '2026-10'
};
const enabled = { ...configured, FEATURE_PHYSICAL_CHECKOUT: 'true' };
const diagnostic = {
	...configured,
	SHOPIFY_DIAGNOSTIC_ENABLED: 'true',
	SHOPIFY_DIAGNOSTIC_TOKEN: diagnosticToken
};
const emptyCatalog = {
	data: { products: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } }
};
const emptyCart = {
	data: {
		cartCreate: {
			cart: {
				id: 'gid://shopify/Cart/example?key=cart-access-secret',
				checkoutUrl: 'https://test-shop.myshopify.com/checkouts/example?key=checkout-secret',
				totalQuantity: 0
			},
			userErrors: []
		}
	}
};
function provider(payload: unknown) {
	return vi
		.fn<typeof fetch>()
		.mockResolvedValue(
			new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } })
		);
}
function request(body: unknown, auth = diagnosticToken, headers: Record<string, string> = {}) {
	return new Request('https://site.example/api/shop/diagnostic', {
		method: 'POST',
		body: JSON.stringify(body),
		headers: { 'content-type': 'application/json', authorization: `Bearer ${auth}`, ...headers }
	});
}

describe('Shop HTTP boundaries', () => {
	it('keeps public commerce closed even with a valid credential', async () => {
		const fetcher = provider(emptyCatalog);
		const catalog = await shopCatalog(configured, fetcher);
		const cart = await shopCart(request({ lines: [] }), configured, fetcher);
		expect(catalog.status).toBe(503);
		expect(cart.status).toBe(503);
		expect(fetcher).not.toHaveBeenCalled();
		expect(catalog.headers.get('cache-control')).toContain('no-store');
	});
	it('requires an explicit diagnostic gate and correct Bearer authorization', async () => {
		const fetcher = provider(emptyCatalog);
		expect((await shopDiagnostic(request({ mode: 'catalog' }), configured, fetcher)).status).toBe(
			404
		);
		for (const auth of ['', 'wrong', `${diagnosticToken}x`]) {
			expect(
				(await shopDiagnostic(request({ mode: 'catalog' }, auth), diagnostic, fetcher)).status
			).toBe(401);
		}
		const bare = request({ mode: 'catalog' }, diagnosticToken, { authorization: diagnosticToken });
		expect((await shopDiagnostic(bare, diagnostic, fetcher)).status).toBe(401);
		expect(fetcher).not.toHaveBeenCalled();
	});
	it('tests catalog access without returning products or private credentials', async () => {
		const fetcher = provider(emptyCatalog);
		const result = await shopDiagnostic(request({ mode: 'catalog' }), diagnostic, fetcher);
		expect(await result.json()).toEqual({
			ok: true,
			mode: 'catalog',
			catalogAccessible: true,
			visibleProducts: 0,
			hasNextPage: false
		});
		const outbound = new Headers(fetcher.mock.calls[0][1]?.headers);
		expect(outbound.get('Shopify-Storefront-Private-Token')).toBe(token);
		expect(outbound.has('Shopify-Storefront-Buyer-IP')).toBe(false);
	});
	it('allows only an empty cart diagnostic and removes cart access secrets', async () => {
		const fetcher = provider(emptyCart);
		const result = await shopDiagnostic(request({ mode: 'empty-cart' }), diagnostic, fetcher);
		expect(result.status).toBe(200);
		const text = await result.text();
		expect(JSON.parse(text)).toEqual({
			ok: true,
			mode: 'empty-cart',
			emptyCartCreated: true,
			checkoutUrlPresent: true,
			totalQuantity: 0,
			ordersCreated: 0,
			paymentsCreated: 0
		});
		for (const secret of [token, diagnosticToken, 'cart-access-secret', 'checkout-secret'])
			expect(text).not.toContain(secret);
		const sent = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
		expect(sent.variables).toEqual({ input: { lines: [] } });
		const forbidden = provider(emptyCart);
		expect(
			(
				await shopDiagnostic(
					request({
						mode: 'empty-cart',
						lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 }]
					}),
					diagnostic,
					forbidden
				)
			).status
		).toBe(400);
		expect(forbidden).not.toHaveBeenCalled();
	});
	it('rejects invalid media, excessive streamed bodies and malformed JSON before transport', async () => {
		const fetcher = provider(emptyCatalog);
		expect(
			(
				await shopDiagnostic(
					request({ mode: 'catalog' }, diagnosticToken, { 'content-type': 'text/plain' }),
					diagnostic,
					fetcher
				)
			).status
		).toBe(415);
		expect(
			(
				await shopDiagnostic(
					request({ mode: 'catalog', padding: 'x'.repeat(5000) }),
					diagnostic,
					fetcher
				)
			).status
		).toBe(413);
		const broken = new Request('https://site.example/api/shop/diagnostic', {
			method: 'POST',
			body: '{',
			headers: { authorization: `Bearer ${diagnosticToken}`, 'content-type': 'application/json' }
		});
		expect((await shopDiagnostic(broken, diagnostic, fetcher)).status).toBe(400);
		expect(fetcher).not.toHaveBeenCalled();
	});
	it('rejects cross-origin and empty public carts before contacting Shopify', async () => {
		const fetcher = provider(emptyCart);
		expect((await shopCart(request({ lines: [] }), enabled, fetcher)).status).toBe(403);
		expect(
			(
				await shopCart(
					request({ lines: [] }, '', { origin: 'https://elsewhere.example' }),
					enabled,
					fetcher
				)
			).status
		).toBe(403);
		expect(
			(
				await shopCart(
					request({ lines: [] }, '', { origin: 'https://site.example' }),
					enabled,
					fetcher
				)
			).status
		).toBe(400);
		expect(fetcher).not.toHaveBeenCalled();
	});
	it('reports only a static GraphQL category and HTTP status to the authorized diagnostic', async () => {
		const fetcher = provider({ errors: [{ message: `${token} / customer-data` }] });
		const result = await shopDiagnostic(request({ mode: 'catalog' }), diagnostic, fetcher);
		expect(result.status).toBe(503);
		expect(await result.json()).toEqual({
			ok: false,
			code: 'provider_unavailable',
			providerCategory: 'graphql_error',
			providerHttpStatus: 200
		});
		const publicResult = await shopCatalog(
			enabled,
			provider({ errors: [{ message: `${token} / customer-data` }] })
		);
		expect(await publicResult.json()).toEqual({ ok: false, code: 'provider_unavailable' });
	});
	it.each([401, 403, 429, 503])(
		'keeps HTTP %i provider details private and excludes response bodies and headers',
		async (status) => {
			const fetcher = vi.fn<typeof fetch>().mockImplementation(
				async () =>
					new Response(`${token} / customer-data`, {
						status,
						headers: { 'x-private-provider-detail': diagnosticToken }
					})
			);
			for (const mode of ['catalog', 'empty-cart']) {
				const result = await shopDiagnostic(request({ mode }), diagnostic, fetcher);
				expect(result.status).toBe(503);
				expect(await result.json()).toEqual({
					ok: false,
					code: 'provider_unavailable',
					providerCategory: 'http_error',
					providerHttpStatus: status
				});
			}
			const publicCatalog = await shopCatalog(enabled, fetcher);
			expect(await publicCatalog.json()).toEqual({ ok: false, code: 'provider_unavailable' });
			const publicCart = await shopCart(
				request({ lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 }] }, '', {
					origin: 'https://site.example'
				}),
				enabled,
				fetcher
			);
			expect(await publicCart.json()).toEqual({ ok: false, code: 'provider_unavailable' });
		}
	);
	it.each([
		['transport_type_error', new TypeError(`${token} / private-url / customer-data`)],
		['transport_error', new Error(`${token} / private-url / customer-data`)]
	])(
		'sanitizes transport failures without copying their message or URL (%s)',
		async (category, error) => {
			const fetcher = vi.fn<typeof fetch>().mockRejectedValue(error);
			const result = await shopDiagnostic(request({ mode: 'catalog' }), diagnostic, fetcher);
			expect(result.status).toBe(503);
			expect(await result.json()).toEqual({
				ok: false,
				code: 'provider_unavailable',
				providerCategory: category
			});
			const publicResult = await shopCatalog(enabled, fetcher);
			expect(await publicResult.json()).toEqual({ ok: false, code: 'provider_unavailable' });
		}
	);
});
