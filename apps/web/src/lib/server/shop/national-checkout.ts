import { json } from '@sveltejs/kit';
import { ensureCheckoutSchema } from './checkout-schema';
import { readShopSale } from './seller-identity';
import { readBody, ShopHttpError } from './shop-http';
import {
	checkOffer,
	fail,
	locality,
	normal,
	physicalOffer,
	supplierItem,
	rateFor,
	record,
	zip,
	type PrivateEnv
} from './national-freight';
import {
	addressFor,
	draftToken,
	mac,
	openQuote,
	prepareDraft,
	recoverDraft,
	seal,
	type SealedQuote
} from './national-draft';
const reply = (data: unknown, status = 200) =>
	json(data, {
		status,
		headers: {
			'Cache-Control': 'private, no-store',
			'X-Robots-Tag': 'noindex, nofollow',
			'Referrer-Policy': 'no-referrer'
		}
	});
type Kind = 'quote' | 'checkout';
const ttl = 600;
function ready(env: PrivateEnv, db: D1Database | undefined) {
	if (
		!readShopSale(env) ||
		!db ||
		!(
			env.SHOPIFY_DRAFT_ORDERS_TOKEN ||
			(env.SHOPIFY_DRAFT_CLIENT_ID && env.SHOPIFY_DRAFT_CLIENT_SECRET)
		) ||
		(env.ATVNA_CHECKOUT_SIGNING_KEY?.length ?? 0) < 32
	)
		return fail('national_checkout_not_configured', 503);
	return db;
}
async function limit(db: D1Database, group: string, max: number, period: number, now: number) {
	const key = group + ':' + Math.floor(now / period);
	const allowed = await db
		.prepare(
			'INSERT INTO shop_checkout_limits(bucket,hits,expires) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 WHERE hits < ? RETURNING hits'
		)
		.bind(key, now + period * 2, max)
		.first();
	if (!allowed) fail('too_many_requests', 429);
}
let lastCleanup = -1;
async function prune(db: D1Database, now: number) {
	const hour = Math.floor(now / 3600);
	if (hour === lastCleanup) return;
	await db.batch([
		db.prepare('DELETE FROM shop_checkout_limits WHERE expires<=?').bind(now),
		db.prepare('DELETE FROM shop_checkout_attempts WHERE expires<=?').bind(now)
	]);
	lastCleanup = hour;
}
// A read-only quote can run before D1 is provisioned. Bound upstream requests and
// transient storage per isolate; never use this in-memory limit for draft creation.
let windowId = -1,
	quoteHits = 0;
