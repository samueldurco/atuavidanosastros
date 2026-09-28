import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
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
let ids: string[];
beforeAll(async () => {
	db = await setupProductDatabase();
	for (const migration of [
		'20260928130000_product_continuity.sql',
		'20260928133000_product_continuity_selection.sql',
		'20260928140000_product_continuity_profile_guard.sql',
		'20260928160000_product_continuity_access.sql'
	])
		await db.exec(await file(`supabase/migrations/${migration}`));
}, 20000);
afterAll(async () => {
	await db?.close();
});
beforeEach(async () => {
	await db.exec(
		'grant execute on function public.read_product_continuity_selection(uuid[]) to authenticated'
	);
	await db.exec(
		'delete from product_runs; delete from product_continuity_consents; update product_continuity_policy set enabled=true,access_retention_days=7; update profiles set deleted_at=null'
	);
	run = await readyArtifactFixture(db);
	await db.query(
		'update product_runs set input=input||\'{"privateSentinel":"RAW_INPUT_NEVER"}\'::jsonb,editorial=jsonb_set(editorial,\'{sections}\',(editorial->\'sections\')||\'[{"title":"Private","text":"UNSELECTED_SECTION_NEVER","evidence":[]}]\') where id=$1',
		[run.id]
	);
	await rpc('select set_product_continuity_consent($1,$2,$3) as data', [0, [run.id], true]);
	ids = [randomUUID(), randomUUID(), randomUUID()];
	for (const [index, selection] of [
		{ kind: 'reported', category: 'theme', text: 'Relato sintético escolhido.' },
		{ kind: 'hypothesis', sectionIndex: 0 },
		{ kind: 'result' }
	].entries())
		await save(ids[index], selection);
});
async function rpc(
	sql: string,
	params: unknown[] = [],
	user: string | null = owner,
	role = 'authenticated'
) {
	return asRole(
		db,
		role,
		user,
		async () => (await db.query<{ data: unknown }>(sql, params)).rows[0].data
	);
}
const save = (
	id: string,
	selection: unknown,
	revision = 0,
	relevance = 'relevant',
	runId = run.id
) =>
	rpc('select save_product_continuity_item($1,$2,$3,$4,$5) as data', [
		id,
		runId,
		revision,
		relevance,
		selection
	]);
const raw = (selected = ids, user = owner) =>
	rpc('select read_product_continuity_selection($1) as data', [selected], user);
const countRows = async (table: 'product_continuity_access' | 'product_continuity_items') =>
	(await db.query<{ n: number }>(`select count(*) as n from ${table}`)).rows[0].n;
function port(user = owner) {
	return vi.fn(async (selected: string[], signal: AbortSignal) => {
		signal.throwIfAborted();
		return { data: await raw(selected, user), error: null };
	});
}
function prepare(selected = ids, user = owner) {
	return prepareStoredContinuity({
		enabled: true,
		ownerId: user,
		selectedIds: selected,
		readSelection: port(user)
	});
}

it('compiles only explicit selections, stable order and limits; private audit is separate', async () => {
	const selected = [ids[1], ids[0]];
	const wire = JSON.stringify(await raw(selected));
	for (const secret of [
		'RAW_INPUT_NEVER',
		'UNSELECTED_SECTION_NEVER',
		'Leitura sintética',
		'promotionId',
		'reviewDigest',
		ids[2]
	])
		expect(wire).not.toContain(secret);
	const result = await prepare(selected);
	expect(result.status).toBe('prepared');
	if (result.status !== 'prepared') throw new Error('expected prepared');
	expect(result.publication).toBe('blocked');
	expect(result.context.items.map((i) => i.origin)).toEqual([
		'prior-interpretation',
		'user-reported'
	]);
	expect(result.context.sources).toHaveLength(1);
	expect(result.context.sources[0].limits).toEqual(['Não é leitura real.', 'Somente QA local.']);
	const payload = JSON.stringify(result.context);
	for (const secret of [owner, run.id, ...ids]) expect(payload).not.toContain(secret);
	expect(result.manifest.map((i) => i.itemId)).toEqual(selected);
	expect('audit' in result && result.audit).toEqual({
		consentRevision: 1,
		itemRevisions: selected.map((itemId) => ({ itemId, revision: 1 }))
	});
});

it('default off never invokes repository; SQL independently refuses off and soft-deleted owner', async () => {
	const readSelection = port();
	expect(
		await prepareStoredContinuity({ ownerId: owner, selectedIds: ids, readSelection })
	).toEqual({ status: 'blocked', code: 'disabled' });
	expect(readSelection).not.toHaveBeenCalled();
	expect(await countRows('product_continuity_access')).toBe(0);
	await db.exec('update product_continuity_policy set enabled=false');
	expect(await prepare()).toEqual({ status: 'blocked', code: 'disabled' });
	await db.exec('update product_continuity_policy set enabled=true');
	await db.query('update profiles set deleted_at=now() where id=$1', [owner]);
	expect(await prepare()).toEqual({ status: 'blocked', code: 'source_unavailable' });
});

