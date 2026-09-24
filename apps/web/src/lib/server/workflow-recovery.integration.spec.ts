import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole } from '../../../../../scripts/helpers/artifact-fixture.mjs';
import { recoverWorkflowRequest } from './workflow-recovery';
import { workflowApi } from './workflow-api';
import { POST } from '../../routes/api/workflows/recover/+server';

let db: Awaited<ReturnType<typeof setupProductDatabase>>;
const input = {
	version: 'atv-workflow/1.0.0',
	productId: 'daily-card',
	consent: {
		storage: true,
		policyVersion: 'atv-input-consent/1',
		partner: false,
		continuity: false
	},
	questions: ['Pergunta sintética confidencial']
};
beforeAll(async () => {
	db = await setupProductDatabase();
	await db.exec(await file('supabase/migrations/20260924170000_product_request_recovery.sql'));
}, 20000);
afterAll(async () => {
	await db?.close();
});
beforeEach(async () => {
	await db.exec(
		"delete from product_runs; delete from library_items; update profiles set deleted_at=null; update workflow_releases set enabled=false; update workflow_releases set enabled=true,access_policy='free' where product_id='daily-card'"
	);
});

async function rpc(
	name: string,
	args: Record<string, unknown>,
	user: string | null,
	role = 'authenticated'
) {
	return asRole(db, role, user, async () => {
		const result =
			name === 'recover_product_request'
				? await db.query('select recover_product_request($1) as value', [args.p_request_key])
				: name === 'request_product_run'
					? await db.query('select request_product_run($1,$2,$3,$4) as value', [
							args.p_product_id,
							args.p_request_key,
							args.p_input,
							args.p_parent_id
						])
					: (() => {
							throw new Error('unexpected RPC');
						})();
		return (result.rows[0] as { value: unknown }).value;
	});
}
function event(
	body: unknown,
	user: string | null = owner,
	overrides: Record<string, string> = {},
	search = ''
) {
	const call = vi.fn((name: string, args: Record<string, unknown>) => {
		const execute = async () => {
			try {
				return { data: await rpc(name, args, user), error: null };
			} catch (error) {
				return { data: null, error: { message: String(error) } };
			}
		};
		return {
			then: (resolve: (v: unknown) => unknown) => execute().then(resolve),
			abortSignal: vi.fn((signal: AbortSignal) => {
				expect(signal).toBeInstanceOf(AbortSignal);
				return execute();
			})
		};
	});
	const getClaims = vi.fn(async () => ({ data: { claims: { sub: user } }, error: null }));
	const url = new URL('http://localhost/api/workflows/recover' + search);
	return {
		url,
		request: new Request(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json', origin: url.origin, ...overrides },
			body: JSON.stringify(body)
		}),
		locals: { supabase: { auth: { getClaims }, rpc: call } }
	} as unknown as RequestEvent;
}
const read = (key: string, user: string | null = owner) =>
	recoverWorkflowRequest(event({ requestKey: key }, user));
const create = async (key: string, user = owner) => {
	const response = await workflowApi(event({ requestKey: key, input }, user), 'create');
	expect(response.status).toBe(202);
	return ((await response.json()) as { runId: string }).runId;
};

it('recovers a committed request after discarding its HTTP acknowledgement without any write/replay', async () => {
	const key = randomUUID();
	const runId = await create(key);
	const before = await db.query(
		'select (select count(*) from product_runs) as runs,(select count(*) from product_run_events) as events,(select count(*) from library_items) as items'
	);
	const response = await POST(event({ requestKey: key }) as Parameters<typeof POST>[0]);
	expect(response.status).toBe(200);
	const value = await response.json();
	expect(value).toEqual({
		request: { runId, productId: 'daily-card', libraryItemId: expect.any(String) }
	});
	expect(JSON.stringify(value)).not.toMatch(
		/confidencial|questions|consent|calculation|editorial|requestKey|user_id/
	);
	for (const [name, value] of [
		['cache-control', 'private, no-store'],
		['referrer-policy', 'no-referrer'],
		['x-robots-tag', 'noindex, nofollow']
	])
		expect(response.headers.get(name)).toBe(value);
	expect(await (await read(key)).json()).toEqual(value);
	expect(
		await db.query(
			'select (select count(*) from product_runs) as runs,(select count(*) from product_run_events) as events,(select count(*) from library_items) as items'
		)
	).toEqual(before);
});

it('isolates equal keys by owner; missing and other-owner keys are indistinguishable', async () => {
	const key = randomUUID();
	const own = await create(key);
	expect(await (await read(key, other)).json()).toEqual({ request: null });
	expect(await (await read(randomUUID(), other)).json()).toEqual({ request: null });
	const theirs = await create(key, other);
	expect(theirs).not.toBe(own);
	expect(await (await read(key)).json()).toMatchObject({ request: { runId: own } });
	expect(await (await read(key, other)).json()).toMatchObject({ request: { runId: theirs } });
});

