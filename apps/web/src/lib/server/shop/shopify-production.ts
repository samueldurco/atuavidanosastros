import { fail, provider, record, type PrivateEnv } from './freight-provider';

const gid = (type: string, id: unknown): id is string =>
	typeof id === 'string' && new RegExp('^gid://shopify/' + type + '/[1-9][0-9]*$').test(id);
const str = (value: unknown) => (typeof value === 'string' ? value : '');
const badData = (): never => fail('shopify_order_unavailable', 503);
const nodes = (value: unknown): Record<string, unknown>[] => {
	const c = record(value);
	if (!Array.isArray(c.nodes) || record(c.pageInfo).hasNextPage !== false) return badData();
	return c.nodes.map(record);
};
function domainFor(env: PrivateEnv) {
	const domain = env.SHOPIFY_STORE_DOMAIN;
	return domain && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)
		? domain
		: fail('production_shop_not_configured', 503);
}

// Authenticate the raw bytes. Do not retain a customer's webhook (it can contain address and tax ID).
export async function verifyShopifyPaid(request: Request, env: PrivateEnv): Promise<string | null> {
	const domain = domainFor(env);
	const secret = env.SHOPIFY_FULFILLMENT_CLIENT_SECRET;
	if (!secret) return fail('production_shop_not_configured', 503);
	const sig = request.headers.get('X-Shopify-Hmac-Sha256') ?? '';
	if (
		request.headers.get('X-Shopify-Shop-Domain') !== domain ||
		request.headers.get('X-Shopify-Topic') !== 'orders/paid' ||
		!/^[A-Za-z0-9+/]{43}=$/.test(sig)
	)
		return fail('invalid_shopify_webhook', 401);
	const limit = 1024 * 1024;
	if (Number(request.headers.get('content-length')) > limit) return fail('webhook_too_large', 413);
	const reader = request.body?.getReader();
	if (!reader) return fail('invalid_shopify_webhook', 400);
	const bytes: Uint8Array[] = [];
	let length = 0;
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			length += value.length;
			if (length > limit) {
				await reader.cancel();
				return fail('webhook_too_large', 413);
			}
			bytes.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const raw = new Uint8Array(length);
	let offset = 0;
	for (const chunk of bytes) {
		raw.set(chunk, offset);
		offset += chunk.length;
	}
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['verify']
	);
	if (
		!(await crypto.subtle.verify(
			'HMAC',
			key,
			Uint8Array.from(atob(sig), (c) => c.charCodeAt(0)),
			raw
		))
	)
		return fail('invalid_shopify_webhook', 401);
	let order: Record<string, unknown>;
	try {
		order = record(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)));
	} catch {
		return fail('invalid_shopify_webhook', 400);
	}
	if (order.test === true || order.cancelled_at || order.financial_status !== 'paid') return null;
	if (order.test !== false || !gid('Order', order.admin_graphql_api_id))
		return fail('invalid_shopify_webhook', 400);
	return order.admin_graphql_api_id;
}

let grant:
	{ domain: string; client: string; secret: string; token: string; until: number } | undefined;
async function tokenFor(env: PrivateEnv, fetcher: typeof fetch, domain: string) {
	if (env.SHOPIFY_FULFILLMENT_ADMIN_TOKEN) return env.SHOPIFY_FULFILLMENT_ADMIN_TOKEN;
	const client = env.SHOPIFY_FULFILLMENT_CLIENT_ID,
		secret = env.SHOPIFY_FULFILLMENT_CLIENT_SECRET;
	if (!client || !secret) return fail('production_shop_not_configured', 503);
	if (
		grant &&
		grant.domain === domain &&
		grant.client === client &&
		grant.secret === secret &&
		grant.until > Date.now()
	)
		return grant.token;
	const result = record(
		await provider(fetcher, 'https://' + domain + '/admin/oauth/access_token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'client_credentials',
				client_id: client,
				client_secret: secret
			}).toString()
		})
	);
	const scopes = str(result.scope)
		.split(',')
		.map((s) => s.trim());
	if (
		!scopes.includes('read_orders') ||
		!scopes.includes('read_products') ||
		!scopes.includes('write_merchant_managed_fulfillment_orders') ||
		!str(result.access_token) ||
		typeof result.expires_in !== 'number' ||
		result.expires_in <= 60
	)
		return fail('production_shop_not_configured', 503);
	grant = {
		domain,
		client,
		secret,
		token: str(result.access_token),
		until: Date.now() + (Math.min(86400, result.expires_in) - 60) * 1000
	};
	return grant.token;
}
async function admin(
	env: PrivateEnv,
	fetcher: typeof fetch,
	query: string,
	variables: Record<string, unknown>
) {
	const domain = domainFor(env);
	const res = record(
		await provider(fetcher, 'https://' + domain + '/admin/api/2026-10/graphql.json', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Access-Token': await tokenFor(env, fetcher, domain)
			},
			body: JSON.stringify({ query, variables })
		})
	);
	if (res.errors || !res.data) return badData();
	return record(res.data);
}

