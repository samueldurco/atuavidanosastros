import { fail, record, zip, type PrivateEnv } from './freight-provider';
import { supplierText } from './supplier-response';
import { hasControlCharacters } from './shopify-storefront';

const orders = 'https://admin.camisadimona.com.br/api/v2/order';
const shopOrigin = 'https://atuavidanosastros.com.br';
const idPattern = /^[a-zA-Z0-9_-]{1,80}$/;
function validId(value: unknown): value is string {
	return typeof value === 'string' && idPattern.test(value);
}
function merchantId(value: unknown) {
	if (validId(value)) return value;
	return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
		? String(value)
		: null;
}
const uf = /^(AC|AL|AM|AP|BA|CE|DF|ES|GO|MA|MG|MS|MT|PA|PB|PE|PI|PR|RJ|RN|RO|RR|RS|SC|SE|SP|TO)$/;

export interface DimonaOrderInput {
	orderId: string;
	deliveryMethodId: string;
	customer: { name: string; email?: string; document?: string };
	address: {
		name?: string;
		street: string;
		number: string;
		complement?: string;
		neighborhood: string;
		city: string;
		state: string;
		zipcode: string;
		phone?: string;
	};
	items: {
		sku: string;
		name: string;
		quantity: number;
		dimonaSkuId: string;
		designs: { front: string };
		mocks: { front: string };
	}[];
	webhookUrl?: string;
}

export interface DimonaOrder {
	factoryOrderId: string;
	sellerOrderId: string;
	statusId: number;
	status: string;
	trackingCode: string | null;
	trackingUrl: string | null;
	shipped: boolean;
}

function field(value: string, max: number) {
	if (
		typeof value !== 'string' ||
		!value.trim() ||
		value.length > max ||
		hasControlCharacters(value, 0x7f)
	)
		return fail('dimona_invalid_order', 422);
	return value.trim();
}

function shopUrl(value: string) {
	const url = URL.canParse(value) ? new URL(value) : null;
	if (!url || url.origin !== shopOrigin || url.username || url.password || url.hash)
		return fail('dimona_invalid_order', 422);
	return url.href;
}

function orderBody(input: DimonaOrderInput) {
	const { address, customer } = input;
	if (
		!validId(input.orderId) ||
		typeof input.deliveryMethodId !== 'string' ||
		!/^\d{1,15}$/.test(input.deliveryMethodId) ||
		!zip(address.zipcode) ||
		!uf.test(address.state) ||
		!input.items.length ||
		input.items.length > 100
	)
		return fail('dimona_invalid_order', 422);
	return {
		order_id: input.orderId,
		delivery_method_id: input.deliveryMethodId,
		customer_name: field(customer.name, 160),
		customer_email: customer.email ? field(customer.email, 254) : undefined,
		customer_document: customer.document ? field(customer.document, 24) : undefined,
		address: {
			name: address.name ? field(address.name, 160) : field(customer.name, 160),
			street: field(address.street, 220),
			number: field(address.number, 30),
			complement: address.complement ? field(address.complement, 120) : undefined,
			neighborhood: field(address.neighborhood, 120),
			city: field(address.city, 100),
			state: address.state,
			country: 'BR',
			zipcode: zip(address.zipcode),
			phone: address.phone ? field(address.phone, 30) : undefined
		},
		items: input.items.map((item) => {
			if (
				!validId(item.sku) ||
				!validId(item.dimonaSkuId) ||
				!Number.isSafeInteger(item.quantity) ||
				item.quantity < 1
			)
				return fail('dimona_invalid_order', 422);
			// The reviewed pieces all have a single print on the front. V2 uses ordered URL arrays.
			return {
				name: field(item.name, 200),
				sku: item.sku,
				dimona_sku_id: item.dimonaSkuId,
				qty: item.quantity,
				designs: [shopUrl(item.designs.front)],
				mocks: [shopUrl(item.mocks.front)]
			};
		}),
		webhook_url: input.webhookUrl ? shopUrl(input.webhookUrl) : undefined
	};
}

// Preserve the HTTP status separately from the bounded response body. Provider error pages
// may contain customer data and credentials, so only our local error codes leave this module.
async function call(env: PrivateEnv, fetcher: typeof fetch, url: string, body?: unknown) {
	const key = env.DIMONA_FRETE_TOKEN;
	if (!key) return fail('dimona_unconfigured', 503);
	let status = 0;
	const fetchResponse: typeof fetch = async (url, init) => {
		const res = await fetcher(url, init);
		status = res.status;
		if (status === 404 || status === 422) return new Response(res.body ?? '');
		return res;
	};
	try {
		const raw = await supplierText(
			fetchResponse,
			url,
			{
				method: body === undefined ? 'GET' : 'POST',
				headers: { 'api-key': key, Accept: 'application/json', 'Content-Type': 'application/json' },
				body: body === undefined ? undefined : JSON.stringify(body)
			},
			32 * 1024
		);
		if (status === 404) return { status, data: null };
		let data: unknown;
		try {
			data = JSON.parse(raw);
		} catch {
			data = null;
		}
		return { status, data };
	} catch {
		return fail('dimona_response_unknown', 503);
	}
}

