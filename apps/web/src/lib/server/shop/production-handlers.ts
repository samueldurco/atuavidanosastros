import { ensureCheckoutSchema } from './checkout-schema';
import { ShopHttpError, readBody } from './shop-http';
import { type PrivateEnv } from './freight-provider';
import { verifyShopifyPaid } from './shopify-production';
import { verifyDimonaCallback } from './dimona-orders';
import { recordPaid, recordSignal, processOrder, reconcile } from './dimona-queue';
const reply = (status: number) =>
	new Response(null, {
		status,
		headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
	});
async function runnerAuth(request: Request, key: string | undefined) {
	const supplied = request.headers.get('Authorization') ?? '';
	if (!key || key.length < 32 || supplied.length > 256) return false;
	const b = new TextEncoder();
	const [a, c] = await Promise.all(
		[supplied, 'Bearer ' + key].map((x) =>
			crypto.subtle.digest('SHA-256', b.encode(x)).then((ab) => new Uint8Array(ab))
		)
	);
	return a.reduce((v, n, i) => v | (n ^ c[i]), 0) === 0;
}
export async function productionHandler(
	kind: 'paid' | 'dimona' | 'reconcile',
	request: Request,
	env: PrivateEnv,
	db: D1Database | undefined,
	f: typeof fetch,
	ctx?: ExecutionContext
) {
	try {
		if (new URL(request.url).origin !== 'https://atuavidanosastros.com.br') return reply(404);
		if (!db) return reply(503);
		if (kind === 'reconcile') {
			if (!(await runnerAuth(request, env.ATVNA_FACTORY_RUNNER_KEY))) return reply(401);
			await ensureCheckoutSchema(db);
			if (request.method === 'GET') {
				const rows = await db
					.prepare('SELECT stage, COUNT(*) AS count FROM shop_factory_jobs GROUP BY stage')
					.all<{ stage: string; count: number }>();
				return Response.json(
					{
						dispatchEnabled: env.DIMONA_ORDER_DISPATCH === 'manual_pix',
						shopifyCredentialsPresent: Boolean(
							env.SHOPIFY_FULFILLMENT_CLIENT_SECRET &&
							(env.SHOPIFY_FULFILLMENT_CLIENT_ID || env.SHOPIFY_FULFILLMENT_ADMIN_TOKEN)
						),
						factoryCredentialsPresent: Boolean(env.DIMONA_FRETE_TOKEN),
						assetKeyPresent: /^[a-f\d]{64}$/.test(env.DIMONA_ASSET_SIGNING_KEY ?? ''),
						stages: Object.fromEntries(rows.results.map(({ stage, count }) => [stage, count]))
					},
					{ headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } }
				);
			}
			const result = await reconcile(db, env, f);
			if (!result.enabled || !result.scanned) return reply(503);
			return reply(204);
		}
		let id: string;
		if (kind === 'paid') {
			const paid = await verifyShopifyPaid(request, env);
			if (!paid) return reply(204);
			id = paid;
			await ensureCheckoutSchema(db);
			await recordPaid(db, id);
		} else {
			const event = await verifyDimonaCallback(env, await readBody(request));
			await ensureCheckoutSchema(db);
			if (!(await recordSignal(db, event.sellerOrderId, event.factoryOrderId))) return reply(204);
			id = 'gid://shopify/Order/' + event.sellerOrderId;
		}
		// Delivery is acknowledged only after durable storage. Cron claims abandoned leases.
		if (ctx) ctx.waitUntil(processOrder(db, env, f, id));
		else await processOrder(db, env, f, id);
		return reply(204);
	} catch (e) {
		return reply(e instanceof ShopHttpError ? e.status : 503);
	}
}
