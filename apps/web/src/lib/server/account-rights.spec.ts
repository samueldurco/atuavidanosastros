import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readAccountRights } from './account-rights';

const owner = '00000000-0000-4000-8000-000000000052';
const purchaseId = '00000000-0000-4000-8000-000000000053';
const offerId = '00000000-0000-4000-8000-000000000054';
const right = {
	product_id: 'purpose-career',
	purchase_id: purchaseId,
	state: 'ACTIVE',
	starts_at: null,
	ends_at: null
};
const purchase = {
	id: purchaseId,
	user_id: owner,
	offer_id: offerId,
	provider: 'hotmart',
	state: 'APPROVED'
};
const offer = { offer_id: offerId, product_id: 'purpose-career' };

function clientFor(rows: Record<string, unknown[] | null>) {
	const from = vi.fn((table: string) => {
		const query = {
			select: vi.fn(),
			eq: vi.fn(),
			order: vi.fn(),
			limit: vi.fn(),
			in: vi.fn(),
			abortSignal: vi.fn(async () => ({ data: rows[table] ?? null, error: null }))
		};
		for (const method of ['select', 'eq', 'order', 'limit', 'in'] as const)
			query[method].mockReturnValue(query);
		return query;
	});
	const rpc = vi.fn(() => ({
		abortSignal: vi.fn(async () => ({ data: rows.offers ?? null, error: null }))
	}));
	return { client: { from, rpc } as unknown as SupabaseClient, from, rpc };
}

describe('Minha Área access projection', () => {
	it('recognizes only a matching approved purchase as purchase-backed access', async () => {
		const mock = clientFor({ entitlements: [right], purchases: [purchase], offers: [offer] });
		expect(await readAccountRights(mock.client, owner)).toEqual({
			status: 'ready',
			items: [
				{
					productId: 'purpose-career',
					state: 'ACTIVE',
					source: 'purchase',
					sourceLabel: 'Compra confirmada',
					startsAt: null,
					endsAt: null
				}
			]
		});
		expect(mock.from).toHaveBeenCalledWith('entitlements');
		expect(mock.from).toHaveBeenCalledWith('purchases');
		expect(mock.rpc).toHaveBeenCalledWith('owned_purchase_offers', { offer_ids: [offerId] });
	});

	it.each([
		['PENDING', 'PENDING'],
		['CANCELLED', 'REVOKED'],
		['REFUNDED', 'REVOKED'],
		['CHARGEDBACK', 'REVOKED']
	] as const)('projects %s purchase as %s access', async (purchaseState, expected) => {
		const mock = clientFor({
			entitlements: [right],
			purchases: [{ ...purchase, state: purchaseState }],
			offers: [offer]
		});
		const result = await readAccountRights(mock.client, owner);
		expect(result.items[0]?.state).toBe(expected);
	});

	it('suspends an unverified purchase instead of claiming an avulso or ATV+ benefit', async () => {
		const mock = clientFor({
			entitlements: [right],
			purchases: [purchase],
			offers: [{ ...offer, product_id: 'another-product' }]
		});
		expect((await readAccountRights(mock.client, owner)).items[0]).toMatchObject({
			state: 'SUSPENDED',
			source: 'unknown',
			sourceLabel: 'Acesso registrado'
		});
	});

	it('respects starts and ends and keeps a grant without purchase source neutral', async () => {
		const mock = clientFor({
			entitlements: [
				{ ...right, purchase_id: null, starts_at: '2100-01-01T00:00:00Z' },
				{ ...right, purchase_id: null, ends_at: '2000-01-01T00:00:00Z' }
			]
		});
		const result = await readAccountRights(mock.client, owner);
		expect(result.items.map((item) => [item.state, item.source])).toEqual([
			['PENDING', 'unknown'],
			['EXPIRED', 'unknown']
		]);
		expect(mock.from).toHaveBeenCalledTimes(1);
		expect(mock.rpc).not.toHaveBeenCalled();
	});

	it('fails closed when purchase evidence is unavailable or malformed', async () => {
		const missing = clientFor({ entitlements: [right], purchases: [], offers: [] });
		expect((await readAccountRights(missing.client, owner)).items[0]?.state).toBe('SUSPENDED');
		const malformed = clientFor({ entitlements: [{ ...right, ends_at: 'not-a-date' }] });
		expect(await readAccountRights(malformed.client, owner)).toEqual({
			status: 'error',
			items: []
		});
		const missingOffer = clientFor({ entitlements: [right], purchases: [purchase], offers: [] });
		expect((await readAccountRights(missingOffer.client, owner)).items[0]?.state).toBe('SUSPENDED');
	});
});
