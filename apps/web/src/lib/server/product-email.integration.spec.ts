import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { parseProductEmailReceipt } from '$lib/product-email';
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

const request = (event: RequestEvent) => requestRoute(event as Parameters<typeof requestRoute>[0]);
const recover = (event: RequestEvent) => recoverRoute(event as Parameters<typeof recoverRoute>[0]);
const cancel = (event: RequestEvent) => cancelRoute(event as Parameters<typeof cancelRoute>[0]);
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
function event(body: unknown, user: string | null = owner, lostAck = false) {
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
					throw new Error('unexpected RPC');
				});
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
