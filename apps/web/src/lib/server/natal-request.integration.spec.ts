import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { parseWorkflowInput } from '@atv/domain';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole } from '../../../../../scripts/helpers/artifact-fixture.mjs';
import { natalProducts, parseNatalRequestInput } from '../natal-request';
import { natalRequestApi } from './natal-request-api';

let db: Awaited<ReturnType<typeof setupProductDatabase>>;
const natal = {
	localDateTime: '1990-06-15T12:30:00.123',
	utcInstant: '1990-06-15T15:30:00.123Z',
	timezone: 'America/Sao_Paulo',
	latitude: -23.55,
	longitude: -46.63,
	locationSource: 'synthetic-fixture/1',
	timePrecision: 'EXACT',
	locationLabel: 'Local sintético',
	countryCode: 'BR'
};
const input = (changes = {}) => ({
	version: 'atv-natal-request/1',
	productId: 'birth-chart',
	expectedRevision: 1,
	consent: {
		storage: true,
		policyVersion: 'atv-input-consent/1',
		partner: false,
		continuity: false
	},
	...changes
});
const request = (changes = {}, requestKey: string = randomUUID()) => ({
	requestKey,
	input: input(changes)
});
async function submit(
	body: ReturnType<typeof request>,
	user: string | null = owner,
	role = 'authenticated'
) {
	return asRole(
		db,
		role,
		user,
		async () =>
			(
				await db.query<{ value: string }>('select request_natal_product_run($1,$2) as value', [
					body.requestKey,
					body.input
				])
			).rows[0].value
	);
}
async function save(expectedRevision = 0, changes = {}, user = owner) {
	return asRole(db, 'authenticated', user, () =>
		db.query('select update_natal_onboarding($1)', [
			{
				version: 'atv-onboarding/1',
				action: 'save-natal',
				expectedRevision,
				natal: { ...natal, ...changes },
				consent: { storage: true, policyVersion: 'atv-natal-storage/1' }
			}
		])
	);
}
async function forget(expectedRevision: number) {
	return asRole(db, 'authenticated', owner, () =>
		db.query('select update_natal_onboarding($1)', [
			{
				version: 'atv-onboarding/1',
				action: 'forget-natal',
				expectedRevision
			}
		])
	);
}
function event(body: unknown, user: string | null = owner, headers = {}) {
	return {
		url: new URL('https://atv.test/api/workflows/natal'),
		request: new Request('https://atv.test/api/workflows/natal', {
			method: 'POST',
			headers: { origin: 'https://atv.test', 'content-type': 'application/json', ...headers },
			body: JSON.stringify(body)
		}),
		locals: {
			supabase: {
				auth: { getClaims: async () => ({ data: { claims: { sub: user } }, error: null }) },
				rpc: async (
					name: string,
					args: { p_request_key: string; p_command: ReturnType<typeof input> }
				) => {
					expect(name).toBe('request_natal_product_run');
					try {
						return {
							data: await submit({ requestKey: args.p_request_key, input: args.p_command }, user),
							error: null
						};
					} catch (error) {
						return { data: null, error: { message: (error as Error).message } };
					}
				}
			}
		}
	} as unknown as Pick<RequestEvent, 'request' | 'url' | 'locals'>;
}
async function counts() {
	const result = await db.query<{
		runs: number;
		receipts: number;
		events: number;
		items: number;
	}>(`select
		(select count(*)::int from product_runs) runs, (select count(*)::int from natal_product_requests) receipts,
		(select count(*)::int from product_run_events) events, (select count(*)::int from library_items) items`);
	return result.rows[0];
}
beforeAll(async () => {
	db = await setupProductDatabase();
	for (const name of [
		'20260923180000_natal_onboarding.sql',
		'20260924170000_product_request_recovery.sql',
		'20260925160000_natal_product_requests.sql'
	])
		await db.exec(await file('supabase/migrations/' + name));
}, 20000);
beforeEach(async () => {
	await db.exec(
		"delete from product_runs; delete from library_items; delete from natal_profiles; delete from natal_storage_consents; update profiles set onboarding_revision=0,onboarding_state='NOT_STARTED',deleted_at=null; update workflow_releases set enabled=false,engine_approved=false,access_policy='free'"
	);
});
afterAll(async () => {
	await db?.close();
});

