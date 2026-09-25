import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateDreamRecord, calculateTarot, type CalculationSnapshot } from '@atv/domain';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole } from '../../../../../scripts/helpers/artifact-fixture.mjs';
import { createProductProcessor } from '../../../../worker/src/product-runtime';
import { createProductPublisher } from '../../../../worker/src/product-publication';
import { symbolicProducts, parseSymbolicForm } from '../symbolic-intake';
import { createWorkflowRequest } from '../workflow-request';
import { workflowApi } from './workflow-api';
import { recoverWorkflowRequest } from './workflow-recovery';
import { workflowArtifacts } from './workflow-artifacts';
import { readLibraryResult } from './library-reader';

// Real local SQL/RLS and runtime; synthetic claims and a single PGlite connection.
// These fixtures never issue editorial promotions, receipts, models or READY output.
let db: Awaited<ReturnType<typeof setupProductDatabase>>;
beforeAll(async () => {
	db = await setupProductDatabase({ processing: true });
	for (const migration of [
		'20260915180000_product_artifacts.sql',
		'20260923110000_product_editorial_publication.sql',
		'20260924170000_product_request_recovery.sql',
		'20260925140000_product_request_access.sql'
	])
		await db.exec(await file('supabase/migrations/' + migration));
}, 20000);
afterAll(async () => {
	await db?.close();
});
beforeEach(async () => {
	await db.exec(
		"delete from product_runs; delete from library_items; update workflow_releases set enabled=false,engine_approved=false,access_policy='free'"
	);
});

