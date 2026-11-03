import { describe, expect, it, vi } from 'vitest';
import {
	listPaidOrders,
	readPaidOrder,
	syncShopifyTracking,
	verifyShopifyPaid
} from './shopify-production';

const env = {
	SHOPIFY_STORE_DOMAIN: 'atvna-fixture.myshopify.com',
	SHOPIFY_FULFILLMENT_CLIENT_SECRET: 'fixture-for-tests',
	SHOPIFY_FULFILLMENT_ADMIN_TOKEN: 'fixture-only'
};
const gid = (type: string, id = 1) => 'gid://shopify/' + type + '/' + id;
const connection = (nodes: unknown[]) => ({ nodes, pageInfo: { hasNextPage: false } });
const money = (amount: string) => ({ shopMoney: { currencyCode: 'BRL', amount } });
const paid = {
	test: false,
	cancelled_at: null,
	financial_status: 'paid',
	admin_graphql_api_id: gid('Order')
};
async function signed(body: Record<string, unknown>, overrides: Record<string, string> = {}) {
	const bytes = new TextEncoder().encode(JSON.stringify(body));
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(env.SHOPIFY_FULFILLMENT_CLIENT_SECRET),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const mac = await crypto.subtle.sign('HMAC', key, bytes);
	return new Request('https://fixture.test/paid', {
		method: 'POST',
		body: bytes,
		headers: {
			'X-Shopify-Shop-Domain': env.SHOPIFY_STORE_DOMAIN,
			'X-Shopify-Topic': 'orders/paid',
			'X-Shopify-Hmac-Sha256': btoa(String.fromCharCode(...new Uint8Array(mac))),
			...overrides
		}
	});
}
function api(...responses: unknown[]) {
	return vi.fn<typeof fetch>(async () => {
		if (!responses.length) throw new Error('unexpected Shopify request');
		return Response.json({ data: responses.shift() });
	});
}
const baseOrder = {
	id: gid('Order'),
	test: false,
	cancelledAt: null,
	displayFinancialStatus: 'PAID'
};
const line = {
	id: gid('LineItem'),
	currentQuantity: 1,
	unfulfilledQuantity: 1,
	requiresShipping: true,
	variant: { id: gid('ProductVariant') },
	originalUnitPriceSet: money('79.90')
};
const source = {
	...baseOrder,
	note: 'fixture',
	tags: ['atvna-entrega-nacional', 'atvna-q-fixture'],
	currentTotalPriceSet: money('99.90'),
	currentShippingPriceSet: money('20.00'),
	shippingAddress: {
		firstName: 'Fixture',
		lastName: 'Buyer',
		address1: 'Rua fictícia 1',
		address2: '',
		zip: '00000-000',
		provinceCode: 'MG',
		countryCodeV2: 'BR',
		city: 'Fixture'
	},
	lineItems: connection([line])
};
const tracking = {
	orderId: gid('Order'),
	items: [{ lineId: gid('LineItem'), quantity: 1 }],
	number: 'TEST-123',
	url: 'https://example.org/TEST-123'
};
const fulfillable = {
	id: gid('FulfillmentOrder'),
	supportedActions: [{ action: 'CREATE_FULFILLMENT' }],
	lineItems: connection(
		[1, 2].map((id) => ({
			id: gid('FulfillmentOrderLineItem', id),
			lineItem: { id: gid('LineItem', id) },
			remainingQuantity: 1
		}))
	)
};
const existing = (number: string) => ({
	id: gid('Fulfillment'),
	status: 'SUCCESS',
	trackingInfo: number ? [{ number }] : [],
	fulfillmentLineItems: connection([{ lineItem: { id: gid('LineItem') }, quantity: 1 }])
});

