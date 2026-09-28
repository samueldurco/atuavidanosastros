import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { parseProductEmailReceipt, parseProductEmailHistory } from '$lib/product-email';
import { createProductEmailRequest } from '$lib/product-email-request';
import { createProductEmailHistory } from '$lib/product-email-history';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole, readyArtifactFixture } from '../../../../../scripts/helpers/artifact-fixture.mjs';
import { POST as requestRoute } from '../../routes/api/product-email/request/+server';
import { POST as recoverRoute } from '../../routes/api/product-email/recover/+server';
import { POST as cancelRoute } from '../../routes/api/product-email/cancel/+server';
import { POST as historyRoute } from '../../routes/api/product-email/history/+server';

const request = (event: RequestEvent) => requestRoute(event as Parameters<typeof requestRoute>[0]);
const recover = (event: RequestEvent) => recoverRoute(event as Parameters<typeof recoverRoute>[0]);
const cancel = (event: RequestEvent) => cancelRoute(event as Parameters<typeof cancelRoute>[0]);
const history = (event: RequestEvent) => historyRoute(event as Parameters<typeof historyRoute>[0]);
async function readReceipt(response: Response) {
	const body = (await response.json()) as { receipt: unknown };
	const receipt = parseProductEmailReceipt(body.receipt);
	if (!receipt) throw new Error('expected valid receipt');
	return receipt;
}

let db: Awaited<ReturnType<typeof setupProductDatabase>>;
let reading: Awaited<ReturnType<typeof readyArtifactFixture>>;
beforeAll(async () => {
	db = await setupProductDatabase();
	await db.exec(await file('supabase/migrations/20260925220000_product_email_requests.sql'));
	await db.exec(await file('supabase/migrations/20260928113000_product_email_history.sql'));
}, 20000);
afterAll(async () => {
	await db?.close();
});
beforeEach(async () => {
	await db.exec(
		'delete from product_runs; delete from library_items; update product_email_policy set enabled=false; update profiles set deleted_at=null'
	);
	reading = await readyArtifactFixture(db);
});
const command = () => ({
	version: 'atv-email-request/1',
	runId: reading.id,
	expectedRevision: reading.revision,
	reviewDigest: reading.reviewDigest,
	consent: {
		transactional: true,
		policyVersion: 'atv-email-delivery/1',
		recipient: 'account-owner'
	}
});
const count = async () =>
	(await db.query<{ count: number }>('select count(*) as count from product_email_requests'))
		.rows[0].count;