it('audit configuration/write failures block preparation without returning text or a partial receipt', async () => {
	await db.exec('update product_continuity_policy set access_retention_days=null');
	expect(await prepare()).toEqual({ status: 'blocked', code: 'continuity_service_unavailable' });
	expect(await countRows('product_continuity_access')).toBe(0);
	await db.exec('update product_continuity_policy set access_retention_days=7');
	await db.exec(
		"create function qa_refuse_access() returns trigger language plpgsql as $$ begin raise exception 'PRIVATE_NOTE_NEVER'; end $$; create trigger qa_refuse_access before insert on product_continuity_access_items for each row execute function qa_refuse_access()"
	);
	try {
		expect(await prepare()).toEqual({ status: 'blocked', code: 'continuity_service_unavailable' });
		expect(await countRows('product_continuity_access')).toBe(0);
	} finally {
		await db.exec(
			'drop trigger qa_refuse_access on product_continuity_access_items; drop function qa_refuse_access()'
		);
	}
	expect((await prepare()).status).toBe('prepared');
	expect(await countRows('product_continuity_access')).toBe(1);
	await rpc('select set_product_continuity_consent($1,$2,$3) as data', [1, [], false]);
	expect(await prepare()).toEqual({ status: 'blocked', code: 'consent_required' });
	expect(await countRows('product_continuity_access')).toBe(1);
	await rpc('select clear_product_continuity_access() as data');
	expect(await countRows('product_continuity_items')).toBe(3);
});

it('rejects invalid, missing, foreign or irrelevant selections atomically, never partial data', async () => {
	for (const selected of [[], [ids[0], ids[0]], Array(13).fill(ids[0]), ['not-a-uuid']])
		expect(await prepare(selected)).toEqual({ status: 'blocked', code: 'invalid_selection' });
	for (const selected of [[], [ids[0], ids[0]], Array(13).fill(ids[0])])
		expect(await raw(selected)).toEqual({ status: 'blocked', code: 'invalid_selection' });
	expect(await prepare([ids[0], randomUUID()])).toEqual({
		status: 'blocked',
		code: 'item_unavailable'
	});
	const theirs = await readyArtifactFixture(db, 'daily-card', other);
	await rpc(
		'select set_product_continuity_consent($1,$2,$3) as data',
		[0, [theirs.id], true],
		other
	);
	expect(await prepare(ids, other)).toEqual({ status: 'blocked', code: 'item_unavailable' });
	await save(
		ids[0],
		{ kind: 'reported', category: 'theme', text: 'Não relevante.' },
		1,
		'irrelevant'
	);
	expect(await prepare()).toEqual({ status: 'blocked', code: 'item_unavailable' });
});

it('fresh reads stop after revoke, scope removal or deletion, not cached prior success', async () => {
	expect((await prepare()).status).toBe('prepared');
	await rpc('select set_product_continuity_consent($1,$2,$3) as data', [1, [], false]);
	expect(await prepare()).toEqual({ status: 'blocked', code: 'consent_required' });
	const another = await readyArtifactFixture(db);
	await rpc('select set_product_continuity_consent($1,$2,$3) as data', [2, [another.id], true]);
	expect(await prepare()).toEqual({ status: 'blocked', code: 'consent_required' });
	await rpc('select set_product_continuity_consent($1,$2,$3) as data', [3, [run.id], true]);
	expect((await prepare()).status).toBe('prepared');
	await rpc('select delete_product_run($1) as data', [run.id]);
	expect(await prepare()).toEqual({ status: 'blocked', code: 'item_unavailable' });
});

it('promotion and product release revocations block before any source content returns', async () => {
	await db.exec("update workflow_releases set enabled=false where product_id='daily-card'");
	expect(await raw()).toEqual({ status: 'blocked', code: 'source_unavailable' });
	await db.exec(
		"update workflow_releases set enabled=true where product_id='daily-card'; update editorial_promotions set revoked_at=now()"
	);
	expect(await raw()).toEqual({ status: 'blocked', code: 'source_unavailable' });
});

it('keeps sparse section indexes without retrieving unrelated paragraphs', async () => {
	await db.query(
		'update product_runs set editorial=jsonb_set(editorial,\'{sections}\',(editorial->\'sections\')||\'[{"title":"Third","text":"Terceiro trecho selecionado.","evidence":[]}]\') where id=$1',
		[run.id]
	);
	await save(ids[1], { kind: 'hypothesis', sectionIndex: 2 }, 1);
	const result = await prepare([ids[1]]);
	expect(result.status).toBe('prepared');
	if (result.status === 'prepared')
		expect(result.context.items[0].text).toBe('Terceiro trecho selecionado.');
	const serialized = JSON.stringify(await raw([ids[1]]));
	expect(serialized).not.toContain('Conteúdo sintético integral.');
	expect(serialized).not.toContain('UNSELECTED_SECTION_NEVER');
});

