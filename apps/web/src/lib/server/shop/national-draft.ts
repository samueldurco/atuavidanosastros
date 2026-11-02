import { fail, normal, provider, record, zip, type PrivateEnv } from './national-freight';
export interface SealedQuote {
	nonce: string;
	expires: number;
	variantId: string;
	postalCode: string;
	city: string;
	provinceCode: string;
	unit: number;
	shipping: number;
	days: number;
	service: string;
	serviceId: string;
	sku: string;
}
const utf = new TextEncoder();
const b64 = (b: Uint8Array) =>
	btoa(Array.from(b, (v) => String.fromCharCode(v)).join(''))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/, '');
const un64 = (v: string) =>
	Uint8Array.from(atob(v.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));
const key = (secret: string) =>
	crypto.subtle.importKey('raw', utf.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
		'sign',
		'verify'
	]);
export const mac = async (secret: string, v: string) =>
	b64(new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), utf.encode(v))));
export async function seal(q: SealedQuote, secret: string) {
	const body = b64(utf.encode(JSON.stringify(q)));
	return body + '.' + (await mac(secret, 'quote:' + body));
}
export async function openQuote(token: unknown, secret: string, now: number): Promise<SealedQuote> {
	if (typeof token !== 'string' || token.length > 2300 || !/^[\w-]+\.[\w-]{43}$/.test(token))
		return fail('invalid_quote', 422);
	const [body, sig] = token.split('.');
	try {
		if (
			!(await crypto.subtle.verify(
				'HMAC',
				await key(secret),
				un64(sig),
				utf.encode('quote:' + body)
			))
		)
			throw new Error();
		const q = JSON.parse(new TextDecoder().decode(un64(body))) as SealedQuote;
		if (!Number.isSafeInteger(q.expires) || q.expires <= now || q.expires > now + 601)
			return fail('quote_expired', 409);
		return q;
	} catch (e) {
		if (e instanceof Error && e.message === 'quote_expired') throw e;
		return fail('invalid_quote', 422);
	}
}
type BuyerAddress = {
	firstName: string;
	lastName: string;
	address1: string;
	address2: string;
	city: string;
	provinceCode: string;
	zip: string;
	countryCode: 'BR';
};
function fld(s: unknown, max: number, min = 1) {
	if (
		typeof s !== 'string' ||
		s.trim().length < min ||
		s.trim().length > max ||
		/[\u0000-\u001f\u007f<>]/.test(s)
	)
		return fail('invalid_address');
	return s.trim().replace(/\s+/g, ' ');
}
export function addressFor(input: unknown, q: SealedQuote): BuyerAddress {
	const a = record(input),
		city = fld(a.city, 100),
		street = fld(a.address1, 220, 4);
	if (
		zip(a.postalCode) !== q.postalCode ||
		a.provinceCode !== q.provinceCode ||
		normal(city) !== normal(q.city)
	)
		return fail('address_does_not_match_quote');
	if (!/\d|\bs\s*\/?\s*n\b|sem n[uú]mero/i.test(street)) return fail('invalid_address');
	return {
		firstName: fld(a.firstName, 64),
		lastName: fld(a.lastName, 64),
		address1: street,
		address2: a.address2 ? fld(a.address2, 100) : '',
		city: q.city,
		provinceCode: q.provinceCode,
		zip: q.postalCode.slice(0, 5) + '-' + q.postalCode.slice(5),
		countryCode: 'BR'
	};
}
const createQuery =
	'mutation NationalDraft($input: DraftOrderInput!) { draftOrderCreate(input: $input) { draftOrder { id invoiceUrl totalPriceSet { shopMoney { amount currencyCode } } subtotalPriceSet { shopMoney { amount currencyCode } } totalShippingPriceSet { shopMoney { amount currencyCode } } shippingAddress { countryCodeV2 provinceCode zip address1 address2 firstName lastName city } lineItems(first:2) { nodes { quantity variant { id } } } } userErrors { field message } } }';
const deleteQuery =
	'mutation NationalDraftDiscard($input: DraftOrderDeleteInput!) { draftOrderDelete(input:$input) { deletedId userErrors {field} } }';
let grant:
	{ domain: string; client: string; secret: string; token: string; renew: number } | undefined;
