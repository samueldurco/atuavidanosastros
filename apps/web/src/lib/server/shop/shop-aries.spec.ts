import { describe, expect, it, vi } from 'vitest';
import { shopAriesRoute } from '$lib/data/shop-commerce';
import { shopCart, shopProduct } from './shop-http';

const enabled = {
	FEATURE_PHYSICAL_CHECKOUT: 'true',
	SHOP_SELLER_DISCLOSURE_APPROVED: 'true',
	SHOP_ARIES_SINGLE_UNIT_ONLY: 'true',
	SHOP_DELIVERY_MAX_BUSINESS_DAYS: '8',
	SHOP_VERIFIED_FLAT_SHIPPING_BRL: '29.90',
	SHOP_SELLER_PUBLIC_NAME: 'Responsável de teste',
	SHOP_SELLER_PUBLIC_ADDRESS: 'Endereço de teste',
	SHOP_SELLER_PUBLIC_EMAIL: 'loja@example.test',
	SHOP_SELLER_PUBLIC_DOCUMENT: 'Documento de teste',
	SHOPIFY_STORE_DOMAIN: 'test-shop.myshopify.com',
	SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'synthetic-private-token',
	SHOPIFY_STOREFRONT_API_VERSION: '2026-10'
};
const line = { merchandiseId: shopAriesRoute.variantId, quantity: 1 };
const secondMug = { merchandiseId: 'gid://shopify/ProductVariant/68006922322288', quantity: 1 };
const request = (lines: unknown[], postalCode?: unknown) =>
	new Request('https://site.example/api/shop/cart', {
		method: 'POST',
		headers: { origin: 'https://site.example', 'content-type': 'application/json' },
		body: JSON.stringify({ lines, postalCode })
	});
const json = (data: unknown) =>
	new Response(JSON.stringify({ data }), { headers: { 'content-type': 'application/json' } });

const productAt = (amount: string) =>
	json({
		product: {
			id: 'gid://shopify/Product/15455054201200',
			handle: 'caneca-aries',
			title: 'Caneca Áries',
			description: 'Fixture',
			availableForSale: true,
			featuredImage: null,
			variants: {
				nodes: [
					{
						id: line.merchandiseId,
						title: 'Default Title',
						availableForSale: true,
						price: { amount: amount, currencyCode: 'BRL' },
						selectedOptions: []
					}
				],
				pageInfo: { hasNextPage: false, endCursor: null }
			}
		}
	});

const cash = (amount: string, currencyCode = 'BRL') => ({ amount, currencyCode });
const rate = (amount = '29.90', currency = 'BRL') => ({
	title: 'Entrega padrão nacional',
	estimatedCost: cash(amount, currency)
});
const delivery = {
	subtotal: cash('79.90'),
	total: cash('109.80'),
	groups: [{ deliveryOptions: [rate()] }],
	hasNextPage: false,
	addresses: [{ selected: true, oneTimeUse: true }],
	warnings: [] as { code: string }[]
};
const cartAt = (overrides: Partial<typeof delivery> = {}) => {
	const d = { ...delivery, ...overrides };
	return json({
		cartCreate: {
			cart: {
				id: 'gid://shopify/Cart/example',
				checkoutUrl: 'https://test-shop.myshopify.com/checkouts/example',
				totalQuantity: 1,
				cost: { subtotalAmount: d.subtotal, totalAmount: d.total },
				delivery: { addresses: d.addresses },
				deliveryGroups: { nodes: d.groups, pageInfo: { hasNextPage: d.hasNextPage } }
			},
			userErrors: [],
			warnings: d.warnings
		}
	});
};

