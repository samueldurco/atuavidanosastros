import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountRight, AccountRightState, AccountRights } from '$lib/account-rights';
import { isUuid } from '$lib/library-result';
import { withRpcDeadline } from './rpc-deadline';

type Row = Record<string, unknown>;
type EntitlementRow = {
	productId: string;
	purchaseId: string | null;
	state: AccountRightState;
	startsAt: string | null;
	endsAt: string | null;
};
type PurchaseRow = { offerId: string; state: string };

const states = new Set<AccountRightState>(['PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED']);
const purchaseStates = new Set(['PENDING', 'APPROVED', 'CANCELLED', 'REFUNDED', 'CHARGEDBACK']);
const MAX_RIGHTS = 500;
const BATCH_SIZE = 75;

function isRow(value: unknown): value is Row {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuidValue(value: unknown): value is string {
	return typeof value === 'string' && isUuid(value);
}

function timestamp(value: unknown): string | null {
	if (value === null) return null;
	if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))
		throw new Error('invalid_timestamp');
	return value;
}

function entitlement(value: unknown): EntitlementRow {
	if (!isRow(value)) throw new Error('invalid_entitlement');
	const { product_id, purchase_id, state, starts_at, ends_at } = value;
	if (
		typeof product_id !== 'string' ||
		!/^[a-z0-9-]{1,100}$/.test(product_id) ||
		(purchase_id !== null && !isUuidValue(purchase_id)) ||
		!states.has(state as AccountRightState)
	)
		throw new Error('invalid_entitlement');
	return {
		productId: product_id,
		purchaseId: purchase_id as string | null,
		state: state as AccountRightState,
		startsAt: timestamp(starts_at),
		endsAt: timestamp(ends_at)
	};
}

async function selectBatches(
	client: SupabaseClient,
	columns: string,
	ids: string[],
	owner: string
): Promise<Row[]> {
	const result: Row[] = [];
	for (let start = 0; start < ids.length; start += BATCH_SIZE) {
		const batch = ids.slice(start, start + BATCH_SIZE);
		const { data, error } = await withRpcDeadline((signal) => {
			const query = client.from('purchases').select(columns).in('id', batch).eq('user_id', owner);
			return query.abortSignal(signal);
		});
		const rows: unknown = data;
		if (error || !Array.isArray(rows) || rows.length > batch.length || !rows.every(isRow))
			throw new Error('account_rights_unavailable');
		result.push(...rows);
	}
	return result;
}

async function ownedOfferProducts(
	client: SupabaseClient,
	ids: string[]
): Promise<Map<string, string>> {
	const offers = new Map<string, string>();
	for (let start = 0; start < ids.length; start += BATCH_SIZE) {
		const batch = ids.slice(start, start + BATCH_SIZE);
		const { data, error } = await withRpcDeadline((signal) =>
			client.rpc('owned_purchase_offers', { offer_ids: batch }).abortSignal(signal)
		);
		const rows: unknown = data;
		if (error || !Array.isArray(rows) || rows.length > batch.length || !rows.every(isRow))
			throw new Error('account_rights_unavailable');
		for (const row of rows) {
			if (
				!isUuidValue(row.offer_id) ||
				typeof row.product_id !== 'string' ||
				offers.has(row.offer_id)
			)
				throw new Error('invalid_offer');
			offers.set(row.offer_id, row.product_id);
		}
	}
	return offers;
}

/** Caller supplies the authenticated subject; queries also require ownership RLS. */
export async function readAccountRights(
	client: SupabaseClient | undefined,
	owner: string
): Promise<AccountRights> {
	if (!client || !isUuid(owner)) return { status: 'error', items: [] };
	try {
		const { data, error } = await withRpcDeadline((signal) =>
			client
				.from('entitlements')
				.select('product_id,purchase_id,state,starts_at,ends_at')
				.eq('user_id', owner)
				.order('created_at', { ascending: false })
				.limit(MAX_RIGHTS + 1)
				.abortSignal(signal)
		);
		if (error || !Array.isArray(data) || data.length > MAX_RIGHTS)
			throw new Error('account_rights_unavailable');
		const rights = data.map(entitlement);
		const purchaseIds = [...new Set(rights.map((right) => right.purchaseId).filter(isUuidValue))];
		const purchaseRows = await selectBatches(
			client,
			'id,user_id,offer_id,state,provider',
			purchaseIds,
			owner
		);
		const purchases = new Map<string, PurchaseRow>();
		for (const row of purchaseRows) {
			if (
				!isUuidValue(row.id) ||
				row.user_id !== owner ||
				!isUuidValue(row.offer_id) ||
				!purchaseStates.has(row.state as string) ||
				row.provider !== 'hotmart' ||
				purchases.has(row.id)
			)
				throw new Error('invalid_purchase');
			purchases.set(row.id, { offerId: row.offer_id, state: row.state as string });
		}
		const offerIds = [...new Set([...purchases.values()].map((purchase) => purchase.offerId))];
		const offers = await ownedOfferProducts(client, offerIds);
		const now = Date.now();
		const items: AccountRight[] = rights.map((right) => {
			const purchase = right.purchaseId ? purchases.get(right.purchaseId) : undefined;
			const verifiedPurchase = Boolean(
				purchase && offers.get(purchase.offerId) === right.productId
			);
			let state = right.state;
			if (state === 'ACTIVE' && right.startsAt && Date.parse(right.startsAt) > now)
				state = 'PENDING';
			if (state === 'ACTIVE' && right.endsAt && Date.parse(right.endsAt) <= now) state = 'EXPIRED';
			if (right.purchaseId) {
				if (!verifiedPurchase) state = 'SUSPENDED';
				else if (purchase?.state === 'PENDING' && state === 'ACTIVE') state = 'PENDING';
				else if (purchase && ['CANCELLED', 'REFUNDED', 'CHARGEDBACK'].includes(purchase.state))
					state = 'REVOKED';
			}
			return {
				productId: right.productId,
				state,
				source: verifiedPurchase ? 'purchase' : 'unknown',
				sourceLabel: verifiedPurchase
					? purchase?.state === 'APPROVED'
						? 'Compra confirmada'
						: 'Pedido registrado'
					: 'Acesso registrado',
				startsAt: right.startsAt,
				endsAt: right.endsAt
			};
		});
		return { status: 'ready', items };
	} catch {
		return { status: 'error', items: [] };
	}
}