const paidQuery = `query ProductionPaidOrder($id: ID!) {
	order(id:$id) {
		id test cancelledAt displayFinancialStatus note tags
		currentTotalPriceSet { shopMoney { amount currencyCode } }
		currentShippingPriceSet { shopMoney { amount currencyCode } }
		shippingAddress { firstName lastName address1 address2 zip city provinceCode countryCodeV2 }
		lineItems(first:50) {nodes {id variant {id} currentQuantity unfulfilledQuantity requiresShipping
			originalUnitPriceSet { shopMoney {amount currencyCode} }
		} pageInfo {hasNextPage}}
	}
}`;
const recentQuery = `query ProductionPaidCandidates($q:String!, $after:String) {
	orders(first:25,after:$after,query:$q,sortKey:UPDATED_AT) {nodes {id} pageInfo {hasNextPage endCursor}}
}`;
function amount(money: unknown) {
	const m = record(record(money).shopMoney);
	return m.currencyCode === 'BRL' && /^\d+(\.\d{1,2})?$/.test(str(m.amount))
		? str(m.amount)
		: badData();
}
export interface PaidShopifyOrder {
	id: string;
	note: string;
	tags: string[];
	email: string;
	phone: string;
	document: string;
	totalBrl: string;
	shippingBrl: string;
	address: {
		firstName: string;
		lastName: string;
		address1: string;
		address2: string;
		city: string;
		provinceCode: string;
		zip: string;
		countryCode: string;
		phone: string;
	};
	items: { lineId: string; variantId: string; quantity: number; unitBrl: string }[];
}
export async function readPaidOrder(
	env: PrivateEnv,
	fetcher: typeof fetch,
	orderId: string
): Promise<PaidShopifyOrder | null> {
	if (!gid('Order', orderId)) return badData();
	const o = record((await admin(env, fetcher, paidQuery, { id: orderId })).order);
	if (o.id !== orderId) return badData();
	if (
		o.test !== false ||
		o.cancelledAt ||
		o.displayFinancialStatus !== 'PAID' ||
		!Array.isArray(o.tags) ||
		!o.tags.includes('atvna-entrega-nacional')
	)
		return null;
	const items = nodes(o.lineItems)
		.filter((l) => l.currentQuantity !== 0)
		.map((l) => {
			const id = record(l.variant).id;
			if (
				l.requiresShipping !== true ||
				!gid('LineItem', l.id) ||
				!gid('ProductVariant', id) ||
				typeof l.currentQuantity !== 'number' ||
				!Number.isSafeInteger(l.currentQuantity) ||
				l.currentQuantity < 1
			)
				return badData();
			return {
				lineId: l.id,
				variantId: id,
				quantity: l.currentQuantity,
				unitBrl: amount(l.originalUnitPriceSet),
				unfulfilled: l.unfulfilledQuantity
			};
		});
	if (!items.length || items.some((i) => i.unfulfilled !== i.quantity)) return null;
	const a = record(o.shippingAddress);
	return {
		id: orderId,
		note: str(o.note),
		tags: o.tags.map(str),
		email: '',
		phone: '',
		totalBrl: amount(o.currentTotalPriceSet),
		shippingBrl: amount(o.currentShippingPriceSet),
		document: '',
		address: {
			firstName: str(a.firstName),
			lastName: str(a.lastName),
			address1: str(a.address1),
			address2: str(a.address2),
			city: str(a.city),
			provinceCode: str(a.provinceCode),
			zip: str(a.zip),
			countryCode: str(a.countryCodeV2),
			phone: ''
		},
		items: items.map(({ lineId, variantId, quantity, unitBrl }) => ({
			lineId,
			variantId,
			quantity,
			unitBrl
		}))
	};
}
export async function listPaidOrders(
	env: PrivateEnv,
	fetcher: typeof fetch,
	sinceIso: string,
	after?: string
) {
	if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(sinceIso)) return badData();
	const q = "tag:atvna-entrega-nacional financial_status:paid updated_at:>='" + sinceIso + "'";
	const c = record((await admin(env, fetcher, recentQuery, { q, after: after || null })).orders);
	const page = record(c.pageInfo);
	if (
		!Array.isArray(c.nodes) ||
		typeof page.hasNextPage !== 'boolean' ||
		(page.hasNextPage && !str(page.endCursor))
	)
		return badData();
	return {
		ids: c.nodes.map((n) => {
			const id = record(n).id;
			return gid('Order', id) ? id : badData();
		}),
		endCursor: page.hasNextPage ? str(page.endCursor) : null
	};
}

