import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import { webhookMaintenance } from './production-webhook';
import { productionHandler } from './production-handlers';
import { domain, url } from './shopify-webhook-contract.mjs';

const fields = ['admin_graphql_api_id', 'cancelled_at', 'financial_status', 'test'];
const scopes = ['read_orders', 'read_products', 'write_merchant_managed_fulfillment_orders'];
const webhook = {
	uri: url,
	topic: 'ORDERS_PAID',
	format: 'JSON',
	filter: null,
	includeFields: fields
};
const databases: DatabaseSync[] = [];
afterEach(() => {
	while (databases.length) databases.pop()!.close();
});
function setup() {
	const sqlite = new DatabaseSync(':memory:');
	databases.push(sqlite);
	function statement(sql: string, args: string[] = []) {
		return {
			bind: (...values: string[]) => statement(sql, values),
			run: async () => ({ success: true, meta: sqlite.prepare(sql).run(...args) })
		};
	}
	const db = { prepare: statement } as unknown as D1Database;
	const env = {
		SHOPIFY_STORE_DOMAIN: domain,
		SHOPIFY_FULFILLMENT_CLIENT_SECRET: 'synthetic-probe-key',
		SHOPIFY_FULFILLMENT_CLIENT_ID: crypto.randomUUID(),
		SHOPIFY_FULFILLMENT_ADMIN_TOKEN: 'unused-legacy-token'
	};
	const state = {
		nodes: [] as Record<string, unknown>[],
		hasNextPage: false,
		scopes: [...scopes],
		app: 'ATVNA Produção Dimona',
		shop: domain,
		signed: 204,
		unsigned: 401,
		loseResponse: false
	};
	const calls: string[] = [];
	const fetcher: typeof fetch = async (input, init) => {
		const endpoint = String(input);
		const headers = new Headers(init?.headers);
		if (endpoint === 'https://' + domain + '/admin/oauth/access_token') {
			calls.push('grant');
			expect(new URLSearchParams(String(init?.body)).get('client_secret')).toBe(
				env.SHOPIFY_FULFILLMENT_CLIENT_SECRET
			);
			return Response.json({
				access_token: 'synthetic-ephemeral',
				scope: scopes.join(','),
				expires_in: 3600
			});
		}
		if (endpoint === url) {
			expect(headers.has('Authorization') || headers.has('x-shopify-access-token')).toBe(false);
			expect(init?.redirect).toBe('manual');
			expect(init?.credentials).toBe('omit');
			const body = String(init?.body);
			if (body === '{}') {
				calls.push('unsigned');
				return new Response(null, { status: state.unsigned });
			}
			expect(JSON.parse(body)).toMatchObject({
				test: true,
				admin_graphql_api_id: 'gid://shopify/Order/0'
			});
			expect(headers.get('x-shopify-hmac-sha256')).toBe(
				createHmac('sha256', env.SHOPIFY_FULFILLMENT_CLIENT_SECRET).update(body).digest('base64')
			);
			calls.push('signed');
			return new Response(null, { status: state.signed });
		}
		expect(endpoint).toBe('https://' + domain + '/admin/api/2026-10/graphql.json');
		expect(headers.get('x-shopify-access-token')).toBe('synthetic-ephemeral');
		const req = JSON.parse(String(init?.body));
		if (req.query.startsWith('query ProductionWebhookStatus')) {
			calls.push('read');
			return Response.json({
				data: {
					shop: { myshopifyDomain: state.shop },
					currentAppInstallation: {
						app: { title: state.app },
						accessScopes: state.scopes.map((handle) => ({ handle }))
					},
					webhookSubscriptions: { nodes: state.nodes, pageInfo: { hasNextPage: state.hasNextPage } }
				}
			});
		}
		expect(req.query).toContain('webhookSubscriptionCreate(topic:ORDERS_PAID');
		expect(req.variables).toEqual({
			subscription: { uri: url, format: 'JSON', includeFields: fields }
		});
		calls.push('create');
		state.nodes = [webhook];
		if (state.loseResponse) throw new Error('private transport data');
		return Response.json({
			data: { webhookSubscriptionCreate: { webhookSubscription: webhook, userErrors: [] } }
		});
	};
	return {
		state,
		calls,
		env,
		db,
		fetcher,
		run: (mode: string) => webhookMaintenance(mode, env, db, fetcher)
	};
}
describe('maintenance of the fixed Shopify paid webhook', () => {
	it('checks the real receiver without a public self-fetch or a synthetic production job', async () => {
		const { env, db, fetcher, calls } = setup();
		const receiver: typeof fetch = (input, init) =>
			productionHandler('paid', new Request(input, init), env, db, fetcher);
		const result = await webhookMaintenance('verify-webhook', env, db, fetcher, receiver);
		expect(await result.json()).toEqual({ webhook: 'absent' });
		expect(calls).toEqual(['grant', 'read']);
	});
	it('checks the official shop, permissions and both signatures without mutating or leaking the grant', async () => {
		const { run, calls } = setup();
		const r = await run('verify-webhook');
		expect(r.status).toBe(200);
		expect(await r.json()).toEqual({ webhook: 'absent' });
		expect(calls).toEqual(['grant', 'read', 'unsigned', 'signed']);
	});
	it('registers only the fixed receiver and minimal fields and confirms persistence before acknowledging', async () => {
		const { run, calls } = setup();
		expect(await (await run('register-webhook')).json()).toEqual({ webhook: 'registered' });
		expect(calls).toEqual(['grant', 'read', 'unsigned', 'signed', 'create', 'read']);
		expect(await (await run('register-webhook')).json()).toEqual({ webhook: 'registered' });
		expect(calls.filter((x) => x === 'create')).toHaveLength(1);
	});
	it.each([
		[{ app: 'Different app' }, 'wrong_installation'],
		[{ shop: 'different.myshopify.com' }, 'wrong_installation'],
		[{ scopes: ['read_orders'] }, 'missing_scopes'],
		[{ hasNextPage: true }, 'incomplete_listing'],
		[{ nodes: [{ ...webhook, includeFields: ['test'] }] }, 'conflicting_subscription'],
		[{ nodes: [{ ...webhook, filter: 'test:true' }] }, 'conflicting_subscription'],
		[{ nodes: [{ ...webhook, uri: 'https://example.org' }] }, 'conflicting_subscription'],
		[{ signed: 401 }, 'signed_probe_rejected'],
		[{ unsigned: 200 }, 'receiver_unavailable']
	] as const)('blocks a divergent installation or receiver %j', async (change, code) => {
		const { run, state, calls } = setup();
		Object.assign(state, change);
		const r = await run('register-webhook');
		expect(r.status).toBeGreaterThanOrEqual(400);
		expect(await r.json()).toEqual({ webhook: code });
		expect(calls).not.toContain('create');
	});
	it('holds the lease after a lost write response; reading remains safe and confirms the actual registration', async () => {
		const { run, state, calls } = setup();
		state.loseResponse = true;
		expect(await (await run('register-webhook')).json()).toEqual({
			webhook: 'registration_unconfirmed'
		});
		expect(await (await run('register-webhook')).json()).toEqual({ webhook: 'registration_busy' });
		expect(await (await run('verify-webhook')).json()).toEqual({ webhook: 'registered' });
		expect(calls.filter((x) => x === 'create')).toHaveLength(1);
	});
});
