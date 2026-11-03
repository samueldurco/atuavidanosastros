import { ShopHttpError } from './shop-http';
import { fail, zip, type PrivateEnv } from './freight-provider';
import { addressFor, mac } from './national-draft';
import { splitFactoryAddress } from './dimona-address';
import { getDimonaVariant, dimonaAssetUrls } from './dimona-assets';
import { createDimonaOrder, readDimonaOrder } from './dimona-orders';
import { readPaidOrder, listPaidOrders, syncShopifyTracking } from './shopify-production';
export const bridge = {
	getDimonaVariant,
	dimonaAssetUrls,
	createDimonaOrder,
	readDimonaOrder,
	readPaidOrder,
	listPaidOrders,
	syncShopifyTracking
};
type Ops = typeof bridge;
type Stage =
	'paid' | 'uncertain' | 'pix_or_production' | 'tracking' | 'done' | 'review' | 'ignored';
type Job = {
	order_id: string;
	stage: Stage;
	factory_id: string | null;
	line_id: string | null;
	tries: number;
};
type Quote = {
	variant: string;
	carrier: string;
	unit_cents: number;
	shipping_cents: number;
	address_hash: string;
	order_id: string | null;
};
const gid = /^gid:\/\/shopify\/Order\/([1-9]\d{0,19})$/;
const clock = () => Math.floor(Date.now() / 1000);
function minor(v: string) {
	return /^\d+(\.\d{1,2})?$/.test(v) ? Math.round(Number(v) * 100) : -1;
}
function paidStatement(db: D1Database, id: string, now: number) {
	if (!gid.test(id)) return fail('invalid_order_id', 400);
	return db
		.prepare(
			"INSERT OR IGNORE INTO shop_factory_jobs(order_id,stage,due,created) VALUES(?,'paid',?,?)"
		)
		.bind(id, now, now);
}
export async function recordPaid(db: D1Database, id: string, now = clock()) {
	await paidStatement(db, id, now).run();
}
export async function recordSignal(db: D1Database, seller: string, factory: string, now = clock()) {
	if (!/^[1-9]\d{0,19}$/.test(seller)) return false;
	// An authenticated callback can prompt a read, never adopt its status or create a job.
	const r = await db
		.prepare(
			"UPDATE shop_factory_jobs SET factory_id=COALESCE(factory_id,?),due=? WHERE order_id=? AND stage IN ('uncertain','pix_or_production','tracking') AND (factory_id IS NULL OR factory_id=?)"
		)
		.bind(factory, now, 'gid://shopify/Order/' + seller, factory)
		.run();
	return Boolean(r.meta.changes);
}
export async function processOrder(
	db: D1Database,
	env: PrivateEnv,
	f: typeof fetch,
	id: string,
	ops: Ops = bridge,
	now = clock()
) {
	if (env.DIMONA_ORDER_DISPATCH !== 'manual_pix') return;
	const lease = crypto.randomUUID(),
		seller = gid.exec(id)?.[1];
	if (!seller) return;
	const j = await db
		.prepare(
			"UPDATE shop_factory_jobs SET lease=?,lease_to=?,tries=tries+1 WHERE order_id=? AND stage IN ('paid','uncertain','pix_or_production','tracking') AND due<=? AND lease_to<=? RETURNING *"
		)
		.bind(lease, now + 600, id, now, now)
		.first<Job>();
	if (!j) return;
	const finish = async (
		stage: Stage,
		delay: number,
		reason: string | null = null,
		shipment: string | null = null
	) => {
		await db
			.prepare(
				'UPDATE shop_factory_jobs SET stage=?,due=?,reason=?,fulfillment_id=COALESCE(?,fulfillment_id),lease=NULL,lease_to=0 WHERE order_id=? AND lease=?'
			)
			.bind(stage, now + delay, reason, shipment, id, lease)
			.run();
	};
	let stage = j.stage;
	try {
		if (stage === 'paid') {
			const order = await ops.readPaidOrder(env, f, id);
			if (!order || !order.tags.includes('atvna-entrega-nacional'))
				return await finish('ignored', 0, 'not_eligible');
			const lines = order.items;
			if (lines.length !== 1 || lines[0].quantity !== 1)
				return await finish('review', 0, 'unexpected_lines');
			const line = lines[0],
				v = ops.getDimonaVariant(line.variantId);
			if (!v) return await finish('ignored', 0, 'outside_manifest');
			const tag = order.tags.filter((t) => /^atvna-q-[0-9a-f-]{36}$/i.test(t));
			if (tag.length !== 1) return await finish('review', 0, 'missing_quote_reference');
			const nonce = tag[0].slice(8);
			const q = await db
				.prepare('SELECT * FROM shop_factory_quotes WHERE nonce=? AND (order_id=? OR expires>=?)')
				.bind(nonce, id, now)
				.first<Quote>();
			if (
				!q ||
				q.variant !== line.variantId ||
				(q.order_id && q.order_id !== id) ||
				minor(order.totalBrl) !== q.unit_cents + q.shipping_cents ||
				minor(order.shippingBrl) !== q.shipping_cents ||
				minor(line.unitBrl) !== q.unit_cents
			)
				return await finish('review', 0, 'quote_mismatch');
			const a = order.address,
				postalCode = zip(a.zip);
			if (!postalCode || a.countryCode !== 'BR')
				return await finish('review', 0, 'address_changed');
			const address = addressFor(
				{ ...a, postalCode },
				{ postalCode, provinceCode: a.provinceCode, city: a.city }
			);
			if (
				!env.ATVNA_CHECKOUT_SIGNING_KEY ||
				(await mac(env.ATVNA_CHECKOUT_SIGNING_KEY, 'ship:' + JSON.stringify(address))) !==
					q.address_hash
			)
				return await finish('review', 0, 'address_changed');
			const parts = splitFactoryAddress(address.address1);
			const links = await ops.dimonaAssetUrls(env, line.variantId, seller);
			const claim = await db
				.prepare(
					'UPDATE shop_factory_quotes SET order_id=? WHERE nonce=? AND (order_id IS NULL OR order_id=?)'
				)
				.bind(id, nonce, id)
				.run();
			if (!claim.meta.changes) return await finish('review', 0, 'quote_reused');
			const start = await db
				.prepare(
					"UPDATE shop_factory_jobs SET stage='uncertain',line_id=? WHERE order_id=? AND lease=? AND stage='paid'"
				)
				.bind(line.lineId, id, lease)
				.run();
			if (!start.meta.changes) return;
			stage = 'uncertain';
			const name = address.firstName + ' ' + address.lastName;
			const result = await ops.createDimonaOrder(env, f, {
				orderId: seller,
				deliveryMethodId: q.carrier,
				customer: { name },
				address: {
					name,
					...parts,
					complement: address.address2,
					city: address.city,
					state: address.provinceCode,
					zipcode: postalCode
				},
				items: [
					{
						sku: 'ATVNA-' + line.variantId.split('/').at(-1),
						name: v.slug,
						quantity: 1,
						dimonaSkuId: v.sku,
						designs: { front: links.design },
						mocks: { front: links.mock }
					}
				],
				webhookUrl: 'https://atuavidanosastros.com.br/api/shop/production/dimona'
			});
			const saved = await db
				.prepare(
					"UPDATE shop_factory_jobs SET factory_id=?,stage='pix_or_production',due=?,reason=NULL,lease=NULL,lease_to=0 WHERE order_id=? AND lease=? AND (factory_id IS NULL OR factory_id=?)"
				)
				.bind(result.factoryOrderId, now + 300, id, lease, result.factoryOrderId)
				.run();
			if (!saved.meta.changes) await finish('review', 0, 'factory_id_mismatch');
			return;
		}
		const status = await ops.readDimonaOrder(env, f, j.factory_id ?? seller, seller);
		if (!status) return await finish(stage, 3600, 'awaiting_factory_confirmation');
		if (!j.factory_id) {
			const saved = await db
				.prepare(
					'UPDATE shop_factory_jobs SET factory_id=? WHERE order_id=? AND lease=? AND (factory_id IS NULL OR factory_id=?)'
				)
				.bind(status.factoryOrderId, id, lease, status.factoryOrderId)
				.run();
			if (!saved.meta.changes) return await finish('review', 0, 'factory_id_mismatch');
		}
		if (!status.shipped || !status.trackingCode) return await finish('pix_or_production', 7200);
		if (!j.line_id) return await finish('review', 0, 'missing_order_line');
		stage = 'tracking';
		const done = await ops.syncShopifyTracking(env, f, {
			orderId: id,
			items: [{ lineId: j.line_id, quantity: 1 }],
			number: status.trackingCode,
			url: status.trackingUrl ?? undefined
		});
		await finish('done', 0, null, done);
	} catch (e) {
		const code = e instanceof ShopHttpError ? e.code : 'upstream_unavailable';
		if (
			[
				'dimona_order_rejected',
				'dimona_invalid_order',
				'invalid_address',
				'address_does_not_match_quote'
			].includes(code)
		)
			return await finish('review', 0, code);
		await finish(
			stage,
			Math.min(7200, 60 * 2 ** Math.min(7, j.tries)),
			stage === 'uncertain' ? 'awaiting_factory_confirmation' : 'retry_upstream'
		);
	}
}
export async function reconcile(
	db: D1Database,
	env: PrivateEnv,
	f: typeof fetch,
	ops = bridge,
	now = clock()
) {
	if (env.DIMONA_ORDER_DISPATCH !== 'manual_pix') return { enabled: false };
	await db
		.prepare(
			'INSERT OR IGNORE INTO shop_factory_cursor(id,since,cursor,started) VALUES(1,?,NULL,?)'
		)
		.bind(now - 86400, now)
		.run();
	const c = await db
		.prepare('SELECT * FROM shop_factory_cursor WHERE id=1')
		.first<{ since: number; cursor: string | null; started: number }>();
	let scanned = false;
	if (c) {
		try {
			const page = await ops.listPaidOrders(
				env,
				f,
				new Date(c.since * 1000).toISOString(),
				c.cursor ?? undefined
			);
			if (page.ids.length) await db.batch(page.ids.map((id) => paidStatement(db, id, now)));
			await db
				.prepare(
					'UPDATE shop_factory_cursor SET since=?,cursor=?,started=? WHERE id=1 AND since=? AND cursor IS ? AND started=?'
				)
				.bind(
					page.endCursor ? c.since : Math.max(c.since, c.started - 900),
					page.endCursor,
					page.endCursor ? c.started : now,
					c.since,
					c.cursor,
					c.started
				)
				.run();
			scanned = true;
		} catch {
			/* Independently retry already recorded events even if Shopify listing is down. */
		}
	}
	const { results } = await db
		.prepare(
			"SELECT order_id FROM shop_factory_jobs WHERE stage IN ('paid','uncertain','pix_or_production','tracking') AND due<=? AND lease_to<=? ORDER BY due LIMIT 3"
		)
		.bind(now, now)
		.all<{ order_id: string }>();
	for (const row of results) await processOrder(db, env, f, row.order_id, ops, now);
	return { enabled: true, scanned, considered: results.length };
}