// SQL and positional arguments are fixed here, not interpolated from HTTP input.
const statements = {
	request_product_run: [
		'select request_product_run($1,$2,$3,$4) as value',
		['p_product_id', 'p_request_key', 'p_input', 'p_parent_id']
	],
	read_product_run: ['select read_product_run($1) as value', ['p_id']],
	recover_product_request: ['select recover_product_request($1) as value', ['p_request_key']],
	read_product_request_access: [
		'select read_product_request_access($1) as value',
		['p_product_id']
	],
	claim_product_run_work: [
		'select claim_product_run_work($1,$2) as value',
		['p_products', 'p_lease_seconds']
	],
	complete_product_run_work: [
		'select complete_product_run_work($1,$2,$3,$4) as value',
		['p_id', 'p_token', 'p_revision', 'p_calculation']
	],
	fail_product_run_work: [
		'select fail_product_run_work($1,$2,$3) as value',
		['p_id', 'p_token', 'p_error_code']
	],
	claim_product_editorial: ['select claim_product_editorial($1) as value', ['p_products']]
} as const;
async function query(
	name: string,
	args: Record<string, unknown>,
	user: string | null = owner,
	role = 'authenticated'
) {
	if (!Object.hasOwn(statements, name)) throw new Error('unexpected_fixture_rpc');
	const [sql, keys] = statements[name as keyof typeof statements];
	return asRole(
		db,
		role,
		user,
		async () =>
			(
				await db.query<{ value: unknown }>(
					sql,
					keys.map((k) => args[k])
				)
			).rows[0].value
	);
}
const workerRpc = vi.fn(
	async (name: string, args: Record<string, unknown>, signal: AbortSignal) => {
		signal.throwIfAborted();
		return query(name, args, null, 'service_role');
	}
);
function sessionClient(user: string) {
	return {
		auth: { getClaims: async () => ({ data: { claims: { sub: user } }, error: null }) },
		rpc(name: string, args: Record<string, unknown>) {
			const execute = async () => {
				try {
					return { data: await query(name, args, user), error: null };
				} catch (error) {
					return {
						data: null,
						error: { message: error instanceof Error ? error.message : 'fixture_error' }
					};
				}
			};
			return {
				then: (resolve: (v: unknown) => unknown) => execute().then(resolve),
				abortSignal: (signal: AbortSignal) => {
					signal.throwIfAborted();
					return execute();
				}
			};
		},
		from(table: string) {
			expect(table).toBe('library_items');
			const filters: Record<string, unknown> = {};
			const builder = {
				select(columns: string) {
					expect(columns).toBe('id,title,universe,item_type,source_id,created_at');
					return builder;
				},
				eq(key: string, value: string) {
					expect(['id', 'user_id']).toContain(key);
					filters[key] = value;
					return builder;
				},
				is(key: string, value: null) {
					expect([key, value]).toEqual(['archived_at', null]);
					return builder;
				},
				async maybeSingle() {
					const rows = await asRole(db, 'authenticated', user, () =>
						db.query<{ item: unknown }>(
							`select row_to_json(l) as item from (select id,title,universe,item_type,source_id,created_at
						from library_items where id=$1 and user_id=$2 and archived_at is null) l`,
							[filters.id, filters.user_id]
						)
					);
					return { data: rows.rows[0]?.item ?? null, error: null };
				}
			};
			return builder;
		}
	} as unknown as SupabaseClient;
}
function event(path: string, body?: unknown, user = owner) {
	const url = new URL(path, 'http://localhost');
	return {
		url,
		request: new Request(url, {
			method: body === undefined ? 'GET' : 'POST',
			headers: { origin: url.origin, 'content-type': 'application/json' },
			...(body === undefined ? {} : { body: JSON.stringify(body) })
		}),
		locals: { supabase: sessionClient(user) }
	} as unknown as RequestEvent;
}
function formInput(productId: string) {
	const form = new FormData();
	form.set('storage', 'on');
	form.set('context', 'Contexto sintético privado.');
	if (productId.startsWith('dream')) {
		form.set('date', '2024-02-29');
		form.set('narrative', 'Relato sintético privado: encontrei uma porta azul.');
		form.set('associations', 'curiosidade\nmemória');
		form.set('emotions', 'calma');
		if (productId === 'dream-journal') form.set('continuity', 'on');
	} else {
		form.set('question1', 'Pergunta sintética privada: o que observar?');
		if (productId === 'three-questions') {
			form.set('question2', 'Que possibilidade considerar?');
			form.set('question3', 'Que atitude experimentar?');
		}
	}
	const parsed = parseSymbolicForm(productId, form);
	expect(parsed.errors).toEqual({});
	if (!parsed.input) throw new Error('invalid_fixture');
	return parsed.input;
}
function browser(productId: string, lostAcknowledgement = false) {
	const values = new Map<string, string>();
	const fetcher = vi.fn<typeof fetch>(async (path, init) => {
		const e = event(String(path), init?.body ? JSON.parse(String(init.body)) : undefined);
		if (e.url.pathname === '/api/workflows') {
			const response = await workflowApi(e, 'create');
			if (lostAcknowledgement && response.status === 202)
				throw new TypeError('lost acknowledgement');
			return response;
		}
		if (e.url.pathname === '/api/workflows/recover') return recoverWorkflowRequest(e);
		return workflowApi(e, 'read', e.url.pathname.split('/').at(-1));
	});
	const options = {
		productId,
		operation: { kind: 'create' as const, ownerId: owner },
		randomUUID,
		fetch: fetcher,
		storage: {
			getItem: (key: string) => values.get(key) ?? null,
			setItem: (key: string, value: string) => {
				values.set(key, value);
			},
			removeItem: (key: string) => {
				values.delete(key);
			}
		}
	};
	return { options, values, fetcher, client: createWorkflowRequest(options) };
}
interface StoredRun {
	id: string;
	input: unknown;
	calculation: CalculationSnapshot;
	state: string;
	revision: number;
	parent_id: string | null;
}
async function stored(id?: string) {
	const result = await db.query<StoredRun>(
		'select id,input,calculation,state,revision,parent_id from product_runs where ($1::uuid is null or id=$1) order by created_at',
		[id ?? null]
	);
	expect(result.rows).toHaveLength(1);
	return result.rows[0];
}
async function counts() {
	return (
		await db.query(
			'select (select count(*) from product_runs) as runs,(select count(*) from product_run_events) as events,(select count(*) from library_items) as items'
		)
	).rows;
}
async function enable(productId: string) {
	// Only the test database owner opens intake/calculation. Editorial/engine gates stay closed.
	await db.query('update workflow_releases set enabled=true where product_id=$1', [productId]);
}
async function process(productId: string) {
	const metrics: unknown[] = [];
	const processor = createProductProcessor(workerRpc, {
		enabledProducts: [productId],
		emit: (e) => metrics.push(e)
	});
	expect(await processor.step()).toBe('calculated');
	expect(await processor.step()).toBe('awaiting_editorial');
	expect(await processor.step()).toBe('idle');
	expect(JSON.stringify(metrics)).not.toMatch(/privad|runId|owner|questions|narrative|token/);
}

