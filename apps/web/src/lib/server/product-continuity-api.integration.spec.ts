import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { productContinuityApi } from './product-continuity-api';
import { prepareStoredContinuity } from './product-continuity';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole, readyArtifactFixture } from '../../../../../scripts/helpers/artifact-fixture.mjs';

let db: Awaited<ReturnType<typeof setupProductDatabase>>;
let run: Awaited<ReturnType<typeof readyArtifactFixture>>;
beforeAll(async () => {
	db = await setupProductDatabase();
	for (const migration of [
		'20260928130000_product_continuity.sql',
		'20260928133000_product_continuity_selection.sql',
		'20260928140000_product_continuity_profile_guard.sql'
	])
		await db.exec(await file(`supabase/migrations/${migration}`));
}, 20000);
afterAll(async () => {
	await db?.close();
});
beforeEach(async () => {
	await db.exec(
		'delete from product_runs; delete from product_continuity_consents; update product_continuity_policy set enabled=true; update profiles set deleted_at=null; grant execute on function save_product_continuity_item(uuid,uuid,integer,text,jsonb),read_product_continuity_selection(uuid[]) to authenticated'
	);
	run = await readyArtifactFixture(db);
});
type Action = Parameters<typeof productContinuityApi>[1];
const sql: Record<string, { query: string; keys: string[] }> = {
	read_product_continuity: { query: 'select read_product_continuity() as data', keys: [] },
	set_product_continuity_consent: {
		query: 'select set_product_continuity_consent($1,$2,$3) as data',
		keys: ['p_expected_revision', 'p_run_ids', 'p_granted']
	},
	save_product_continuity_item: {
		query: 'select save_product_continuity_item($1,$2,$3,$4,$5) as data',
		keys: ['p_id', 'p_run_id', 'p_expected_revision', 'p_relevance', 'p_selection']
	},
	delete_product_continuity_item: {
		query: 'select delete_product_continuity_item($1) as data',
		keys: ['p_id']
	}
};
async function request(action: Action, body: unknown = {}, user = owner, loseResponse = false) {
	const url = new URL(`http://localhost/api/continuity/${action}`);
	const response = await productContinuityApi(
		{
			url,
			request: new Request(url, {
				method: 'POST',
				headers: { origin: url.origin, 'content-type': 'application/json' },
				body: JSON.stringify(body)
			}),
			locals: {
				supabase: {
					auth: { getClaims: async () => ({ data: { claims: { sub: user } }, error: null }) },
					rpc: (name: string, args: Record<string, unknown>) => ({
						abortSignal: async (signal: AbortSignal) => {
							signal.throwIfAborted();
							const statement = sql[name];
							if (!statement) throw new Error('unexpected_rpc');
							try {
								const data = await asRole(
									db,
									'authenticated',
									user,
									async () =>
										(
											await db.query<{ data: unknown }>(
												statement.query,
												statement.keys.map((k) => args[k])
											)
										).rows[0].data
								);
								if (loseResponse) throw new Error('LOST_AFTER_COMMIT');
								return { data, error: null };
							} catch (error) {
								return {
									data: null,
									error: { message: error instanceof Error ? error.message : 'unknown' }
								};
							}
						}
					})
				}
			}
		} as unknown as RequestEvent,
		action
	);
	return { status: response.status, body: await response.json() };
}
const grant = (revision = 0, granted = true) => ({
	version: 'atv-continuity-consent/1',
	purpose: 'reading-context',
	expectedRevision: revision,
	runIds: granted ? [run.id] : [],
	granted
});
const note = (id = randomUUID()) => ({
	id,
	runId: run.id,
	expectedRevision: 0,
	relevance: 'relevant',
	selection: { kind: 'reported', category: 'theme', text: 'Relato sintético selecionado.' }
});
const prepare = (id: string) =>
	prepareStoredContinuity({
		enabled: true,
		ownerId: owner,
		selectedIds: [id],
		readSelection: async (ids, signal) => {
			signal.throwIfAborted();
			return {
				data: await asRole(
					db,
					'authenticated',
					owner,
					async () =>
						(
							await db.query<{ data: unknown }>(
								'select read_product_continuity_selection($1) as data',
								[ids]
							)
						).rows[0].data
				),
				error: null
			};
		}
	});