export async function createDimonaOrder(
	env: PrivateEnv,
	fetcher: typeof fetch,
	input: DimonaOrderInput
) {
	const { status, data } = await call(env, fetcher, orders, orderBody(input));
	if (status === 422) {
		if (data === 'O pedido ' + input.orderId + ' já existe')
			return fail('dimona_order_exists', 409);
		return fail('dimona_order_rejected', 422);
	}
	const factoryOrderId = record(data).order;
	if (!validId(factoryOrderId)) return fail('dimona_response_unknown', 503);
	return { factoryOrderId };
}

function trackingUrl(value: unknown, secret: string) {
	if (
		typeof value !== 'string' ||
		value.length > 2048 ||
		value.includes(secret) ||
		!URL.canParse(value)
	)
		return null;
	const url = new URL(value);
	if (url.username || url.password || url.port || url.hash) return null;
	// This is the HTTP host in the official example. Upgrade it before showing it to buyers.
	if (url.hostname === 'status.ondeestameupedido.com' && url.protocol === 'http:')
		url.protocol = 'https:';
	const trusted = [
		'ondeestameupedido.com',
		'correios.com.br',
		'jadlog.com.br',
		'melhorrastreio.com.br',
		'loggi.com'
	];
	return url.protocol === 'https:' &&
		trusted.some((host) => url.hostname === host || url.hostname.endsWith('.' + host))
		? url.href
		: null;
}

export async function readDimonaOrder(
	env: PrivateEnv,
	fetcher: typeof fetch,
	id: string,
	expectedSellerId: string
): Promise<DimonaOrder | null> {
	if (!validId(id) || !validId(expectedSellerId)) return fail('dimona_invalid_order', 422);
	const { status, data } = await call(env, fetcher, orders + '/' + encodeURIComponent(id));
	if (status === 404) return null;
	const result = record(data),
		factoryOrderId = result.dimona_id,
		sellerOrderId = merchantId(result.seller_id);
	if (
		status !== 200 ||
		!validId(factoryOrderId) ||
		(id !== expectedSellerId && id !== factoryOrderId) ||
		sellerOrderId !== expectedSellerId ||
		typeof result.status !== 'string' ||
		!result.status.trim() ||
		result.status.length > 100 ||
		hasControlCharacters(result.status, 0x7f) ||
		result.status.includes(env.DIMONA_FRETE_TOKEN!) ||
		!Number.isSafeInteger(result.status_id)
	)
		return fail('dimona_response_unknown', 503);
	const code = result.tracking_code;
	const trackingCode =
		typeof code === 'string' &&
		/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(code) &&
		!code.includes(env.DIMONA_FRETE_TOKEN!)
			? code
			: null;
	return {
		factoryOrderId,
		sellerOrderId,
		status: result.status.trim(),
		statusId: result.status_id as number,
		trackingCode,
		trackingUrl: trackingUrl(result.tracking_url, env.DIMONA_FRETE_TOKEN!),
		shipped: /^(enviado|entregue)$/i.test(result.status.trim()) && trackingCode !== null
	};
}

// Dimona documents an api_key field, not an HMAC over the webhook. Treat the message
// as a wake-up signal; only readDimonaOrder against the authenticated API can confirm shipment.
export async function verifyDimonaCallback(env: PrivateEnv, body: unknown) {
	const event = record(body),
		key = env.DIMONA_FRETE_TOKEN,
		received = event.api_key;
	if (!key || typeof received !== 'string' || received.length > 512)
		return fail('dimona_callback_denied', 401);
	const encoder = new TextEncoder();
	const [actual, expected] = await Promise.all(
		[received, key].map((v) =>
			crypto.subtle.digest('SHA-256', encoder.encode(v)).then((h) => new Uint8Array(h))
		)
	);
	let difference = 0;
	for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
	if (difference !== 0) return fail('dimona_callback_denied', 401);
	const factoryOrderId = event.dimona_id,
		sellerOrderId = merchantId(event.seller_id);
	if (!validId(factoryOrderId) || !sellerOrderId) return fail('dimona_invalid_callback', 422);
	return { factoryOrderId, sellerOrderId };
}
