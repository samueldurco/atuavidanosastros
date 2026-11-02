import { testShopSeller } from '../../../../tests/fixtures/shop-seller';
import { describe, expect, it, vi } from 'vitest';
import { shopAriesRoute } from '$lib/data/shop-commerce';
import reviewedOffers from '$lib/data/shop-reviewed-offers.json' with { type: 'json' };
import { shopCart, shopProduct } from './shop-http';
import { approvedShopProducts } from './shop-catalog-map';

const enabled = {
	FEATURE_PHYSICAL_CHECKOUT: 'true',
	SHOP_SELLER_DISCLOSURE_APPROVED: 'true',
	SHOP_ARIES_SINGLE_UNIT_ONLY: 'true',
	SHOP_DELIVERY_MAX_BUSINESS_DAYS: '8',
	SHOP_VERIFIED_FLAT_SHIPPING_BRL: '29.90',
	...testShopSeller,
	SHOPIFY_STORE_DOMAIN: 'test-shop.myshopify.com',
	SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'synthetic-private-token',
	SHOPIFY_STOREFRONT_API_VERSION: '2026-10'
};
const line = { merchandiseId: shopAriesRoute.variantId, quantity: 1 };
const secondMug = { merchandiseId: 'gid://shopify/ProductVariant/68006922322288', quantity: 1 };
const bag = { merchandiseId: approvedShopProducts['ecobag-aries'].variantIds[0], quantity: 1 };
const request = (lines: unknown[], postalCode?: unknown) =>
	new Request('https://site.example/api/shop/cart', {
		method: 'POST',
		headers: { origin: 'https://site.example', 'content-type': 'application/json' },
		body: JSON.stringify({ lines, postalCode })
	});
const json = (data: unknown) =>
	new Response(JSON.stringify({ data }), { headers: { 'content-type': 'application/json' } });

const productAt = (
	amount: string,
	slug = 'caneca-aries',
	variantId = approvedShopProducts[slug].variantIds[0]
) =>
	json({
		product: {
			id: approvedShopProducts[slug].productId,
			handle: slug,
			title: slug,
			description: 'Fixture',
			availableForSale: true,
			featuredImage: null,
			variants: {
				nodes: [
					{
						id: variantId,
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
const location = (zip = '36960000', provinceCode = 'MG', countryCode = 'BR') => ({
	selected: true,
	oneTimeUse: true,
	address: { zip, provinceCode, countryCode }
});
const delivery = {
	subtotal: cash('79.90'),
	total: cash('109.80'),
	groups: [{ deliveryOptions: [rate()] }],
	hasNextPage: false,
	addresses: [location()],
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

describe('Compra de uma unidade com preço e destino conferidos', () => {
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
		['unreviewed CEP', [line], '00000-000', 422],
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
		[
			'delivery method',
			{ groups: [{ deliveryOptions: [{ ...rate(), title: 'Retirada no balcão' }] }] }
		],
		['delivery currency', { groups: [{ deliveryOptions: [rate('29.90', 'USD')] }] }],
		['no group', { groups: [] }],
		['no option', { groups: [{ deliveryOptions: [] }] }],
		['extra group', { groups: [...delivery.groups, ...delivery.groups] }],
		['extra option', { groups: [{ deliveryOptions: [rate(), rate()] }] }],
		['additional delivery page', { hasNextPage: true }],
		['unselected location', { addresses: [{ ...location(), selected: false }] }],
		['persistent location', { addresses: [{ ...location(), oneTimeUse: false }] }],
		['changed CEP', { addresses: [location('35160001')] }],
		['changed UF', { addresses: [location('36960000', 'SP')] }],
		['changed country', { addresses: [location('36960000', 'MG', 'PT')] }],
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
	it('uses the ecobag price and the Ipatinga destination in the Shopify handoff', async () => {
		const provider = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(productAt('49.90', 'ecobag-aries'))
			.mockResolvedValueOnce(
				cartAt({
					subtotal: cash('49.90'),
					total: cash('79.80'),
					addresses: [location('35160-001')]
				})
			);
		const response = await shopCart(request([bag], '35160-001'), enabled, provider);
		expect(response.status).toBe(200);
		const mutation = JSON.parse(String(provider.mock.calls[1][1]?.body));
		expect(mutation.variables.input.delivery.addresses[0].address.deliveryAddress).toEqual({
			countryCode: 'BR',
			provinceCode: 'MG',
			city: 'Ipatinga',
			zip: '35160001'
		});
	});
	it('refuses a bag checkout calculated at the mug price', async () => {
		const provider = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(productAt('49.90', 'ecobag-aries'))
			.mockResolvedValueOnce(cartAt());
		const response = await shopCart(request([bag], '36960-000'), enabled, provider);
		expect(response.status).toBe(503);
	});
	it.each(['bone-aries', 'cropped-touro'])(
		'hands off a reviewed %s to checkout only in the reviewed catalog',
		async (slug) => {
			const { variantId, priceBrl } = reviewedOffers.find((offer) => offer.slug === slug)!;
			const variant = { merchandiseId: variantId, quantity: 1 };
			const provider = vi
				.fn<typeof fetch>()
				.mockResolvedValueOnce(productAt(priceBrl.toFixed(2), slug, variantId))
				.mockResolvedValueOnce(
					cartAt({
						subtotal: cash(priceBrl.toFixed(2)),
						total: cash((priceBrl + 29.9).toFixed(2)),
						addresses: [location('35160-001')]
					})
				);
			const response = await shopCart(request([variant], '35160-001'), enabled, provider);
			expect(response.status).toBe(200);
			expect(JSON.parse(String(provider.mock.calls[1][1]?.body)).variables.input.lines).toEqual([
				variant
			]);
			const legacy = await shopCart(
				request([variant], '35160-001'),
				{
					...enabled,
					SHOP_ARIES_SINGLE_UNIT_ONLY: 'false',
					SHOP_DELIVERY_MAX_BUSINESS_DAYS: '40'
				},
				provider
			);
			expect(legacy.status).toBe(400);
			expect(provider).toHaveBeenCalledTimes(2);
		}
	);
	it('não inclui uma peça no frete fixo quando a Dimona esgota a base ou o transporte supera o valor aceito', async () => {
		for (const [skuStock, shipping, status] of [
			[0, '12.00', 409],
			[2, '38.00', 422]
		] as const) {
			const provider = vi.fn<typeof fetch>(async (url, init) => {
				if (String(url).endsWith('/availability')) return Response.json({ bolsaecom: skuStock });
				if (String(url).endsWith('/shipping'))
					return Response.json([
						{ value: shipping, name: 'PAC', delivery_method_id: '1', business_days: 9 }
					]);
				if (String(init?.body).includes('cartCreate')) throw new Error('unexpected cart');
				return productAt('49.90', 'ecobag-aries');
			});
			expect(
				(
					await shopCart(
						request([bag], '35160-001'),
						{ ...enabled, DIMONA_FRETE_TOKEN: 'test-only' },
						provider
					)
				).status
			).toBe(status);
		}
	});
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