const fulfillmentQuery = `query ProductionShipment($id:ID!) {
	order(id:$id) {
		id test cancelledAt displayFinancialStatus
		fulfillments(first:50) {id status trackingInfo {number} fulfillmentLineItems(first:50) {nodes {lineItem {id} quantity} pageInfo {hasNextPage}}}
		fulfillmentOrders(first:50) {nodes {id status supportedActions {action}
			lineItems(first:50) { nodes {id lineItem {id} remainingQuantity} pageInfo {hasNextPage} }
		} pageInfo {hasNextPage}}
	}
}`;
const createQuery = `mutation ProductionSetTracking($input:FulfillmentInput!) {
	fulfillmentCreate(fulfillment:$input) { fulfillment {id} userErrors {field} }
}`;
const updateQuery = `mutation ProductionUpdateTracking($id:ID!,$input:FulfillmentTrackingInput!) {
	fulfillmentTrackingInfoUpdate(fulfillmentId:$id,trackingInfoInput:$input,notifyCustomer:true) {fulfillment {id} userErrors {field}}
}`;
export interface ProductionTracking {
	orderId: string;
	items: { lineId: string; quantity: number }[];
	number: string;
	url?: string;
	company?: string;
}
export async function syncShopifyTracking(
	env: PrivateEnv,
	fetcher: typeof fetch,
	t: ProductionTracking
): Promise<string> {
	const desired = new Map(t.items.map((i) => [i.lineId, i.quantity]));
	if (
		!gid('Order', t.orderId) ||
		!t.number?.trim() ||
		t.number.length > 160 ||
		/[\u0000-\u001f]/.test(t.number) ||
		!desired.size ||
		desired.size !== t.items.length ||
		t.items.some(
			(i) => !gid('LineItem', i.lineId) || !Number.isSafeInteger(i.quantity) || i.quantity < 1
		)
	)
		return badData();
	const trackingInfo: { number: string; company?: string; url?: string } = { number: t.number };
	if (t.company) trackingInfo.company = t.company;
	if (t.url) {
		const u = URL.canParse(t.url) ? new URL(t.url) : null;
		if (!u || u.protocol !== 'https:' || u.username || u.password) return badData();
		trackingInfo.url = u.href;
	}
	const o = record((await admin(env, fetcher, fulfillmentQuery, { id: t.orderId })).order);
	if (
		o.id !== t.orderId ||
		o.test !== false ||
		o.cancelledAt ||
		o.displayFinancialStatus !== 'PAID' ||
		!Array.isArray(o.fulfillments) ||
		o.fulfillments.length >= 50
	)
		return badData();
	const confirm = (v: unknown) => {
		const payload = record(v),
			id = record(payload.fulfillment).id;
		return Array.isArray(payload.userErrors) && !payload.userErrors.length && gid('Fulfillment', id)
			? id
			: badData();
	};
	for (const existing of o.fulfillments.map(record)) {
		if (existing.status === 'CANCELLED') continue;
		const lines = nodes(existing.fulfillmentLineItems);
		if (!lines.some((l) => desired.has(str(record(l.lineItem).id)))) continue;
		if (
			existing.status !== 'SUCCESS' ||
			lines.length !== desired.size ||
			new Set(lines.map((l) => str(record(l.lineItem).id))).size !== desired.size ||
			lines.some((l) => desired.get(str(record(l.lineItem).id)) !== l.quantity) ||
			!gid('Fulfillment', existing.id) ||
			!Array.isArray(existing.trackingInfo)
		)
			return badData();
		const codes = existing.trackingInfo.map((x) => str(record(x).number)).filter(Boolean);
		if (codes.includes(t.number)) return existing.id;
		if (codes.length) return fail('shopify_tracking_conflict', 409);
		return confirm(
			(await admin(env, fetcher, updateQuery, { id: existing.id, input: trackingInfo }))
				.fulfillmentTrackingInfoUpdate
		);
	}
	const seen = new Set<string>();
	const groups = [];
	for (const fo of nodes(o.fulfillmentOrders)) {
		const lines = nodes(fo.lineItems).filter(
			(l) => desired.has(str(record(l.lineItem).id)) && Number(l.remainingQuantity) > 0
		);
		if (!lines.length) continue;
		if (
			!Array.isArray(fo.supportedActions) ||
			!fo.supportedActions.some((a) => record(a).action === 'CREATE_FULFILLMENT') ||
			!gid('FulfillmentOrder', fo.id)
		)
			return badData();
		groups.push({
			fulfillmentOrderId: fo.id,
			fulfillmentOrderLineItems: lines.map((l) => {
				const id = str(record(l.lineItem).id),
					quantity = desired.get(id)!;
				if (
					seen.has(id) ||
					!gid('FulfillmentOrderLineItem', l.id) ||
					Number(l.remainingQuantity) < quantity
				)
					return badData();
				seen.add(id);
				return { id: l.id, quantity };
			})
		});
	}
	if (seen.size !== desired.size || groups.length !== 1) return badData();
	return confirm(
		(
			await admin(env, fetcher, createQuery, {
				input: { trackingInfo, lineItemsByFulfillmentOrder: groups, notifyCustomer: true }
			})
		).fulfillmentCreate
	);
}
