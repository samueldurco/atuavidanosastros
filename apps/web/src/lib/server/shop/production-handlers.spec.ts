import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handle } from '../../../hooks.server';
import { POST as paid } from '../../../routes/api/shop/production/paid/+server';
import { POST as dimona } from '../../../routes/api/shop/production/dimona/+server';
import { GET as readiness, POST as reconcileRoute } from '../../../routes/api/shop/production/reconcile/+server';
import { HEAD as assetHead } from '../../../routes/api/shop/dimona/assets/[file]/+server';
import { ensureCheckoutSchema } from './checkout-schema';
import { dimonaAssetUrls } from './dimona-assets';
import { processOrder, reconcile, recordPaid, recordSignal } from './dimona-queue';
import art from './dimona-art-manifest.json';

const env = vi.hoisted(() => ({
	SHOPIFY_STORE_DOMAIN: 'factory-fixture.myshopify.com',
	SHOPIFY_FULFILLMENT_CLIENT_SECRET: 'test-shopify-signature-key',
	DIMONA_FRETE_TOKEN: 'fixture-only-not-a-real-dimona-key',
	DIMONA_ASSET_SIGNING_KEY: 'ab'.repeat(32),
	ATVNA_FACTORY_RUNNER_KEY: 'cd'.repeat(32)
}));
vi.mock('$env/dynamic/private', () => ({ env }));
vi.mock('$env/dynamic/public', () => ({ env: {} }));
vi.mock('./checkout-database', () => ({
	checkoutDatabase: (platform: App.Platform | undefined) => platform?.env?.ATVNA_CHECKOUT_DB
}));
vi.mock('./checkout-schema', () => ({ ensureCheckoutSchema: vi.fn() }));
vi.mock('./dimona-queue', () => ({
	processOrder: vi.fn(),
	reconcile: vi.fn(),
	recordPaid: vi.fn(),
	recordSignal: vi.fn()
}));
const host = 'https://atuavidanosastros.com.br';
const order = 'gid://shopify/Order/1234';
const prepare = vi.fn();
const db = { prepare } as unknown as D1Database;
const waitUntil = vi.fn();
const fetcher = vi.fn<typeof fetch>();
const routes = {
	paid: (request: Request) => call(request, paid),
	dimona: (request: Request) => call(request, dimona),
	reconcile: (request: Request) => call(request, reconcileRoute)
};
type Route = keyof typeof routes;

function call<E>(request: Request, handler: (event: E) => Response | Promise<Response>) {
	const event = {
		request,
		url: new URL(request.url),
		fetch: fetcher,
		platform: { env: { ATVNA_CHECKOUT_DB: db }, ctx: { waitUntil } },
		cookies: { getAll: () => [] },
		locals: {}
	};
	return handle({
		event,
		resolve: () => handler(event as unknown as E)
	} as unknown as Parameters<typeof handle>[0]);
}
function post(kind: Route, body?: string, headers?: HeadersInit, origin = host) {
	return routes[kind](
		new Request(origin + '/api/shop/production/' + kind, {
			method: 'POST',
			body,
			headers
		})
	);
}
function shopifyHeaders(body: string) {
	return {
		'Content-Type': 'application/json',
		'X-Shopify-Topic': 'orders/paid',
		'X-Shopify-Shop-Domain': env.SHOPIFY_STORE_DOMAIN,
		'X-Shopify-Hmac-Sha256': createHmac('sha256', env.SHOPIFY_FULFILLMENT_CLIENT_SECRET)
			.update(body)
			.digest('base64')
	};
}
const sale = JSON.stringify({ test: false, financial_status: 'paid', admin_graphql_api_id: order });
const runner = {
	'Content-Type': 'application/json',
	Authorization: 'Bearer ' + env.ATVNA_FACTORY_RUNNER_KEY
};
const json = { 'Content-Type': 'application/json' };
const signal = JSON.stringify({
	api_key: env.DIMONA_FRETE_TOKEN,
	dimona_id: 'D-13',
	seller_id: 1234,
	status: 'Entregue'
});