export async function draftToken(env: PrivateEnv, fetcher: typeof fetch, domain: string) {
	if (env.SHOPIFY_DRAFT_ORDERS_TOKEN) return env.SHOPIFY_DRAFT_ORDERS_TOKEN;
	const client = env.SHOPIFY_DRAFT_CLIENT_ID,
		secret = env.SHOPIFY_DRAFT_CLIENT_SECRET;
	if (!client || !secret || !/^[a-z0-9-]+\.myshopify\.com$/.test(domain))
		return fail('national_checkout_not_configured', 503);
	if (
		grant &&
		grant.domain === domain &&
		grant.client === client &&
		grant.secret === secret &&
		grant.renew > Date.now()
	)
		return grant.token;
	const res = record(
		await provider(fetcher, 'https://' + domain + '/admin/oauth/access_token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
			body: new URLSearchParams({
				grant_type: 'client_credentials',
				client_id: client,
				client_secret: secret
			}).toString()
		})
	);
	const scopes = typeof res.scope === 'string' ? res.scope.split(',').map((x) => x.trim()) : [];
	if (
		!scopes.includes('write_draft_orders') ||
		!scopes.includes('read_products') ||
		scopes.some((s) => !['read_draft_orders', 'write_draft_orders', 'read_products'].includes(s)) ||
		typeof res.access_token !== 'string' ||
		!/^[A-Za-z0-9_-]{16,2048}$/.test(res.access_token) ||
		typeof res.expires_in !== 'number' ||
		!Number.isSafeInteger(res.expires_in) ||
		res.expires_in <= 60
	)
		return fail('national_checkout_not_configured', 503);
	grant = {
		domain,
		client,
		secret,
		token: res.access_token,
		renew: Date.now() + (Math.min(res.expires_in, 86400) - 60) * 1000
	};
	return grant.token;
}
async function admin(env: PrivateEnv, fetcher: typeof fetch, query: string, input: unknown) {
	const domain = env.SHOPIFY_STORE_DOMAIN;
	if (!domain || !/^[a-z0-9-]+\.myshopify\.com$/.test(domain))
		return fail('shop_not_configured', 503);
	const r = record(
		await provider(fetcher, 'https://' + domain + '/admin/api/2026-10/graphql.json', {
			method: 'POST',
			headers: {
				'X-Shopify-Access-Token': await draftToken(env, fetcher, domain),
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ query, variables: { input } })
		})
	);
	if (r.errors) return fail('checkout_unavailable', 503);
	return record(r.data);
}
const expectedMoney = (v: unknown, c: number) => {
	const m = record(record(v).shopMoney);
	return (
		m.currencyCode === 'BRL' &&
		typeof m.amount === 'string' &&
		/^\d+(?:\.\d{1,2})?$/.test(m.amount) &&
		Math.round(Number(m.amount) * 100) === c
	);
};
export async function prepareDraft(
	env: PrivateEnv,
	fetcher: typeof fetch,
	q: SealedQuote,
	a: BuyerAddress
) {
	const title = 'Entrega padrão · até ' + q.days + ' dias úteis';
	const input = {
		presentmentCurrencyCode: 'BRL',
		acceptAutomaticDiscounts: false,
		allowDiscountCodesInCheckout: false,
		lineItems: [{ variantId: q.variantId, quantity: 1 }],
		shippingAddress: a,
		shippingLine: {
			title,
			priceWithCurrency: { amount: (q.shipping / 100).toFixed(2), currencyCode: 'BRL' }
		},
		tags: ['atvna-entrega-nacional', 'atvna-q-' + q.nonce],
		note:
			'Entrega Dimona: ' + q.service + ' / ' + q.serviceId + '; prazo: ' + q.days + ' dias úteis.'
	};
	const data = await admin(env, fetcher, createQuery, input);
	const payload = record(data.draftOrderCreate),
		draft = record(payload.draftOrder),
		id = draft.id;
	if (
		!Array.isArray(payload.userErrors) ||
		payload.userErrors.length ||
		typeof id !== 'string' ||
		!/^gid:\/\/shopify\/DraftOrder\/\d+$/.test(id)
	)
		return fail('checkout_unavailable', 503);
	const addr = record(draft.shippingAddress),
		nodes = record(draft.lineItems).nodes;
	let url: URL | undefined;
	try {
		url = new URL(String(draft.invoiceUrl));
	} catch {}
	const matches =
		addr.countryCodeV2 === 'BR' &&
		addr.provinceCode === a.provinceCode &&
		zip(addr.zip) === q.postalCode &&
		typeof addr.city === 'string' &&
		normal(addr.city) === normal(a.city) &&
		addr.address1 === a.address1 &&
		(addr.address2 ?? '') === a.address2 &&
		addr.firstName === a.firstName &&
		addr.lastName === a.lastName;
	if (
		!matches ||
		!Array.isArray(nodes) ||
		nodes.length !== 1 ||
		record(nodes[0]).quantity !== 1 ||
		record(record(nodes[0]).variant).id !== q.variantId ||
		!expectedMoney(draft.totalPriceSet, q.unit + q.shipping) ||
		!expectedMoney(draft.subtotalPriceSet, q.unit) ||
		!expectedMoney(draft.totalShippingPriceSet, q.shipping) ||
		!url ||
		url.protocol !== 'https:' ||
		url.hostname !== env.SHOPIFY_STORE_DOMAIN ||
		url.port ||
		url.username ||
		url.password ||
		!/^\/\d+\/invoices\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)
	) {
		await admin(env, fetcher, deleteQuery, { id }).catch(() => {});
		return fail('offer_changed', 409);
	}
	return url.href;
}
