import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountOrder, AccountOrders, AccountOrderState } from '$lib/account-orders';
import { isUuid } from '$lib/library-result';
import { withRpcDeadline } from './rpc-deadline';

type Row = Record<string, unknown>;
type Purchase = { id: string; offerId: string; state: AccountOrderState; createdAt: string };

const MAX_ORDERS = 100;
const BATCH_SIZE = 75;
const states = new Set<AccountOrderState>([
	'PENDING',
	'APPROVED',
	'CANCELLED',
	'REFUNDED',
	'CHARGEDBACK'
]);

function isRow(value: unknown): value is Row {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuidValue(value: unknown): value is string {
	return typeof value === 'string' && isUuid(value);
}

function purchase(value: unknown, owner: string): Purchase {
	if (
		!isRow(value) ||
		!isUuidValue(value.id) ||
		value.user_id !== owner ||
		!isUuidValue(value.offer_id) ||
		value.provider !== 'hotmart' ||
		!states.has(value.state as AccountOrderState) ||
		typeof value.created_at !== 'string' ||
		!Number.isFinite(Date.parse(value.created_at))
	)
		throw new Error('invalid_purchase');
	return {
		id: value.id,
		offerId: value.offer_id,
		state: value.state as AccountOrderState,
		createdAt: value.created_at
	};
}

/** Caller supplies the authenticated subject; purchases and entitlements also require ownership RLS. */
export async function readAccountOrders(
	client: SupabaseClient | undefined,
	owner: string
): Promise<AccountOrders> {
	if (!client || !isUuid(owner)) return { status: 'error', items: [] };
	try {
		const { data, error } = await withRpcDeadline((signal) =>
			client
				.from('purchases')
				.select('id,user_id,offer_id,provider,state,created_at')
				.eq('user_id', owner)
				.order('created_at', { ascending: false })
				.limit(MAX_ORDERS + 1)
				.abortSignal(signal)
		);
		if (error || !Array.isArray(data) || data.length > MAX_ORDERS)
			throw new Error('account_orders_unavailable');
		const purchases = data.map((row) => purchase(row, owner));
		if (new Set(purchases.map((row) => row.id)).size !== purchases.length)
			throw new Error('duplicate_purchase');
		if (!purchases.length) return { status: 'ready', items: [] };

		const linked = new Set<string>();
		const offers = new Map<string, string>();
		for (let start = 0; start < purchases.length; start += BATCH_SIZE) {
			const batch = purchases.slice(start, start + BATCH_SIZE);
			const ids = batch.map((row) => row.id);
			const offerIds = [...new Set(batch.map((row) => row.offerId))];
			const [entitlementResult, offerResult] = await Promise.all([
				withRpcDeadline((signal) =>
					client
						.from('entitlements')
						.select('purchase_id')
						.eq('user_id', owner)
						.in('purchase_id', ids)
						.limit(MAX_ORDERS + 1)
						.abortSignal(signal)
				),
				withRpcDeadline((signal) =>
					client.rpc('owned_purchase_offers', { offer_ids: offerIds }).abortSignal(signal)
				)
			]);
			const entitlementRows: unknown = entitlementResult.data;
			const offerRows: unknown = offerResult.data;
			if (
				entitlementResult.error ||
				!Array.isArray(entitlementRows) ||
				entitlementRows.length > MAX_ORDERS ||
				offerResult.error ||
				!Array.isArray(offerRows) ||
				offerRows.length > offerIds.length
			)
				throw new Error('account_orders_unavailable');
			for (const row of entitlementRows) {
				if (!isRow(row) || !isUuidValue(row.purchase_id) || !ids.includes(row.purchase_id))
					throw new Error('invalid_entitlement');
				linked.add(row.purchase_id);
			}
			for (const row of offerRows) {
				if (
					!isRow(row) ||
					!isUuidValue(row.offer_id) ||
					!offerIds.includes(row.offer_id) ||
					typeof row.product_id !== 'string' ||
					!/^[a-z0-9-]{1,100}$/.test(row.product_id) ||
					(offers.has(row.offer_id) && offers.get(row.offer_id) !== row.product_id)
				)
					throw new Error('invalid_offer');
				offers.set(row.offer_id, row.product_id);
			}
		}
		const items: AccountOrder[] = purchases
			.filter((row) => !linked.has(row.id))
			.map((row) => {
				const productId = offers.get(row.offerId);
				if (!productId) throw new Error('missing_offer');
				return { productId, state: row.state, createdAt: row.createdAt };
			});
		return { status: 'ready', items };
	} catch {
		return { status: 'error', items: [] };
	}
}