const quoteIps = new Map<string, number>();
function quoteLimit(ip: string, now: number) {
	const current = Math.floor(now / 300);
	if (current !== windowId) {
		windowId = current;
		quoteHits = 0;
		quoteIps.clear();
	}
	const count = quoteIps.get(ip) ?? 0;
	if (count >= 30 || quoteHits >= 450) fail('too_many_requests', 429);
	quoteIps.set(ip, count + 1);
	quoteHits++;
}
async function saveInvoice(db: D1Database, q: SealedQuote, fingerprint: string, url: string) {
	const saved = await db
		.prepare(
			"UPDATE shop_checkout_attempts SET state='ready',checkout_url=? WHERE nonce=? AND address_hash=? AND (state='pending' OR (state='ready' AND checkout_url=?))"
		)
		.bind(url, q.nonce, fingerprint, url)
		.run();
	if (!saved.meta.changes) return fail('checkout_unavailable', 503);
	return url;
}
async function attempt(
	db: D1Database,
	q: SealedQuote,
	fingerprint: string,
	recover: () => Promise<string>
) {
	const found = await db
		.prepare('SELECT address_hash,state,checkout_url FROM shop_checkout_attempts WHERE nonce=?')
		.bind(q.nonce)
		.first<{ address_hash: string; state: string; checkout_url: string }>();
	if (!found) return;
	if (found.address_hash !== fingerprint) fail('quote_already_used', 409);
	if (found.state === 'ready' && found.checkout_url) return found.checkout_url;
	if (found.state === 'pending') return saveInvoice(db, q, fingerprint, await recover());
	return fail('quote_refresh_required', 409);
}
export async function nationalCheckout(
	kind: Kind,
	request: Request,
	env: PrivateEnv,
	binding: D1Database | undefined,
	fetcher: typeof fetch,
	ip: string,
	now = Math.floor(Date.now() / 1000)
) {
	try {
		const origin = request.headers.get('Origin');
		if (origin !== new URL(request.url).origin) fail('origin_not_allowed', 403);
		if (!ip || !readShopSale(env)) fail('shop_unavailable', 503);
		const input = record(await readBody(request)),
			secret = env.ATVNA_CHECKOUT_SIGNING_KEY;
		if (kind === 'quote') {
			quoteLimit(ip, now);
			if (input.quantity !== 1) fail('single_unit_required');
			const cep = zip(input.postalCode);
			if (!cep) fail('invalid_postal_code');
			const o = physicalOffer(input.variantId);
			const canIssue = async () => {
				try {
					if (binding) await ensureCheckoutSchema(binding);
					const db = ready(env, binding);
					const identity = await mac(secret!, 'rate:' + ip);
					await limit(db, 'quote:' + identity, 30, 300, now);
					await limit(db, 'quote:site', 450, 300, now);
					await prune(db, now);
					await draftToken(env, fetcher, env.SHOPIFY_STORE_DOMAIN ?? '');
					return true;
				} catch (e) {
					if (e instanceof ShopHttpError && e.status === 429) throw e;
					return false;
				}
			};
			const [, destination, rate, checkoutReady] = await Promise.all([
				checkOffer(env, fetcher, o, ip),
				locality(fetcher, cep),
				rateFor(env, fetcher, cep, o),
				canIssue()
			]);
			if (
				rate.destination &&
				(rate.destination.provinceCode !== destination.provinceCode ||
					normal(rate.destination.city) !== normal(destination.city))
			)
				fail('delivery_unavailable');
			const q: SealedQuote = {
				nonce: crypto.randomUUID(),
				expires: now + ttl,
				variantId: o.variantId,
				sku: checkoutReady ? await mac(secret!, 'sku:' + supplierItem(o)) : '',
				postalCode: cep,
				...destination,
				unit: Math.round(o.priceBrl * 100),
				shipping: rate.cents,
				service: rate.name,
				serviceId: rate.id,
				rateBasis: checkoutReady ? await mac(secret!, 'rate-basis:' + rate.basis) : '',
				days: rate.days
			};
			return reply({
				ok: true,
				quote: {
					variantId: q.variantId,
					quantity: 1,
					postalCode: cep,
					...destination,
					unitPriceBrl: q.unit / 100,
					shippingBrl: q.shipping / 100,
					totalBrl: (q.unit + q.shipping) / 100,
					deliveryBusinessDays: q.days,
					service: q.service,
					expiresAt: new Date(q.expires * 1000).toISOString(),
					checkoutReady,
					...(checkoutReady ? { token: await seal(q, secret!) } : {})
				}
			});
		}
		const db = ready(env, binding),
			identity = await mac(secret!, 'rate:' + ip);
		await ensureCheckoutSchema(db);
		await limit(db, 'checkout:' + identity, 12, 300, now);
		await limit(db, 'checkout:site', 90, 300, now);
		await prune(db, now);
		const q = await openQuote(input.token, secret!, now),
			o = physicalOffer(q.variantId),
			address = addressFor(input.address, q);
		const fingerprint = await mac(secret!, 'ship:' + JSON.stringify(address));
		const previous = () =>
			attempt(db, q, fingerprint, () => recoverDraft(env, fetcher, q, address));
		const old = await previous();
		if (old) return reply({ ok: true, checkoutUrl: old });
		const [, rate] = await Promise.all([
			checkOffer(env, fetcher, o, ip),
			rateFor(env, fetcher, q.postalCode, o)
		]);
		if (
			q.unit !== Math.round(o.priceBrl * 100) ||
			q.sku !== (await mac(secret!, 'sku:' + supplierItem(o))) ||
			q.shipping !== rate.cents ||
			q.days !== rate.days ||
			q.serviceId !== rate.id ||
			q.service !== rate.name ||
			q.rateBasis !== (await mac(secret!, 'rate-basis:' + rate.basis))
		)
			fail('quote_changed', 409);
		const reservation = await db
			.prepare(
				"INSERT OR IGNORE INTO shop_checkout_attempts(nonce,address_hash,state,expires) VALUES (?,?,'pending',?)"
			)
			.bind(q.nonce, fingerprint, q.expires + 86400)
			.run();
		if (!reservation.meta.changes) {
			const url = await previous();
			if (url) return reply({ ok: true, checkoutUrl: url });
			return fail('checkout_pending', 409);
		}
		// Once reserved, never repeat a create on a retry, even if Shopify's response was lost.
		let checkoutUrl: string;
		try {
			checkoutUrl = await prepareDraft(env, fetcher, q, address, o.gubo?.sku);
		} catch (e) {
			if (e instanceof ShopHttpError && e.code === 'offer_changed') {
				await db
					.prepare(
						"UPDATE shop_checkout_attempts SET state='failed' WHERE nonce=? AND state='pending'"
					)
					.bind(q.nonce)
					.run();
			}
			throw e;
		}
		await saveInvoice(db, q, fingerprint, checkoutUrl);
		return reply({ ok: true, checkoutUrl });
	} catch (e) {
		const known = e instanceof ShopHttpError;
		return reply(
			{ ok: false, code: known ? e.code : 'national_checkout_unavailable' },
			known ? e.status : 503
		);
	}
}