it.each(symbolicProducts)(
	'%s: form → controller → SQL → calculation → pending Library without promotion',
	async (productId) => {
		await enable(productId);
		const input = formInput(productId),
			s = browser(productId);
		const result = await s.client.perform(true, input);
		expect(result.href).toMatch(/^\/biblioteca\/[0-9a-f-]{36}$/);
		const run = await stored();
		expect(run.input).toEqual(input);
		expect(run.state).toBe('QUEUED');
		const idleRpc = vi.fn((...args: Parameters<typeof workerRpc>) => workerRpc(...args));
		expect(await createProductProcessor(idleRpc).step()).toBe('idle');
		expect(await createProductPublisher(idleRpc).step()).toBe('idle');
		expect(idleRpc).not.toHaveBeenCalled();
		await process(productId);
		const calculated = await stored(run.id);
		expect(calculated).toMatchObject({ state: 'AWAITING_EDITORIAL', revision: 3, parent_id: null });
		const expected = productId.startsWith('dream')
			? calculateDreamRecord(input)
			: await calculateTarot(input, run.id, new AbortController().signal);
		expect(calculated.calculation).toEqual(expected);
		// Even an explicitly selected publisher cannot invent a missing review receipt.
		expect(await createProductPublisher(workerRpc, { enabledProducts: [productId] }).step()).toBe(
			'idle'
		);
		const itemId = result.href!.split('/').at(-1)!;
		const library = await readLibraryResult(sessionClient(owner), owner, itemId);
		expect(library.state).toBe('workflow');
		if (library.state !== 'workflow') throw new Error('missing_library_result');
		expect(library.run).toMatchObject({
			id: run.id,
			libraryItemId: itemId,
			state: 'AWAITING_EDITORIAL',
			released: false,
			calculation: null,
			editorial: null
		});
		expect(library.run.history.map((e) => [e.revision, e.state])).toEqual([
			[1, 'QUEUED'],
			[2, 'CALCULATED'],
			[3, 'AWAITING_EDITORIAL']
		]);
		expect(JSON.stringify(library)).not.toMatch(/privad|"questions"|narrative|associations/);
		expect(
			(await workflowArtifacts(event(`/api/workflows/${run.id}/artifacts`), run.id)).status
		).toBe(404);
		expect(await counts()).toEqual([{ runs: 1, events: 3, items: 1 }]);
		expect((await db.query('select count(*) as n from editorial_promotions')).rows).toEqual([
			{ n: 0 }
		]);
	}
);

it.each(symbolicProducts)(
	'%s: lost acknowledgement recovers after calculation and revocation without replay',
	async (productId) => {
		await enable(productId);
		const s = browser(productId, true);
		expect((await s.client.perform(true, formInput(productId))).mode).toBe('recover');
		const initial = await stored();
		await process(productId);
		const before = await stored(initial.id),
			totals = await counts();
		await db.exec('update workflow_releases set enabled=false');
		const recovered = await createWorkflowRequest(s.options).perform(false);
		expect(recovered.href).toMatch(/^\/biblioteca\/[0-9a-f-]{36}$/);
		expect(recovered.message).toContain('não significa');
		expect(await stored(initial.id)).toEqual(before);
		expect(await counts()).toEqual(totals);
		expect(s.fetcher.mock.calls.filter(([path]) => path === '/api/workflows')).toHaveLength(1);
		expect([...s.values.values()]).toEqual([expect.stringMatching(/^[0-9a-f-]{36}$/)]);
		expect([...s.values.keys()]).toEqual([`atv-create:${owner}:${productId}`]);
		expect(JSON.stringify([...s.values.values()])).not.toMatch(
			/privad|questions|narrative|consent/
		);
	}
);