describe('Compra de uma caneca Áries em Pocrane', () => {
	it('requires the reviewed deadline and preserves the public identity gate', async () => {
		for (const overrides of [
			{ SHOP_DELIVERY_MAX_BUSINESS_DAYS: '9' },
			{ SHOP_ARIES_SINGLE_UNIT_ONLY: undefined },
			{ SHOP_ARIES_SINGLE_UNIT_ONLY: 'tru' },
			{ SHOP_SELLER_DISCLOSURE_APPROVED: 'false' },
			{ FEATURE_PHYSICAL_CHECKOUT: 'false' }
		]) {
			const provider = vi.fn<typeof fetch>();
			const response = await shopCart(
				request([line], shopAriesRoute.postalCode),
				{ ...enabled, ...overrides },
				provider
			);
			expect(response.status).toBe(503);
			expect(provider).not.toHaveBeenCalled();
		}
	});
	it.each([
		['mug of a different sign', [secondMug], '36960-000', 400],
		['quantity 2', [{ ...line, quantity: 2 }], '36960-000', 400],
		['two lines', [line, secondMug], '36960-000', 400],
		['no CEP', [line], undefined, 422],
		['different CEP', [line], '35170-001', 422],
		['unexpected characters', [line], '36960+000', 422]
	] as const)('rejects %s before calling Shopify', async (_label, lines, cep, code) => {
		const provider = vi.fn<typeof fetch>();
		const response = await shopCart(request([...lines], cep), enabled, provider);
		expect(response.status).toBe(code);
		expect(provider).not.toHaveBeenCalled();
	});
	it('keeps other normally eligible mugs out of the live product API', async () => {
		const provider = vi.fn<typeof fetch>();
		expect((await shopProduct(enabled, provider, 'caneca-cancer')).status).toBe(404);
		expect(provider).not.toHaveBeenCalled();
	});
	it('refuses to list or create an Áries cart at a different item price', async () => {
		const provider = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(productAt('79.91'))
			.mockResolvedValueOnce(productAt('79.89'));
		const listing = await shopProduct(enabled, provider, 'caneca-aries');
		const cart = await shopCart(request([line], '36960-000'), enabled, provider);
		for (const response of [listing, cart]) {
			expect(response.status).toBe(409);
			expect(await response.json()).toEqual({ ok: false, code: 'variant_unavailable' });
		}
		expect(provider).toHaveBeenCalledTimes(2);
		expect(
			provider.mock.calls.every(([, init]) => !String(init?.body).includes('cartCreate'))
		).toBe(true);
	});
	it.each([
		['subtotal', { subtotal: cash('79.91') }],
		['subtotal currency', { subtotal: cash('79.90', 'USD') }],
		['total', { total: cash('109.81') }],
		['total currency', { total: cash('109.80', 'USD') }],
		['delivery rate', { groups: [{ deliveryOptions: [rate('29.91')] }] }],
		['delivery currency', { groups: [{ deliveryOptions: [rate('29.90', 'USD')] }] }],
		['no group', { groups: [] }],
		['no option', { groups: [{ deliveryOptions: [] }] }],
		['extra group', { groups: [...delivery.groups, ...delivery.groups] }],
		['extra option', { groups: [{ deliveryOptions: [rate(), rate()] }] }],
		['additional delivery page', { hasNextPage: true }],
		['unselected location', { addresses: [{ selected: false, oneTimeUse: true }] }],
		['persistent location', { addresses: [{ selected: true, oneTimeUse: false }] }],
		['missing location', { addresses: [] }],
		['provider warning', { warnings: [{ code: 'DELIVERY_ADDRESS_INVALID' }] }]
	] satisfies [string, Partial<typeof delivery>][])(
		'withholds the checkout URL if Shopify returns a different %s',
		async (_label, overrides) => {
			const provider = vi
				.fn<typeof fetch>()
				.mockResolvedValueOnce(productAt('79.90'))
				.mockResolvedValueOnce(cartAt(overrides));
			const cart = await shopCart(request([line], '36960-000'), enabled, provider);
			expect(cart.status).toBe(503);
			expect(await cart.json()).toEqual({ ok: false, code: 'invalid_provider_response' });
		}
	);
	it.each(['36960000', '36960-000'])(
		'opens the verified one-unit handoff for %s through mocked Shopify',
		async (cep) => {
			const provider = vi
				.fn<typeof fetch>()
				.mockResolvedValueOnce(productAt('79.90'))
				.mockResolvedValueOnce(cartAt());
			const response = await shopCart(request([line], cep), enabled, provider);
			expect(await response.json()).toEqual({
				ok: true,
				checkoutUrl: 'https://test-shop.myshopify.com/checkouts/example',
				totalQuantity: 1
			});
			expect(provider).toHaveBeenCalledTimes(2);
			const mutation = JSON.parse(String(provider.mock.calls[1][1]?.body));
			expect(mutation.variables.input).toEqual({
				lines: [line],
				buyerIdentity: { countryCode: 'BR' },
				delivery: {
					addresses: [
						{
							selected: true,
							oneTimeUse: true,
							address: {
								deliveryAddress: {
									countryCode: 'BR',
									provinceCode: 'MG',
									city: 'Pocrane',
									zip: '36960000'
								}
							}
						}
					]
				}
			});
		}
	);
});