it('recovers identifiers after release revocation without claiming output availability', async () => {
	const key = randomUUID();
	const runId = await create(key);
	await db.exec('update workflow_releases set enabled=false');
	const response = await read(key);
	expect(await response.json()).toMatchObject({ request: { runId } });
	expect(
		(await db.query('select state,revision,calculation,editorial from product_runs')).rows
	).toEqual([{ state: 'QUEUED', revision: 1, calculation: null, editorial: null }]);
});

it('does not resurrect archived references, deleted runs or soft-deleted accounts', async () => {
	const key = randomUUID();
	const runId = await create(key);
	await db.exec('update library_items set archived_at=now()');
	expect(await (await read(key)).json()).toEqual({
		request: { runId, productId: 'daily-card', libraryItemId: null }
	});
	await db.query('update profiles set deleted_at=now() where id=$1', [owner]);
	expect(await (await read(key)).json()).toEqual({ request: null });
	await db.query('update profiles set deleted_at=null where id=$1', [owner]);
	await asRole(db, 'authenticated', owner, () =>
		db.query('select delete_product_run($1)', [runId])
	);
	expect(await (await read(key)).json()).toEqual({ request: null });
});

it('SQL rejects anonymous/service execution, absent subjects and null keys; direct raw reads stay revoked', async () => {
	for (const role of ['anon', 'service_role'])
		await expect(
			rpc('recover_product_request', { p_request_key: randomUUID() }, owner, role)
		).rejects.toThrow(/permission denied/);
	await expect(
		rpc('recover_product_request', { p_request_key: randomUUID() }, null)
	).rejects.toThrow(/auth_required/);
	await expect(rpc('recover_product_request', { p_request_key: null }, owner)).rejects.toThrow(
		/invalid_request_key/
	);
	await expect(
		asRole(db, 'authenticated', owner, () => db.query('select * from product_runs'))
	).rejects.toThrow(/permission denied/);
});

it('requires exact same-origin bounded input and authenticated claims before RPC', async () => {
	for (const [body, user, headers, search, status] of [
		[{ requestKey: randomUUID() }, owner, { origin: 'https://untrusted.test' }, '', 403],
		[{ requestKey: randomUUID() }, owner, { 'sec-fetch-site': 'cross-site' }, '', 403],
		[{ requestKey: randomUUID() }, null, {}, '', 401],
		[{ requestKey: randomUUID() }, 'invalid', {}, '', 401],
		[{ requestKey: randomUUID() }, owner, {}, '?owner=forged', 400],
		[{ requestKey: randomUUID(), owner }, owner, {}, '', 400],
		[{ requestKey: 'bad' }, owner, {}, '', 400],
		[{ requestKey: randomUUID(), input }, owner, {}, '', 400],
		[{ requestKey: 'x'.repeat(1100) }, owner, {}, '', 400],
		[{ requestKey: randomUUID() }, owner, { 'content-type': 'text/plain' }, '', 400],
		[null, owner, {}, '', 400]
	] as const) {
		const e = event(body, user, headers, search);
		const response = await recoverWorkflowRequest(e);
		expect(response.status).toBe(status);
		expect(e.locals.supabase!.rpc).not.toHaveBeenCalled();
	}
});

it('never treats missing RPC, malformed projection or backend failure as not found', async () => {
	for (const result of [
		{ data: null, error: { message: 'private backend detail' } },
		{ data: undefined, error: null },
		{ data: {}, error: null },
		{ data: { runId: owner, productId: 'unknown', libraryItemId: null }, error: null },
		{ data: { runId: owner, productId: 'daily-card', libraryItemId: 'bad' }, error: null },
		{ data: { runId: owner, productId: 'daily-card', libraryItemId: null, input }, error: null }
	]) {
		const e = event({ requestKey: randomUUID() });
		e.locals.supabase!.rpc = vi.fn(() => ({ abortSignal: async () => result })) as never;
		const response = await recoverWorkflowRequest(e);
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ error: 'workflow_unavailable' });
	}
	const e = event({ requestKey: randomUUID() });
	e.locals.supabase!.rpc = vi.fn(() => {
		throw new Error('private transport detail');
	});
	expect((await recoverWorkflowRequest(e)).status).toBe(503);
	e.locals.supabase = undefined;
	expect((await recoverWorkflowRequest(e)).status).toBe(503);
});

it('forward-fix disables recovery without deleting history or revoking the existing owner reader', async () => {
	const key = randomUUID();
	const runId = await create(key);
	await db.exec(await file('supabase/forward-fixes/disable_product_request_recovery.sql'));
	try {
		expect((await read(key)).status).toBe(503);
		const result = await asRole(db, 'authenticated', owner, () =>
			db.query('select read_product_run($1) as run', [runId])
		);
		expect((result.rows[0] as { run: { id: string } }).run.id).toBe(runId);
		expect((await db.query('select count(*) as n from product_run_events')).rows).toEqual([
			{ n: 1 }
		]);
	} finally {
		await db.exec(
			'grant execute on function public.recover_product_request(uuid) to authenticated'
		);
	}
});