it.each(symbolicProducts)(
	'%s: owner isolation covers recovery, run, Library and pending downloads',
	async (productId) => {
		await enable(productId);
		const s = browser(productId);
		const result = await s.client.perform(true, formInput(productId));
		const run = await stored();
		await process(productId);
		const response = await recoverWorkflowRequest(
			event('/api/workflows/recover', { requestKey: [...s.values.values()][0] }, other)
		);
		expect(await response.json()).toEqual({ request: null });
		expect(
			(await workflowApi(event(`/api/workflows/${run.id}`, undefined, other), 'read', run.id))
				.status
		).toBe(404);
		expect(
			await readLibraryResult(sessionClient(other), other, result.href!.split('/').at(-1)!)
		).toEqual({ state: 'not-found' });
		// A caller-supplied owner argument cannot defeat the session role's RLS.
		expect(
			await readLibraryResult(sessionClient(other), owner, result.href!.split('/').at(-1)!)
		).toEqual({ state: 'not-found' });
		expect(
			(
				await workflowArtifacts(
					event(`/api/workflows/${run.id}/artifacts`, undefined, other),
					run.id
				)
			).status
		).toBe(404);
		expect((await stored(run.id)).state).toBe('AWAITING_EDITORIAL');
	}
);

it.each(symbolicProducts)(
	'%s: current SQL release and entitlement policy refuse stale form submission before writing',
	async (productId) => {
		const input = formInput(productId),
			s = browser(productId);
		expect((await s.client.perform(true, input)).mode).toBe('new');
		expect(s.values.size).toBe(0);
		expect(await counts()).toEqual([{ runs: 0, events: 0, items: 0 }]);
		await enable(productId);
		await db.query("update workflow_releases set access_policy='entitlement' where product_id=$1", [
			productId
		]);
		expect(await query('read_product_request_access', { p_product_id: productId })).toEqual({
			state: 'ACCESS_REQUIRED'
		});
		expect((await s.client.perform(true, input)).mode).toBe('new');
		expect(s.values.size).toBe(0);
		expect(await counts()).toEqual([{ runs: 0, events: 0, items: 0 }]);
	}
);

it.each(symbolicProducts)(
	'%s: explicit reprocessing preserves input and Tarot draw; dream facts are recalculated',
	async (productId) => {
		await enable(productId);
		const s = browser(productId);
		await s.client.perform(true, formInput(productId));
		const first = await stored();
		await process(productId);
		const original = await stored(first.id);
		const response = await workflowApi(
			event(`/api/workflows/${first.id}/reprocess`, { requestKey: randomUUID() }),
			'reprocess',
			first.id
		);
		expect(response.status).toBe(202);
		const { runId } = (await response.json()) as { runId: string };
		expect(runId).not.toBe(first.id);
		const next = await stored(runId);
		const dream = productId.startsWith('dream');
		expect(next).toMatchObject({
			parent_id: first.id,
			input: original.input,
			calculation: dream ? null : original.calculation,
			state: dream ? 'QUEUED' : 'CALCULATED'
		});
		if (dream)
			expect(await createProductProcessor(workerRpc, { enabledProducts: [productId] }).step()).toBe(
				'calculated'
			);
		expect(await createProductProcessor(workerRpc, { enabledProducts: [productId] }).step()).toBe(
			'awaiting_editorial'
		);
		expect((await stored(runId)).calculation).toEqual(original.calculation);
		expect(await stored(first.id)).toEqual(original);
		expect(await counts()).toEqual([{ runs: 2, events: dream ? 6 : 5, items: 2 }]);
	}
);