describe('public endpoints used by Shopify, Dimona and the scheduled reconciliation', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(processOrder).mockResolvedValue(undefined);
	});
	it.each(['paid', 'dimona', 'reconcile'] as const)(
		'rejects preview hosts on %s before accessing any data',
		async (kind) => {
			const response = await post(kind, undefined, undefined, 'https://preview.pages.dev');
			expect(response.status).toBe(404);
			expect(ensureCheckoutSchema).not.toHaveBeenCalled();
		}
	);
	it('requires the correct Shopify shop, topic and signature over the actual request body', async () => {
		for (const headers of [
			json,
			shopifyHeaders(sale + ' '),
			{ ...shopifyHeaders(sale), 'X-Shopify-Shop-Domain': 'impostor.myshopify.com' },
			{ ...shopifyHeaders(sale), 'X-Shopify-Topic': 'orders/create' }
		])
			expect((await post('paid', sale, headers)).status).toBe(401);
		expect(recordPaid).not.toHaveBeenCalled();
	});
	it('acknowledges an authenticated paid notification only after the order ID is durable', async () => {
		let arrived!: () => void, commit!: () => void;
		const entering = new Promise<void>((resolve) => {
			arrived = resolve;
		});
		const saved = new Promise<void>((resolve) => {
			commit = resolve;
		});
		vi.mocked(recordPaid).mockImplementation(async () => {
			arrived();
			await saved;
		});
		const responded = vi.fn();
		const response = Promise.resolve(post('paid', sale, shopifyHeaders(sale))).then((r) => {
			responded();
			return r;
		});
		await entering;
		expect(responded).not.toHaveBeenCalled();
		expect(processOrder).not.toHaveBeenCalled();
		expect(waitUntil).not.toHaveBeenCalled();
		commit();
		const r = await response;
		expect(r.status).toBe(204);
		expect(r.headers.get('cache-control')).toBe('no-store');
		expect(recordPaid).toHaveBeenCalledWith(db, order);
		expect(processOrder).toHaveBeenCalledWith(db, env, fetcher, order);
		expect(waitUntil).toHaveBeenCalledOnce();
	});
	it('requests redelivery on persistence failure for either webhook', async () => {
		vi.mocked(recordPaid).mockRejectedValueOnce(new Error('storage'));
		vi.mocked(recordSignal).mockRejectedValueOnce(new Error('storage'));
		expect((await post('paid', sale, shopifyHeaders(sale))).status).toBe(503);
		expect((await post('dimona', signal, json)).status).toBe(503);
		expect(waitUntil).not.toHaveBeenCalled();
	});
	it('ignores unpaid and test notifications even if signed', async () => {
		for (const change of [{ test: true }, { financial_status: 'pending' }]) {
			const body = JSON.stringify({ ...JSON.parse(sale), ...change });
			expect((await post('paid', body, shopifyHeaders(body))).status).toBe(204);
		}
		expect(recordPaid).not.toHaveBeenCalled();
	});
	it('requires the factory key and only wakes an order already recorded locally', async () => {
		expect((await post('dimona', '{}', json)).status).toBe(401);
		expect(recordSignal).not.toHaveBeenCalled();
		vi.mocked(recordSignal).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
		expect((await post('dimona', signal, json)).status).toBe(204);
		expect(waitUntil).not.toHaveBeenCalled();
		expect((await post('dimona', signal, json)).status).toBe(204);
		expect(recordSignal).toHaveBeenCalledWith(db, '1234', 'D-13');
		expect(processOrder).toHaveBeenCalledExactlyOnceWith(db, env, fetcher, order);
	});
	it('uses a non-form Content-Type for the originless scheduled POST, which passes SvelteKit CSRF', async () => {
		const workflow = await readFile(
			new URL('../../../../../../.github/workflows/shop-production.yml', import.meta.url),
			'utf8'
		);
		const curl = workflow.split('\n').find((line) => line.trimStart().startsWith('curl '));
		expect(curl).toContain('--header "Content-Type: application/json"');
		expect(curl).toContain('https://atuavidanosastros.com.br/api/shop/production/reconcile');
	});
	it('accepts a scheduled request without a session and reports failed Shopify scans', async () => {
		expect((await post('reconcile')).status).toBe(401);
		expect(reconcile).not.toHaveBeenCalled();
		vi.mocked(reconcile)
			.mockResolvedValueOnce({ enabled: true, scanned: false, considered: 0 })
			.mockResolvedValueOnce({ enabled: true, scanned: true, considered: 0 });
		expect((await post('reconcile', undefined, runner)).status).toBe(503);
		expect((await post('reconcile', undefined, runner)).status).toBe(204);
	});
	it('only discloses aggregate readiness to the runner without waking jobs or querying providers', async () => {
		const url = host + '/api/shop/production/reconcile';
		for (const headers of [undefined, { Authorization: 'Bearer invalid-runner-key' }]) {
			expect((await call(new Request(url, { headers }), readiness)).status).toBe(401);
		}
		expect(prepare).not.toHaveBeenCalled();
		prepare.mockReturnValueOnce({
			all: async () => ({ results: [{ stage: 'pix_or_production', count: 3 }] })
		});
		const result = await call(new Request(url, { headers: { Authorization: runner.Authorization } }), readiness);
		expect(result.status).toBe(200);
		expect(result.headers.get('cache-control')).toBe('no-store');
		expect(await result.json()).toEqual({
			dispatchEnabled: false, shopifyCredentialsPresent: false, factoryCredentialsPresent: true,
			assetKeyPresent: true, stages: { pix_or_production: 3 }
		});
		expect(reconcile).not.toHaveBeenCalled();
		expect(processOrder).not.toHaveBeenCalled();
		expect(fetcher).not.toHaveBeenCalled();
	});
	it('allows the factory to inspect a signed industrial asset without a user session', async () => {
		const [id] = Object.keys(art.variants);
		const { design } = await dimonaAssetUrls(env, id, order);
		expect(
			(await call(new Request(design.split('?')[0], { method: 'HEAD' }), assetHead)).status
		).toBe(404);
		expect(fetcher).not.toHaveBeenCalled();
		fetcher.mockResolvedValueOnce(new Response(null));
		const r = await call(new Request(design, { method: 'HEAD' }), assetHead);
		expect(r.status).toBe(200);
		expect(r.headers.get('content-type')).toBe('image/png');
		expect(fetcher).toHaveBeenCalledOnce();
	});
});