function event(
	body: unknown,
	user: string | null = owner,
	lostAck = false,
	afterCommit?: () => Promise<never>
) {
	const rpc = vi.fn((name: string, args: Record<string, unknown>) => ({
		abortSignal: async (signal: AbortSignal) => {
			signal.throwIfAborted();
			try {
				const result = await asRole(db, 'authenticated', user, () => {
					if (name === 'request_product_email')
						return db.query('select request_product_email($1,$2) as data', [
							args.p_request_key,
							args.p_command
						]);
					if (name === 'read_product_email_request')
						return db.query('select read_product_email_request($1) as data', [args.p_request_key]);
					if (name === 'cancel_product_email_request')
						return db.query('select cancel_product_email_request($1) as data', [args.p_id]);
					if (name === 'list_product_email_requests')
						return db.query('select list_product_email_requests($1) as data', [args.p_run_id]);
					throw new Error('unexpected RPC');
				});
				if (afterCommit) return await afterCommit();
				if (lostAck) throw new Error('synthetic lost acknowledgement after SQL commit');
				return { data: (result.rows[0] as { data: unknown }).data, error: null };
			} catch (error) {
				return {
					data: null,
					error: { message: error instanceof Error ? error.message : String(error) }
				};
			}
		}
	}));
	const url = new URL('http://localhost/api/product-email/request');
	return {
		url,
		locals: {
			supabase: {
				auth: { getClaims: async () => ({ data: { claims: { sub: user } }, error: null }) },
				rpc
			}
		},
		request: new Request(url, {
			method: 'POST',
			headers: { origin: url.origin, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as unknown as RequestEvent;
}
it('lost acknowledgement and browser key recover through owner history after revision and gate changes', async () => {
	await db.exec('update product_email_policy set enabled=true');
	expect(
		(await request(event({ requestKey: randomUUID(), command: command() }, owner, true))).status
	).toBe(503);
	await db.exec(
		'update product_email_policy set enabled=false; update workflow_releases set enabled=false; update profiles set deleted_at=now(); update product_runs set revision=5'
	);
	const response = await history(event({ runId: reading.id }));
	expect(response.status).toBe(200);
	const payload = (await response.json()) as { receipts: unknown };
	const receipts = parseProductEmailHistory(payload.receipts, reading.id);
	if (!receipts) throw new Error('expected valid history');
	expect(receipts).toHaveLength(1);
	expect(receipts[0]).toMatchObject({ runId: reading.id, revision: 4, state: 'REQUESTED' });
	expect(parseProductEmailReceipt(receipts[0])).toEqual(receipts[0]);
	for (const [runId, user] of [
		[reading.id, other],
		[randomUUID(), owner]
	])
		expect(await (await history(event({ runId }, user))).json()).toEqual({ receipts: [] });
	const cancelled = await readReceipt(await cancel(event({ receiptId: receipts[0].id })));
	expect(cancelled.state).toBe('CANCELLED');
	expect(await (await history(event({ runId: reading.id }))).json()).toEqual({
		receipts: [cancelled]
	});
	expect(await count()).toBe(1);
	await db.exec('delete from product_runs');
	expect(await (await history(event({ runId: reading.id }))).json()).toEqual({ receipts: [] });
});
it('keyless browser controller reconciles a committed cancellation through real HTTP and SQL', async () => {
	await db.exec('update product_email_policy set enabled=true');
	await request(event({ requestKey: randomUUID(), command: command() }));
	await db.exec(
		'update product_email_policy set enabled=false; update workflow_releases set enabled=false; update profiles set deleted_at=now(); update product_runs set revision=5'
	);
	const fetcher = vi.fn<typeof fetch>(async (path, init) => {
		const body: unknown = JSON.parse(init!.body as string);
		if (path === '/api/product-email/history') return history(event(body));
		if (path === '/api/product-email/cancel') return cancel(event(body, owner, true));
		throw new Error('unexpected mutation');
	});
	const browser = createProductEmailHistory({ ownerId: owner, runId: reading.id, fetch: fetcher });
	expect(browser.inspect().mode).toBe('idle');
	expect(fetcher).not.toHaveBeenCalled();
	const discovered = await browser.list();
	expect(discovered.receipts).toHaveLength(1);
	const receipt = discovered.receipts[0];
	expect(receipt.revision).toBe(4);
	expect((await browser.cancel(receipt.id)).mode).toBe('unavailable');
	await browser.cancel(receipt.id);
	expect(fetcher).toHaveBeenCalledTimes(2);
	expect((await browser.list()).receipts[0].state).toBe('CANCELLED');
	await browser.cancel(receipt.id);
	expect(fetcher).toHaveBeenCalledTimes(3);
	expect(await count()).toBe(1);
	await db.exec('delete from product_runs');
	expect(await browser.list()).toMatchObject({ mode: 'ready', receipts: [] });
});
it('real SQL policy blocks acceptance by default, regardless of valid owner and consent', async () => {
	const response = await request(event({ requestKey: randomUUID(), command: command() }));
	expect(response.status).toBe(409);
	expect(await response.json()).toEqual({ error: 'email_disabled' });
	expect(await count()).toBe(0);
});
it('lost HTTP acknowledgement recovers the committed receipt without renewed consent, dispatch or mutation', async () => {
	await db.exec('update product_email_policy set enabled=true');
	const key = randomUUID();
	const e = event({ requestKey: key, command: command() }, owner, true);
	expect((await request(e)).status).toBe(503);
	expect(await count()).toBe(1);
	expect(e.locals.supabase?.rpc).toHaveBeenCalledTimes(1);
	await db.exec(
		'update product_email_policy set enabled=false; update workflow_releases set enabled=false'
	);
	const recovered = await recover(event({ requestKey: key }));
	expect(recovered.status).toBe(200);
	const receipt = await readReceipt(recovered);
	expect(receipt).toMatchObject({
		runId: reading.id,
		revision: reading.revision,
		reviewDigest: reading.reviewDigest,
		state: 'REQUESTED'
	});
	const retry = await request(event({ requestKey: key, command: command() }));
	expect(retry.status).toBe(202);
	expect(await readReceipt(retry)).toEqual(receipt);
	expect(await count()).toBe(1);
	expect(JSON.stringify(receipt)).not.toMatch(/email|subject|provider|body|consent|SENT|DELIVERED/);
});
it('hard deadline preserves a committed request for read-only recovery after revocation', async () => {
	await db.exec('update product_email_policy set enabled=true');
	const key = randomUUID();
	let committed!: () => void;
	const saved = new Promise<void>((resolve) => {
		committed = resolve;
	});
	const e = event({ requestKey: key, command: command() }, owner, false, () => {
		committed();
		return new Promise<never>(() => {});
	});
	vi.useFakeTimers();
	try {
		const pending = request(e);
		await saved;
		await vi.advanceTimersByTimeAsync(10000);
		const response = await pending;
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ error: 'email_service_unavailable' });
		expect(e.locals.supabase?.rpc).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	} finally {
		vi.useRealTimers();
	}
	expect(await count()).toBe(1);
	await db.exec(
		'update product_email_policy set enabled=false; update workflow_releases set enabled=false; update profiles set deleted_at=now()'
	);
	const recovered = await recover(event({ requestKey: key }));
	expect(recovered.status).toBe(200);
	expect(await readReceipt(recovered)).toMatchObject({ runId: reading.id, state: 'REQUESTED' });
	expect(await count()).toBe(1);
});
it('real SQL isolates owners and cancellation remains final and idempotent after disable', async () => {
	await db.exec('update product_email_policy set enabled=true');
	const key = randomUUID();
	const receipt = await readReceipt(await request(event({ requestKey: key, command: command() })));
	expect(
		(await request(event({ requestKey: randomUUID(), command: command() }, other))).status
	).toBe(409);
	expect(await (await recover(event({ requestKey: key }, other))).json()).toEqual({
		receipt: null
	});
	expect(await (await cancel(event({ receiptId: receipt.id }, other))).json()).toEqual({
		receipt: null
	});
	await db.exec('update product_email_policy set enabled=false');
	const cancelled = await readReceipt(await cancel(event({ receiptId: receipt.id })));
	expect(cancelled.state).toBe('CANCELLED');
	expect(await readReceipt(await cancel(event({ receiptId: receipt.id })))).toEqual(cancelled);
	expect(await readReceipt(await request(event({ requestKey: key, command: command() })))).toEqual(
		cancelled
	);
	await db.exec('update product_email_policy set enabled=true');
	expect(
		await (await request(event({ requestKey: randomUUID(), command: command() }))).json()
	).toEqual({ error: 'email_already_requested' });
	expect(await count()).toBe(1);
});
it('fresh SQL revision, review and Library state prevent stale requests without partial rows', async () => {
	await db.exec('update product_email_policy set enabled=true');
	for (const value of [
		{ ...command(), expectedRevision: 3 },
		{ ...command(), reviewDigest: 'c'.repeat(64) }
	]) {
		expect((await request(event({ requestKey: randomUUID(), command: value }))).status).toBe(409);
	}
	await db.exec('update library_items set archived_at=now()');
	expect((await request(event({ requestKey: randomUUID(), command: command() }))).status).toBe(409);
	expect(await count()).toBe(0);
});
it('account deactivation refuses new/replayed acceptance but preserves owner recovery and cancellation', async () => {
	await db.exec('update product_email_policy set enabled=true');
	const key = randomUUID();
	const receipt = await readReceipt(await request(event({ requestKey: key, command: command() })));
	await db.query('update profiles set deleted_at=now() where id=$1', [owner]);
	expect((await request(event({ requestKey: key, command: command() }))).status).toBe(403);
	expect(await readReceipt(await recover(event({ requestKey: key })))).toEqual(receipt);
	expect((await readReceipt(await cancel(event({ receiptId: receipt.id })))).state).toBe(
		'CANCELLED'
	);
});
it('deleting the owned reading removes its email request and recovery returns null', async () => {
	await db.exec('update product_email_policy set enabled=true');
	const key = randomUUID();
	expect((await request(event({ requestKey: key, command: command() }))).status).toBe(202);
	await asRole(db, 'authenticated', owner, () =>
		db.query('select delete_product_run($1)', [reading.id])
	);
	expect(await count()).toBe(0);
	expect(await (await recover(event({ requestKey: key }))).json()).toEqual({ receipt: null });
});

function browser() {
	const stored = new Map<string, string>();
	const storage = {
		getItem: (name: string) => stored.get(name) ?? null,
		setItem: (name: string, value: string) => {
			stored.set(name, value);
		},
		removeItem: (name: string) => {
			stored.delete(name);
		}
	};
	let user: string | null = owner;
	let lostAction: string | null = null;
	const fetcher = vi.fn<typeof fetch>(async (path, init) => {
		const routes = {
			'/api/product-email/request': request,
			'/api/product-email/recover': recover,
			'/api/product-email/cancel': cancel
		};
		if (typeof path !== 'string' || !Object.hasOwn(routes, path))
			throw new Error('unexpected path');
		const e = event(JSON.parse(String(init?.body)), user);
		e.url = new URL(path, e.url);
		const response = await routes[path as keyof typeof routes](e);
		if (lostAction === path) {
			lostAction = null;
			throw new Error('synthetic response lost after commit');
		}
		return response;
	});
	const options = {
		ownerId: owner,
		runId: reading.id,
		revision: reading.revision,
		reviewDigest: reading.reviewDigest,
		storage,
		fetch: fetcher,
		randomUUID
	};
	return {
		stored,
		fetcher,
		options,
		client: createProductEmailRequest(options),
		lose: (action: string) => {
			lostAction = `/api/product-email/${action}`;
		},
		session: (id: string | null) => {
			user = id;
		}
	};
}
it('browser availability cannot override disabled SQL acceptance or bypass explicit consent', async () => {
	const b = browser();
	expect((await b.client.perform(true, false)).mode).toBe('new');
	expect(b.fetcher).not.toHaveBeenCalled();
	expect((await b.client.perform(true, true)).mode).toBe('new');
	expect(b.stored.size).toBe(0);
	expect(await count()).toBe(0);
});
it('browser remount recovers lost commit and cancels after account and release revocation', async () => {
	await db.exec('update product_email_policy set enabled=true');
	const b = browser();
	b.lose('request');
	expect((await b.client.perform(true, true)).mode).toBe('recover');
	expect(await count()).toBe(1);
	expect([...b.stored.values()]).toHaveLength(1);
	expect([...b.stored.values()][0]).toMatch(/^[a-f0-9-]{36}$/);
	await db.exec(
		'update product_email_policy set enabled=false; update workflow_releases set enabled=false'
	);
	await db.query('update profiles set deleted_at=now() where id=$1', [owner]);
	const restored = createProductEmailRequest({ ...b.options, reviewDigest: null });
	expect((await restored.perform(false, false)).mode).toBe('requested');
	expect((await restored.cancel()).mode).toBe('cancelled');
	expect((await restored.perform(true, true)).mode).toBe('cancelled');
	expect(await count()).toBe(1);
	expect(b.fetcher.mock.calls.map(([path]) => path)).toEqual([
		'/api/product-email/request',
		'/api/product-email/recover',
		'/api/product-email/cancel',
		'/api/product-email/recover'
	]);
});
it('browser recovers an uncertain cancellation without another mutation', async () => {
	await db.exec('update product_email_policy set enabled=true');
	const b = browser();
	expect((await b.client.perform(true, true)).mode).toBe('requested');
	b.lose('cancel');
	expect((await b.client.cancel()).mode).toBe('recover');
	expect((await b.client.cancel()).mode).toBe('recover');
	expect(b.fetcher).toHaveBeenCalledTimes(2);
	expect((await b.client.recover()).mode).toBe('cancelled');
	expect(await count()).toBe(1);
});
it('browser retained key cannot cross sessions and session recovery never submits again', async () => {
	await db.exec('update product_email_policy set enabled=true');
	const b = browser();
	await b.client.perform(true, true);
	b.session(null);
	expect((await b.client.recover()).mode).toBe('recover');
	b.session(other);
	expect((await b.client.recover()).mode).toBe('recover');
	expect((await b.client.cancel()).mode).toBe('recover');
	b.session(owner);
	expect((await b.client.recover()).mode).toBe('requested');
	expect(
		b.fetcher.mock.calls.filter(([path]) => path === '/api/product-email/request')
	).toHaveLength(1);
	expect(
		b.fetcher.mock.calls.filter(([path]) => path === '/api/product-email/cancel')
	).toHaveLength(0);
	expect(await count()).toBe(1);
});