it('recovers each universe through PostgreSQL and domain with synthetic gates, not homologation', async () => {
	for (const [product, kind] of [
		['birth-chart', 'natal'],
		['date-reading', 'cycles'],
		['pair-preview', 'relationship'],
		['daily-card', 'tarot'],
		['midheaven', 'purpose'],
		['dream-journal', 'dream']
	]) {
		const fixture = await readyArtifactFixture(db);
		await db.query(
			'update workflow_releases set enabled=true,engine_approved=true where product_id=$1',
			[product]
		);
		await db.query(
			"update editorial_promotions set product_id=$1 where id=(select editorial->>'promotionId' from product_runs where id=$2)",
			[product, fixture.id]
		);
		await db.query(
			"update product_runs set product_id=$1,calculation=calculation||jsonb_build_object('kind',$2::text,'status','experimental') where id=$3",
			[product, kind, fixture.id]
		);
		const management = (await rpc('select read_product_continuity() as data')) as {
			consentRevision: number;
		};
		await rpc('select set_product_continuity_consent($1,$2,$3) as data', [
			management.consentRevision,
			[fixture.id],
			true
		]);
		const item = randomUUID();
		await save(
			item,
			kind === 'cycles' ? { kind: 'cycle', factId: 'fact-1' } : { kind: 'result' },
			0,
			'relevant',
			fixture.id
		);
		const result = await prepare([item]);
		expect(result.status, product).toBe('prepared');
		if (result.status === 'prepared') expect(result.context.sources[0].productId).toBe(product);
	}
});

it('rejects malformed transport snapshots and raw errors without forwarding them', async () => {
	const data = await raw();
	const malformed = [
		null,
		{},
		{ ...(data as object), extra: 'SECRET' },
		{ ...(data as object), ownerId: other },
		{ ...(data as object), consentRevision: 0 },
		{ ...(data as object), items: [] },
		{ ...(data as object), itemRevisions: [] }
	];
	for (const value of malformed)
		expect(
			await prepareStoredContinuity({
				enabled: true,
				ownerId: owner,
				selectedIds: ids,
				readSelection: async () => ({ data: value, error: null })
			})
		).toEqual({ status: 'blocked', code: 'continuity_service_unavailable' });
	const readSelection = vi.fn(async () => {
		throw new Error('PRIVATE_RAW_ERROR');
	});
	expect(
		await prepareStoredContinuity({
			enabled: true,
			ownerId: owner,
			selectedIds: ids,
			readSelection
		})
	).toEqual({ status: 'blocked', code: 'continuity_service_unavailable' });
	expect(readSelection).toHaveBeenCalledTimes(1);
});

it('captures caller identity and selection before asynchronous repository access', async () => {
	const input = {
		enabled: true,
		ownerId: owner,
		selectedIds: [...ids],
		readSelection: async (selected: string[]) => {
			input.ownerId = other;
			input.selectedIds.length = 0;
			return { data: await raw(selected), error: null };
		}
	};
	expect((await prepareStoredContinuity(input)).status).toBe('prepared');
});

it('lost response after audit commit is unavailable, never retried; a fresh read sees revocation', async () => {
	const readSelection = vi.fn(async (selected: string[]) => {
		await raw(selected);
		throw new Error('PRIVATE_LOST_RESPONSE_AFTER_COMMIT');
	});
	expect(
		await prepareStoredContinuity({
			enabled: true,
			ownerId: owner,
			selectedIds: ids,
			readSelection
		})
	).toEqual({
		status: 'blocked',
		code: 'continuity_service_unavailable'
	});
	expect(readSelection).toHaveBeenCalledTimes(1);
	expect(await countRows('product_continuity_access')).toBe(1);
	await rpc('select set_product_continuity_consent($1,$2,$3) as data', [1, [], false]);
	expect(await prepare()).toEqual({ status: 'blocked', code: 'consent_required' });
	expect(await countRows('product_continuity_access')).toBe(1);
});

it('RPC denies anon/service/no auth; emergency fix preserves management', async () => {
	for (const role of ['anon', 'service_role'])
		await expect(
			rpc('select read_product_continuity_selection($1) as data', [ids], owner, role)
		).rejects.toThrow(/permission denied/);
	await expect(
		rpc('select read_product_continuity_selection($1) as data', [ids], null)
	).rejects.toThrow(/auth_required/);
	await db.exec(await file('supabase/forward-fixes/disable_product_continuity_selection.sql'));
	expect(await prepare()).toEqual({ status: 'blocked', code: 'continuity_service_unavailable' });
	await expect(
		rpc('select set_product_continuity_consent($1,$2,$3) as data', [1, [], false])
	).resolves.toBe(2);
	await expect(rpc('select delete_product_continuity_item($1) as data', [ids[0]])).resolves.toBe(
		true
	);
	expect(await rpc('select read_product_continuity() as data')).toMatchObject({ enabled: false });
});