it.each(natalProducts)(
	'%s persists only the current exact birth snapshot, consent, history and Library atomically',
	async (productId) => {
		await save();
		await db.query('update workflow_releases set enabled=true where product_id=$1', [productId]);
		const response = await natalRequestApi(event(request({ productId })));
		expect(response.status).toBe(202);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('referrer-policy')).toBe('no-referrer');
		const { runId } = (await response.json()) as { runId: string };
		const run = (
			await db.query<{ input: unknown; state: string }>(
				'select input,state from product_runs where id=$1',
				[runId]
			)
		).rows[0];
		const parsed = parseWorkflowInput(run.input);
		expect(parsed?.birth).toEqual({
			localDateTime: natal.localDateTime,
			utcInstant: natal.utcInstant,
			timezone: natal.timezone,
			latitude: natal.latitude,
			longitude: natal.longitude,
			locationSource: natal.locationSource
		});
		expect(parsed?.productId).toBe(productId);
		expect(run.state).toBe('QUEUED');
		expect(await counts()).toEqual({ runs: 1, receipts: 1, events: 1, items: 1 });
		const receipt = (
			await db.query<{ command: unknown; natal_version: number }>(
				'select command,natal_version from natal_product_requests'
			)
		).rows[0];
		expect(receipt).toEqual({ command: input({ productId }), natal_version: 1 });
		expect(JSON.stringify(receipt)).not.toMatch(/1990|latitude|locationLabel/);
		expect((await db.query('select * from editorial_promotions')).rows).toHaveLength(0);
	}
);

it('rejects approximate, missing, forgotten and legacy-unconsented profiles without writes', async () => {
	await save(0, { timePrecision: 'APPROXIMATE' });
	await expect(submit(request())).rejects.toThrow('exact_time_required');
	await save(1);
	await db.exec('delete from natal_storage_consents');
	await expect(submit(request({ expectedRevision: 2 }))).rejects.toThrow('natal_profile_required');
	await forget(2);
	await expect(submit(request({ expectedRevision: 3 }))).rejects.toThrow('natal_profile_required');
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
});

it('refuses stale revisions, then uses the explicitly confirmed new snapshot', async () => {
	await save();
	await save(1, { latitude: 10, locationLabel: 'Outro local sintético' });
	await db.exec("update workflow_releases set enabled=true where product_id='birth-chart'");
	expect((await natalRequestApi(event(request()))).status).toBe(409);
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
	await submit(request({ expectedRevision: 2 }));
	expect(
		(
			await db.query<{ latitude: number }>(
				"select (input#>>'{birth,latitude}')::float8 latitude from product_runs"
			)
		).rows[0].latitude
	).toBe(10);
});

it('retries the exact command idempotently after forgetting profile and revoking release; recovery stays read-only', async () => {
	await save();
	await db.exec("update workflow_releases set enabled=true where product_id='birth-chart'");
	const body = request();
	const runId = await submit(body); // Simulate acknowledgement lost after the transaction committed.
	await forget(1);
	await db.exec('update workflow_releases set enabled=false');
	expect(await submit(body)).toBe(runId);
	const recovered = await asRole(db, 'authenticated', owner, () =>
		db.query<{ value: { runId: string } }>('select recover_product_request($1) value', [
			body.requestKey
		])
	);
	expect(recovered.rows[0].value.runId).toBe(runId);
	await expect(submit({ ...body, input: input({ expectedRevision: 2 }) })).rejects.toThrow(
		'idempotency_conflict'
	);
	await expect(submit({ ...body, input: input({ productId: 'ascendant' }) })).rejects.toThrow(
		'idempotency_conflict'
	);
	expect(await counts()).toEqual({ runs: 1, receipts: 1, events: 1, items: 1 });
});

it('does not bypass release, entitlement or quotas, and rolls back its receipt with a refused request', async () => {
	await save();
	await expect(submit(request())).rejects.toThrow('workflow_unreleased');
	await db.exec(
		"update workflow_releases set enabled=true,access_policy='entitlement' where product_id='birth-chart'"
	);
	await expect(submit(request())).rejects.toThrow('entitlement_required');
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
	await db.exec("update workflow_releases set access_policy='free' where product_id='birth-chart'");
	for (let i = 0; i < 15; i++) await submit(request());
	await expect(submit(request())).rejects.toThrow('request_limit');
	expect(await counts()).toEqual({ runs: 15, receipts: 15, events: 15, items: 15 });
});

