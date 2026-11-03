export const domain = 'bhvc0w-kk.myshopify.com';
export const url = 'https://atuavidanosastros.com.br/api/shop/production/paid';
const fields = ['admin_graphql_api_id', 'cancelled_at', 'financial_status', 'test'];
const required = ['read_orders', 'read_products', 'write_merchant_managed_fulfillment_orders'];
const appName = 'ATVNA Produção Dimona';
const statusQuery = `query ProductionWebhookStatus {
  shop {myshopifyDomain}
  currentAppInstallation {app {title} accessScopes {handle}}
  webhookSubscriptions(first:10,topics:[ORDERS_PAID]) {
    nodes {id uri topic format filter includeFields}
    pageInfo {hasNextPage endCursor}
  }
}`;
const createQuery = `mutation RegisterProductionWebhook($subscription:WebhookSubscriptionInput!) {
  webhookSubscriptionCreate(topic:ORDERS_PAID,webhookSubscription:$subscription) {
    webhookSubscription {id uri topic format filter includeFields}
    userErrors {field}
  }
}`;

/** @param {unknown} value @returns {Record<string, unknown>} */
function record(value) {
	return value && typeof value === 'object' && !Array.isArray(value)
		? /** @type {Record<string, unknown>} */ (value)
		: {};
}
/** @param {unknown} value */
function matches(value) {
	const webhook = record(value);
	const included = webhook.includeFields;
	return (
		webhook.uri === url &&
		webhook.topic === 'ORDERS_PAID' &&
		webhook.format === 'JSON' &&
		(webhook.filter === null || webhook.filter === '') &&
		Array.isArray(included) &&
		included.length === fields.length &&
		fields.every((f) => included.includes(f))
	);
}
/** @param {Record<string, unknown>} data */
function subscriptionState(data) {
	const app = record(data.currentAppInstallation);
	if (record(data.shop).myshopifyDomain !== domain || record(app.app).title !== appName)
		return 'wrong_installation';
	const scopes = app.accessScopes;
	if (!Array.isArray(scopes) || !required.every((s) => scopes.some((a) => record(a).handle === s)))
		return 'missing_scopes';
	const existing = record(data.webhookSubscriptions);
	if (!Array.isArray(existing.nodes) || record(existing.pageInfo).hasNextPage !== false)
		return 'incomplete_listing';
	if (!existing.nodes.length) return 'absent';
	return existing.nodes.length === 1 && matches(existing.nodes[0])
		? 'registered'
		: 'conflicting_subscription';
}
/**
 * @param {boolean} register
 * @param {(query: string, variables: Record<string, unknown>) => Promise<Record<string, unknown>>} graphql
 * @param {() => Promise<string | null>} probe
 */
export async function managePaidWebhook(register, graphql, probe) {
	const state = async () => subscriptionState(await graphql(statusQuery, {}));
	const initial = await state();
	if (initial !== 'absent' && initial !== 'registered') return initial;
	const failure = await probe();
	if (failure) return failure;
	if (!register || initial === 'registered') return initial;
	const data = await graphql(createQuery, {
		subscription: { uri: url, format: 'JSON', includeFields: fields }
	});
	const result = record(data.webhookSubscriptionCreate);
	if (
		!Array.isArray(result.userErrors) ||
		result.userErrors.length ||
		!matches(result.webhookSubscription)
	)
		return 'registration_unconfirmed';
	return (await state()) === 'registered' ? 'registered' : 'registration_unconfirmed';
}

/**
 * Fixed, synthetic probe: test notifications are discarded before any D1 write;
 * the invalid order ID also prevents accidental dispatch if test handling changes.
 * @param {typeof fetch} send
 * @param {string} secret
 */
export async function probePaidReceiver(send, secret) {
	const post = (/** @type {string} */ body, /** @type {Record<string,string>} */ headers) =>
		send(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...headers },
			body,
			redirect: 'error',
			credentials: 'omit',
			signal: AbortSignal.timeout(7000)
		});
	if ((await post('{}', {})).status !== 401) return 'receiver_unavailable';
	const body = JSON.stringify({
		admin_graphql_api_id: 'gid://shopify/Order/0',
		test: true,
		cancelled_at: null,
		financial_status: 'paid'
	});
	const utf8 = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		utf8.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const digest = await crypto.subtle.sign('HMAC', key, utf8.encode(body));
	const hmac = btoa(String.fromCharCode(...new Uint8Array(digest)));
	const response = await post(body, {
		'X-Shopify-Topic': 'orders/paid',
		'X-Shopify-Shop-Domain': domain,
		'X-Shopify-Hmac-Sha256': hmac
	});
	return response.status === 204 ? null : 'signed_probe_rejected';
}