describe('Shopify paid orders and tracking', () => {
	it('authenticates the exact body, shop and topic before accepting a real order or ignoring a test', async () => {
		expect(await verifyShopifyPaid(await signed(paid), env)).toBe(gid('Order'));
		expect(await verifyShopifyPaid(await signed({ ...paid, test: true }), env)).toBeNull();
		expect(
			await verifyShopifyPaid(await signed({ ...paid, financial_status: 'pending' }), env)
		).toBeNull();
		for (const overrides of [
			{ 'X-Shopify-Shop-Domain': 'another.myshopify.com' },
			{ 'X-Shopify-Topic': 'orders/create' },
			{ 'X-Shopify-Hmac-Sha256': 'A'.repeat(43) + '=' }
		] as Record<string, string>[]) {
			await expect(
				verifyShopifyPaid(await signed({ ...paid, test: true }, overrides), env)
			).rejects.toMatchObject({ status: 401 });
		}
	});
	it('reads the canonical paid amounts and shippable variant, omitting optional personal data', async () => {
		const actual = await readPaidOrder(env, api({ order: source }), gid('Order'));
		expect(actual).toMatchObject({
			totalBrl: '99.90',
			shippingBrl: '20.00',
			email: '',
			phone: '',
			document: '',
			items: [{ lineId: line.id, variantId: line.variant.id, unitBrl: '79.90', quantity: 1 }]
		});
		for (const changes of [
			{ cancelledAt: '2026-01-01' },
			{ test: true },
			{ displayFinancialStatus: 'REFUNDED' },
			{ tags: [] },
			{ lineItems: connection([{ ...line, unfulfilledQuantity: 0 }]) }
		])
			expect(
				await readPaidOrder(env, api({ order: { ...source, ...changes } }), gid('Order'))
			).toBeNull();
		await expect(
			readPaidOrder(
				env,
				api({
					order: { ...source, lineItems: { nodes: [line], pageInfo: { hasNextPage: true } } }
				}),
				gid('Order')
			)
		).rejects.toMatchObject({ status: 503 });
	});
	it('requests bounded paid candidate pages by marker and modification time', async () => {
		const f = api({
			orders: { nodes: [{ id: gid('Order') }], pageInfo: { hasNextPage: true, endCursor: 'next' } }
		});
		await expect(listPaidOrders(env, f, '2026-11-03T12:00:00.000Z', 'cursor')).resolves.toEqual({
			ids: [gid('Order')],
			endCursor: 'next'
		});
		expect(JSON.parse(String(f.mock.calls[0][1]?.body)).variables).toEqual({
			after: 'cursor',
			q: "tag:atvna-entrega-nacional financial_status:paid updated_at:>='2026-11-03T12:00:00.000Z'"
		});
	});
	it('creates a shipment for exactly the ordered line, leaving other supplier lines alone', async () => {
		const f = api(
			{ order: { ...baseOrder, fulfillments: [], fulfillmentOrders: connection([fulfillable]) } },
			{ fulfillmentCreate: { userErrors: [], fulfillment: { id: gid('Fulfillment') } } }
		);
		await expect(syncShopifyTracking(env, f, tracking)).resolves.toBe(gid('Fulfillment'));
		expect(JSON.parse(String(f.mock.calls[1][1]?.body)).variables.input).toEqual({
			notifyCustomer: true,
			trackingInfo: { number: tracking.number, url: tracking.url },
			lineItemsByFulfillmentOrder: [
				{
					fulfillmentOrderId: gid('FulfillmentOrder'),
					fulfillmentOrderLineItems: [{ id: gid('FulfillmentOrderLineItem'), quantity: 1 }]
				}
			]
		});
	});
	it('recognizes an existing shipment after a lost response and rejects conflicting tracking', async () => {
		const f = api({ order: { ...baseOrder, fulfillments: [existing(tracking.number)] } });
		await expect(syncShopifyTracking(env, f, tracking)).resolves.toBe(gid('Fulfillment'));
		expect(f).toHaveBeenCalledTimes(1);
		const other = api({ order: { ...baseOrder, fulfillments: [existing('OTHER')] } });
		await expect(syncShopifyTracking(env, other, tracking)).rejects.toMatchObject({ status: 409 });
		expect(other).toHaveBeenCalledTimes(1);
	});
	it('adds tracking on a matching existing shipment if empty and blocks unpaid or unfulfillable orders', async () => {
		const f = api(
			{ order: { ...baseOrder, fulfillments: [existing('')] } },
			{ fulfillmentTrackingInfoUpdate: { userErrors: [], fulfillment: { id: gid('Fulfillment') } } }
		);
		await expect(syncShopifyTracking(env, f, tracking)).resolves.toBe(gid('Fulfillment'));
		expect(JSON.parse(String(f.mock.calls[1][1]?.body)).query).toContain(
			'fulfillmentTrackingInfoUpdate'
		);
		for (const changes of [
			{ displayFinancialStatus: 'REFUNDED' },
			{ cancelledAt: '2026-01-01' },
			{ test: true },
			{ fulfillmentOrders: connection([{ ...fulfillable, supportedActions: [] }]) }
		]) {
			const blocked = api({
				order: {
					...baseOrder,
					fulfillments: [],
					fulfillmentOrders: connection([fulfillable]),
					...changes
				}
			});
			await expect(syncShopifyTracking(env, blocked, tracking)).rejects.toMatchObject({
				status: 503
			});
			expect(blocked).toHaveBeenCalledTimes(1);
		}
	});
});