it('rejects forged birth/owner/precision, invalid versions, consent and products in both HTTP and SQL', async () => {
	await save();
	const changes = [
		{ ownerId: other },
		{ birth: natal },
		{ timePrecision: 'EXACT' },
		{ productId: 'solar-return' },
		{ version: 'wrong' },
		{ expectedRevision: 0 },
		{ expectedRevision: 1.5 },
		{ expectedRevision: '1' },
		{ expectedRevision: null },
		{ expectedRevision: 2147483647 },
		{ consent: null },
		{ consent: { ...input().consent, storage: false } },
		{ consent: { ...input().consent, continuity: true } }
	];
	for (const change of changes) {
		const body = request(change);
		expect(parseNatalRequestInput(body.input)).toBeNull();
		expect((await natalRequestApi(event(body))).status).toBe(400);
		await expect(submit(body)).rejects.toThrow();
	}
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
});

it('isolates owners, rejects inactive profiles and grants no direct receipt or anonymous/service RPC access', async () => {
	await save();
	await save(0, { latitude: 20 }, other);
	await db.exec("update workflow_releases set enabled=true where product_id='birth-chart'");
	const body = request();
	const first = await submit(body);
	const second = await submit(body, other);
	expect(first).not.toBe(second);
	expect(
		(
			await db.query<{ latitude: number }>(
				"select (input#>>'{birth,latitude}')::float8 latitude from product_runs where id=$1",
				[second]
			)
		).rows[0].latitude
	).toBe(20);
	for (const role of ['anon', 'service_role'])
		await expect(submit(body, owner, role)).rejects.toThrow('permission denied');
	for (const role of ['anon', 'authenticated', 'service_role']) {
		await expect(
			asRole(db, role, owner, () => db.query('select * from natal_product_requests'))
		).rejects.toThrow('permission denied');
		await expect(
			asRole(db, role, owner, () => db.query('delete from natal_product_requests'))
		).rejects.toThrow('permission denied');
	}
	await db.query('update profiles set deleted_at=now() where id=$1', [owner]);
	await expect(submit(body)).rejects.toThrow('profile_unavailable');
	expect((await natalRequestApi(event(body, null))).status).toBe(401);
});

it('rejects unsafe HTTP and oversized/extra fields before persistence', async () => {
	await save();
	const body = request();
	for (const headers of [{ origin: 'https://elsewhere.test' }, { 'sec-fetch-site': 'cross-site' }])
		expect((await natalRequestApi(event(body, owner, headers))).status).toBe(403);
	for (const invalid of [
		{ ...body, ownerId: other },
		{ ...body, requestKey: 'invalid' },
		{ ...body, input: 'x'.repeat(5000) }
	])
		expect((await natalRequestApi(event(invalid))).status).toBe(400);
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
});

it('refuses an existing generic request key instead of falsely claiming profile lineage', async () => {
	await save();
	await db.exec("update workflow_releases set enabled=true where product_id='birth-chart'");
	const body = request();
	const runId = await submit(body);
	await db.query('delete from natal_product_requests where run_id=$1', [runId]);
	await expect(submit(body)).rejects.toThrow('idempotency_conflict');
});

it('deleting a run removes its receipt; forward-fix disables writes but retains recovery and snapshots', async () => {
	await save();
	await db.exec("update workflow_releases set enabled=true where product_id='birth-chart'");
	const body = request();
	const runId = await submit(body);
	const second = await submit(request());
	await db.query('delete from product_runs where id=$1', [second]);
	expect((await counts()).receipts).toBe(1);
	await db.exec(await file('supabase/forward-fixes/disable_natal_product_requests.sql'));
	try {
		await expect(submit(request())).rejects.toThrow('permission denied');
		const recovered = await asRole(db, 'authenticated', owner, () =>
			db.query<{ value: { runId: string } }>('select recover_product_request($1) value', [
				body.requestKey
			])
		);
		expect(recovered.rows[0].value.runId).toBe(runId);
		expect((await counts()).receipts).toBe(1);
	} finally {
		await db.exec(
			'grant execute on function request_natal_product_run(uuid,jsonb) to authenticated'
		);
	}
});
