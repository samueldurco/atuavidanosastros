import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	memberPriceForSnapshot,
	memberPricingSnapshot,
	reviewedShopMemberPrice,
	withShopMemberPricing
} from './member-pricing';
import { GET } from '../../routes/api/member-price/+server';
import { POST } from '../../routes/api/shop/cart/+server';
import { readShopSale } from './shop/seller-identity';
import { shopCart } from './shop/shop-http';

vi.mock('./shop/seller-identity', () => ({ readShopSale: vi.fn() }));
vi.mock('./shop/shop-http', () => ({ shopCart: vi.fn() }));
const owner = '00000000-0000-4000-8000-000000000001';
const profile = '00000000-0000-4000-8000-000000000002';
const row = {
	id: '00000000-0000-4000-8000-000000000003',
	plan_id: 'premium',
	status: 'ACTIVE',
	starts_at: '2026-11-01T00:00:00Z',
	ends_at: '2027-02-01T00:00:00Z'
};
const now = Date.parse('2026-11-04T15:00:00Z');
const variantId = 'gid://shopify/ProductVariant/68006922223984';
const getClaims = vi.fn(),
	from = vi.fn();
const locals = { supabase: { auth: { getClaims }, from } } as never;
const query = (result: unknown) => {
	const chain: Record<string, ReturnType<typeof vi.fn>> = {};
	for (const method of ['select', 'eq', 'in', 'lte', 'gt', 'limit'])
		chain[method] = vi.fn(() => chain);
	chain.abortSignal = vi.fn().mockResolvedValue(result);
	return chain;
};
const event = (search = '') =>
	({ locals, url: new URL('https://atvna.test/api/member-price' + search) }) as never;
beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.setSystemTime(now);
	getClaims.mockResolvedValue({ data: { claims: { sub: owner } }, error: null });
	from.mockReturnValue(query({ data: [row], error: null }));
	vi.mocked(readShopSale).mockReturnValue({ ariesOnly: true } as never);
});
describe('commercial member pricing snapshot', () => {
	it('uses only the verified commercial owner/profile, never private evaluation cycles', async () => {
		const chain = query({ data: [{ ...row, status: 'CANCELLED' }], error: null });
		from.mockReturnValue(chain);
		const snapshot = await memberPricingSnapshot(locals, profile, now);
		expect(snapshot.status).toBe('active');
		expect(snapshot.membership?.status).toBe('cancelled');
		expect(from).toHaveBeenCalledExactlyOnceWith('atv_plus_memberships');
		expect(chain.eq).toHaveBeenCalledWith('owner_id', owner);
		expect(chain.eq).toHaveBeenCalledWith('profile_id', profile);
		expect(chain.lte).toHaveBeenCalledWith('starts_at', new Date(now).toISOString());
		expect(chain.gt).toHaveBeenCalledWith('ends_at', new Date(now).toISOString());
	});
	it('distinguishes anonymous, inactive and failed commercial lookup', async () => {
		getClaims.mockResolvedValueOnce({ data: null, error: { name: 'AuthSessionMissingError' } });
		expect((await memberPricingSnapshot(locals)).status).toBe('anonymous');
		expect(from).not.toHaveBeenCalled();
		from.mockReturnValueOnce(query({ data: [], error: null }));
		expect((await memberPricingSnapshot(locals)).status).toBe('inactive');
		from.mockReturnValueOnce(query({ data: null, error: { code: '42P01' } }));
		expect((await memberPricingSnapshot(locals)).status).toBe('unavailable');
		getClaims.mockRejectedValueOnce(new Error('network'));
		expect((await memberPricingSnapshot(locals)).status).toBe('unavailable');
	});
	it('fails closed for malformed rows and does not grant future/expired/suspended membership', async () => {
		from.mockReturnValueOnce(query({ data: [{ ...row, plan_id: 'invented' }], error: null }));
		expect((await memberPricingSnapshot(locals)).status).toBe('unavailable');
		for (const delta of [
			{ starts_at: '2027-01-01T00:00:00Z' },
			{ ends_at: new Date(now).toISOString() },
			{ status: 'SUSPENDED' }
		]) {
			from.mockReturnValueOnce(query({ data: [{ ...row, ...delta }], error: null }));
			expect((await memberPricingSnapshot(locals)).status).toBe('inactive');
		}
	});
	it('returns the reviewed regular amount until costs/margin and checkout are released', async () => {
		const snapshot = await memberPricingSnapshot(locals);
		const item = reviewedShopMemberPrice(snapshot, variantId);
		expect(item).toMatchObject({
			regularPriceCents: 7990,
			priceCents: 7990,
			source: 'regular',
			memberGate: 'cost-review-required',
			memberCheckoutSupported: false
		});
		expect(JSON.stringify(item)).not.toContain('discountBps');
		expect(reviewedShopMemberPrice(snapshot, 'unreviewed')).toBeNull();
		expect(
			memberPriceForSnapshot(snapshot, { id: 'freight', kind: 'shipping', regularPriceCents: 2990 })
				.priceCents
		).toBe(2990);
	});
});
describe('member pricing boundaries for existing commerce', () => {
	it('uses live catalog/product regular prices and leaves failed sale responses untouched', async () => {
		const product = {
			variants: [{ id: variantId, price: { amount: '82.90', currencyCode: 'BRL' } }]
		};
		for (const body of [{ products: [product] }, { product }]) {
			const response = await withShopMemberPricing(
				new Response(JSON.stringify(body), {
					headers: {
						'Cache-Control': 'public, s-maxage=3600',
						ETag: '"provider-catalog"',
						'Last-Modified': 'Wed, 04 Nov 2026 12:00:00 GMT'
					}
				}),
				locals
			);
			expect(response.headers.get('cache-control')).toBe('private, no-store');
			expect(response.headers.has('etag')).toBe(false);
			expect(response.headers.has('last-modified')).toBe(false);
			expect(await response.json()).toMatchObject({
				memberPricing: {
					items: [
						{
							regularPriceCents: 8290,
							priceCents: 8290,
							priceSource: 'provider',
							memberCheckoutSupported: false
						}
					]
				}
			});
		}
		from.mockClear();
		const unavailable = new Response('{}', { status: 503 });
		expect(await withShopMemberPricing(unavailable, locals)).toBe(unavailable);
		expect(from).not.toHaveBeenCalled();
	});
	it('rejects client supplied amounts and keeps the API private and uncacheable', async () => {
		expect((await GET(event('?priceCents=1'))).status).toBe(400);
		expect(from).not.toHaveBeenCalled();
		const response = await GET(event('?variantId=' + encodeURIComponent(variantId)));
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(await response.json()).toMatchObject({
			snapshot: { status: 'active' },
			item: { priceCents: 7990, memberCheckoutSupported: false }
		});
	});
	it('preserves sale gates and reports unavailable membership lookup explicitly', async () => {
		vi.mocked(readShopSale).mockReturnValueOnce(null);
		expect((await GET(event('?variantId=' + encodeURIComponent(variantId)))).status).toBe(404);
		from.mockReturnValueOnce(query({ data: null, error: { code: '42P01' } }));
		expect((await GET(event())).status).toBe(503);
	});
	it('adds current member context to a successful cart without changing Shopify payment amounts', async () => {
		vi.mocked(shopCart).mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					ok: true,
					checkoutUrl: 'https://test.shopify.com/cart',
					totalQuantity: 1
				}),
				{ headers: { 'Cache-Control': 'public, max-age=3600', ETag: '"provider-cart"' } }
			)
		);
		const response = await POST({ locals, getClientAddress: () => '127.0.0.1' } as never);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.has('etag')).toBe(false);
		expect(await response.json()).toMatchObject({
			ok: true,
			totalQuantity: 1,
			memberPricing: { snapshot: { status: 'active' }, memberCheckoutSupported: false }
		});
		vi.mocked(shopCart).mockResolvedValueOnce(new Response('{}', { status: 503 }));
		from.mockClear();
		expect((await POST({ locals, getClientAddress: () => '127.0.0.1' } as never)).status).toBe(503);
		expect(from).not.toHaveBeenCalled();
	});
});
