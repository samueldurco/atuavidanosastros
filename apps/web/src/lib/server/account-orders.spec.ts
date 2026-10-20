import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readAccountOrders } from './account-orders';

const owner = '00000000-0000-4000-8000-000000000052';
const otherOwner = '00000000-0000-4000-8000-000000000099';
const approvedId = '00000000-0000-4000-8000-000000000053';
const pendingId = '00000000-0000-4000-8000-000000000055';
const offerId = '00000000-0000-4000-8000-000000000054';
const order = (id: string, state: string, userId = owner) => ({
	id,
	user_id: userId,
	offer_id: offerId,
	provider: 'hotmart',
	state,
	created_at: '2026-10-19T12:00:00Z',
	provider_transaction_id: 'secret'
});

function clientFor(rows: {
	purchases?: unknown;
	entitlements?: unknown;
	offers?: unknown;
	purchaseError?: unknown;
	entitlementError?: unknown;
	offerError?: unknown;
}) {
	function makeQuery(table: string) {
		const q = {
			select: vi.fn(),
			eq: vi.fn(),
			order: vi.fn(),
			limit: vi.fn(),
			in: vi.fn(),
			abortSignal: vi.fn(async () => ({
				data: table === 'purchases' ? rows.purchases : rows.entitlements,
				error:
					table === 'purchases' ? (rows.purchaseError ?? null) : (rows.entitlementError ?? null)
			}))
		};
		for (const method of ['select', 'eq', 'order', 'limit', 'in'] as const)
			q[method].mockReturnValue(q);
		return q;
	}
	const queries: Record<string, ReturnType<typeof makeQuery>> = {};
	const from = vi.fn((table: string) => {
		const q = makeQuery(table);
		queries[table] = q;
		return q;
	});
	const rpc = vi.fn(() => ({
		abortSignal: vi.fn(async () => ({ data: rows.offers, error: rows.offerError ?? null }))
	}));
	return { client: { from, rpc } as unknown as SupabaseClient, from, rpc, queries };
}

describe('owner order projection without a linked entitlement', () => {
	it('shows confirmed and pending orders without granting access or exposing purchase identifiers', async () => {
		const m = clientFor({
			purchases: [order(approvedId, 'APPROVED'), order(pendingId, 'PENDING')],
			entitlements: [],
			offers: [{ offer_id: offerId, product_id: 'birth-chart' }]
		});
		expect(await readAccountOrders(m.client, owner)).toEqual({
			status: 'ready',
			items: [
				{ productId: 'birth-chart', state: 'APPROVED', createdAt: '2026-10-19T12:00:00Z' },
				{ productId: 'birth-chart', state: 'PENDING', createdAt: '2026-10-19T12:00:00Z' }
			]
		});
		expect(m.queries.purchases.eq).toHaveBeenCalledWith('user_id', owner);
		expect(m.queries.purchases.limit).toHaveBeenCalledWith(101);
		expect(m.queries.entitlements.eq).toHaveBeenCalledWith('user_id', owner);
		expect(m.queries.entitlements.in).toHaveBeenCalledWith('purchase_id', [approvedId, pendingId]);
		expect(m.rpc).toHaveBeenCalledWith('owned_purchase_offers', { offer_ids: [offerId] });
	});

	it('omits an order that already has an entitlement', async () => {
		const m = clientFor({
			purchases: [order(approvedId, 'APPROVED'), order(pendingId, 'PENDING')],
			entitlements: [{ purchase_id: approvedId }],
			offers: [{ offer_id: offerId, product_id: 'birth-chart' }]
		});
		expect((await readAccountOrders(m.client, owner)).items).toEqual([
			{ productId: 'birth-chart', state: 'PENDING', createdAt: '2026-10-19T12:00:00Z' }
		]);
	});

	it.each([
		[
			'foreign owner',
			{ purchases: [order(approvedId, 'APPROVED', otherOwner)], entitlements: [], offers: [] }
		],
		['missing offer', { purchases: [order(approvedId, 'APPROVED')], entitlements: [], offers: [] }],
		[
			'failed entitlement lookup',
			{
				purchases: [order(approvedId, 'APPROVED')],
				entitlements: [],
				offers: [],
				entitlementError: { message: 'offline' }
			}
		],
		['failed purchase lookup', { purchases: [], purchaseError: { message: 'offline' } }],
		[
			'limit exceeded',
			{ purchases: Array.from({ length: 101 }, () => order(approvedId, 'PENDING')) }
		]
	] as const)('fails closed on %s', async (_reason, rows) => {
		const m = clientFor(rows);
		expect(await readAccountOrders(m.client, owner)).toEqual({ status: 'error', items: [] });
	});

	it('does not query without a verified owner', async () => {
		const m = clientFor({ purchases: [] });
		expect(await readAccountOrders(m.client, 'not-an-owner')).toEqual({
			status: 'error',
			items: []
		});
		expect(m.from).not.toHaveBeenCalled();
	});
});