it('HTTP → SQL → management → selected context honors edits, revoke and delete', async () => {
	expect((await request('read')).body).toMatchObject({
		consent: { revision: 0, state: 'revoked' }
	});
	expect(await request('consent', grant())).toEqual({ status: 200, body: { revision: 1 } });
	const item = note();
	expect(await request('save', item)).toEqual({ status: 200, body: { revision: 1 } });
	expect((await prepare(item.id)).status).toBe('prepared');
	expect(await request('save', { ...item, expectedRevision: 1, relevance: 'irrelevant' })).toEqual({
		status: 200,
		body: { revision: 2 }
	});
	expect(await prepare(item.id)).toEqual({ status: 'blocked', code: 'item_unavailable' });
	expect((await request('save', { ...item, expectedRevision: 2 })).status).toBe(200);
	expect((await request('consent', grant(1, false))).body).toEqual({ revision: 2 });
	expect(await prepare(item.id)).toEqual({ status: 'blocked', code: 'consent_required' });
	expect((await request('read')).body).toMatchObject({ items: [{ id: item.id }] });
	expect(await request('delete', { id: item.id })).toEqual({
		status: 200,
		body: { deleted: true }
	});
	expect((await request('read')).body).toMatchObject({ items: [] });
	expect((await request('delete', { id: item.id })).body).toEqual({ deleted: false });
});

it('recovers committed notes/consent after lost response, stale CAS cannot duplicate or overwrite', async () => {
	expect((await request('consent', grant(), owner, true)).status).toBe(503);
	expect((await request('read')).body).toMatchObject({ consent: { revision: 1 } });
	expect(await request('consent', grant())).toEqual({
		status: 409,
		body: { error: 'revision_conflict' }
	});
	const item = note();
	expect((await request('save', item, owner, true)).status).toBe(503);
	const recovery = await request('read');
	expect(recovery.body).toMatchObject({ items: [{ id: item.id, revision: 1 }] });
	expect(await request('save', item)).toEqual({
		status: 409,
		body: { error: 'revision_conflict' }
	});
	expect(
		(await request('save', { ...item, expectedRevision: 1, relevance: 'unreviewed' })).body
	).toEqual({ revision: 2 });
	expect(
		(
			await request('save', {
				...item,
				expectedRevision: 1,
				selection: { ...item.selection, text: 'Stale overwrite' }
			})
		).status
	).toBe(409);
	expect((await request('read')).body).toMatchObject({
		items: [{ selection: { text: item.selection.text } }]
	});
});

it('foreign session cannot read, grant, edit or delete owner memory', async () => {
	await request('consent', grant());
	const item = note();
	await request('save', item);
	expect((await request('read', {}, other)).body).toMatchObject({ items: [] });
	expect(await request('consent', grant(), other)).toEqual({
		status: 409,
		body: { error: 'source_unavailable' }
	});
	expect(await request('save', { ...item, expectedRevision: 1 }, other)).toEqual({
		status: 409,
		body: { error: 'consent_required' }
	});
	expect(await request('delete', { id: item.id }, other)).toEqual({
		status: 200,
		body: { deleted: false }
	});
	expect((await request('read')).body).toMatchObject({ items: [{ id: item.id }] });
});

it('disabled feature still permits management/revoke/delete, no new grants or edits', async () => {
	await request('consent', grant());
	const item = note();
	await request('save', item);
	await db.exec('update product_continuity_policy set enabled=false');
	expect((await request('read')).body).toMatchObject({ enabled: false });
	expect(await request('save', { ...item, expectedRevision: 1 })).toEqual({
		status: 409,
		body: { error: 'continuity_disabled' }
	});
	expect((await request('consent', grant(1, false))).status).toBe(200);
	expect(await request('consent', grant(2))).toEqual({
		status: 409,
		body: { error: 'continuity_disabled' }
	});
	expect((await request('delete', { id: item.id })).body).toEqual({ deleted: true });
});

it('soft-deleted owner cannot grant, create or edit; denied writes leave CAS and notes intact', async () => {
	await db.query('update profiles set deleted_at=now() where id=$1', [owner]);
	expect(await request('consent', grant())).toEqual({
		status: 403,
		body: { error: 'profile_unavailable' }
	});
	expect((await request('read')).body).toMatchObject({
		consent: { revision: 0, state: 'revoked' },
		items: []
	});
	await db.query('update profiles set deleted_at=null where id=$1', [owner]);
	await request('consent', grant());
	const item = note();
	await request('save', item);
	await db.query('update profiles set deleted_at=now() where id=$1', [owner]);
	for (const [action, command] of [
		['consent', grant(1)],
		['save', note()],
		[
			'save',
			{
				...item,
				expectedRevision: 1,
				selection: { ...item.selection, text: 'Rejected replacement' }
			}
		]
	] as const)
		expect(await request(action, command)).toEqual({
			status: 403,
			body: { error: 'profile_unavailable' }
		});
	expect((await request('read')).body).toMatchObject({
		consent: { revision: 1, state: 'granted' },
		items: [{ id: item.id, revision: 1, selection: item.selection }]
	});
	expect(await prepare(item.id)).toEqual({ status: 'blocked', code: 'source_unavailable' });
	// The other active profile remains unaffected.
	const foreign = await readyArtifactFixture(db, 'daily-card', other);
	expect((await request('consent', { ...grant(), runIds: [foreign.id] }, other)).status).toBe(200);
});

it('soft-deleted owner can revoke and delete even while disabled; no implicit erasure', async () => {
	await request('consent', grant());
	const item = note();
	await request('save', item);
	await db.query('update profiles set deleted_at=now() where id=$1', [owner]);
	await db.exec('update product_continuity_policy set enabled=false');
	expect(await request('consent', grant(1, false))).toEqual({ status: 200, body: { revision: 2 } });
	expect((await request('read')).body).toMatchObject({
		enabled: false,
		consent: { state: 'revoked', revision: 2 },
		items: [{ id: item.id }]
	});
	expect(await request('delete', { id: item.id })).toEqual({
		status: 200,
		body: { deleted: true }
	});
	expect((await request('read')).body).toMatchObject({ items: [] });
});

it('guard is private and attached to both tables; privileged writes still enforce profile state', async () => {
	for (const role of ['anon', 'authenticated', 'service_role']) {
		const result = await db.query<{ allowed: boolean }>(
			'select has_function_privilege($1,$2,$3) as allowed',
			[role, 'guard_product_continuity_profile()', 'EXECUTE']
		);
		expect(result.rows[0].allowed).toBe(false);
	}
	const triggers = await db.query<{ tgname: string }>(
		"select tgname from pg_trigger where tgname in ('product_continuity_consents_profile_guard','product_continuity_items_profile_guard') and tgenabled='O'"
	);
	expect(triggers.rows).toHaveLength(2);
	await db.query('update profiles set deleted_at=now() where id=$1', [owner]);
	await expect(
		db.query(
			"insert into product_continuity_consents(user_id,state,revision) values ($1,'granted',1)",
			[owner]
		)
	).rejects.toThrow('profile_unavailable');
	await expect(
		db.query(
			"insert into product_continuity_items(id,user_id,run_id,relevance,selection,revision) values ($1,$2,$3,'relevant',$4,1)",
			[randomUUID(), owner, run.id, { kind: 'result' }]
		)
	).rejects.toThrow('profile_unavailable');
	await expect(
		db.query(
			"insert into product_continuity_consents(user_id,state,revision) values ($1,'granted',1)",
			[randomUUID()]
		)
	).rejects.toThrow('profile_unavailable');
});

it('forward-fix fails closed without dropping guards/data and preserves revoke/delete', async () => {
	await request('consent', grant());
	const item = note();
	await request('save', item);
	await db.exec(await file('supabase/forward-fixes/disable_product_continuity_profile_guard.sql'));
	expect((await request('read')).body).toMatchObject({ enabled: false, items: [{ id: item.id }] });
	expect((await request('save', { ...item, expectedRevision: 1 })).status).toBe(503);
	expect((await request('consent', grant(1))).body).toEqual({ error: 'continuity_disabled' });
	expect(await prepare(item.id)).toEqual({
		status: 'blocked',
		code: 'continuity_service_unavailable'
	});
	expect((await request('consent', grant(1, false))).status).toBe(200);
	expect((await request('delete', { id: item.id })).body).toEqual({ deleted: true });
	const triggers = await db.query(
		"select tgname from pg_trigger where tgname like 'product_continuity_%_profile_guard' and tgenabled='O'"
	);
	expect(triggers.rows).toHaveLength(2);
});
