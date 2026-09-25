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
import { parsePairRequestInput } from '../pair-request';
import { pairRequestApi } from './pair-request-api';

let db: Awaited<ReturnType<typeof setupProductDatabase>>;
const birth = {
	localDateTime: '1990-06-15T12:30:00.123',
	utcInstant: '1990-06-15T15:30:00.123Z',
	timezone: 'America/Sao_Paulo',
	latitude: -23.55,
	longitude: -46.63,
	locationSource: 'synthetic-fixture/1'
};
const partner = {
	localDateTime: '2000-02-29T10:00:00.125',
	utcInstant: '2000-02-29T10:00:00.125Z',
	timezone: 'UTC',
	latitude: 51.5,
	longitude: -0.12,
	locationSource: 'synthetic-fixture/1',
	timePrecision: 'EXACT'
};
const input = (changes = {}) => ({
	version: 'atv-pair-request/1',
	productId: 'pair-preview',
	expectedRevision: 1,
	partner,
	consent: {
		storage: true,
		policyVersion: 'atv-input-consent/1',
		partner: true,
		continuity: false
	},
	partnerConsent: {
		storage: true,
		policyVersion: 'atv-partner-storage/1',
		permissionDeclared: true,
		sharing: false
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
				await db.query<{ value: string }>('select request_pair_product_run($1,$2) value', [
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
				natal: {
					...birth,
					timePrecision: 'EXACT',
					locationLabel: 'Local sintético',
					countryCode: 'BR',
					...changes
				},
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
function event(body: unknown, user: string | null = owner, headers = {}, mode = 'normal') {
	return {
		url: new URL('https://atv.test/api/workflows/pair'),
		request: new Request('https://atv.test/api/workflows/pair', {
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
					expect(name).toBe('request_pair_product_run');
					if (mode === 'throw') throw new Error('private-db-detail');
					if (mode === 'error') return { data: null, error: { message: 'private-db-detail' } };
					if (mode === 'bad-id') return { data: 'private-db-detail', error: null };
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
	return (
		await db.query<{ runs: number; receipts: number; events: number; items: number }>(`select
	(select count(*)::int from product_runs) runs, (select count(*)::int from pair_product_requests) receipts,
	(select count(*)::int from product_run_events) events, (select count(*)::int from library_items) items`)
	).rows[0];
}
async function enable() {
	await db.exec("update workflow_releases set enabled=true where product_id='pair-preview'");
}
beforeAll(async () => {
	db = await setupProductDatabase();
	for (const name of [
		'20260923180000_natal_onboarding.sql',
		'20260924170000_product_request_recovery.sql',
		'20260925160000_natal_product_requests.sql',
		'20260925190000_date_product_requests.sql',
		'20260925200000_pair_product_requests.sql'
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

it('stores separate six-field births, private declarations and one atomic pending Library request', async () => {
	await save();
	await enable();
	const body = request();
	expect(parsePairRequestInput(body.input)).toEqual(body.input);
	const clone = parsePairRequestInput(body.input)!;
	clone.partner.latitude = 0;
	expect(body.input.partner.latitude).toBe(51.5);
	const response = await pairRequestApi(event(body));
	expect(response.status).toBe(202);
	expect(response.headers.get('cache-control')).toBe('private, no-store');
	expect(response.headers.get('referrer-policy')).toBe('no-referrer');
	expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
	const payload = (await response.json()) as { runId: string };
	expect(Object.keys(payload)).toEqual(['runId']);
	const run = (
		await db.query<{ input: unknown; state: string }>(
			'select input,state from product_runs where id=$1',
			[payload.runId]
		)
	).rows[0];
	const { timePrecision: precision, ...partnerBirth } = partner;
	expect(precision).toBe('EXACT');
	expect(parseWorkflowInput(run.input)).toEqual({
		version: 'atv-workflow/1.0.0',
		productId: 'pair-preview',
		birth,
		partner: partnerBirth,
		consent: body.input.consent
	});
	expect(run.state).toBe('QUEUED');
	expect(
		(
			await db.query<{ command: unknown; natal_version: number }>(
				'select command,natal_version from pair_product_requests'
			)
		).rows[0]
	).toEqual({ command: body.input, natal_version: 1 });
	expect(await counts()).toEqual({ runs: 1, receipts: 1, events: 1, items: 1 });
	expect(
		(await db.query<{ n: number }>('select count(*)::int n from natal_profiles')).rows[0].n
	).toBe(1);
});

it('rejects unknown fields, third-party identity, approximate/unknown times and broadened consent', async () => {
	await save();
	await enable();
	const partnerChanges = [
		{ name: 'Pessoa sintética' },
		{ email: 'synthetic@example.invalid' },
		{ gender: 'x' },
		{ countryCode: 'BR' },
		{ timePrecision: 'APPROXIMATE' },
		{ timePrecision: null },
		{ latitude: 91 },
		{ longitude: -181 },
		{ latitude: '0' },
		{ longitude: null },
		{ locationSource: '' },
		{ locationSource: 'x'.repeat(81) },
		{ locationSource: 'source\nidentity' },
		{ timezone: '' },
		{ timezone: '+03:00' },
		{ localDateTime: '2000-02-29' },
		{ utcInstant: '2000-02-29T10:00:00+00:00' }
	].map((change) => ({ partner: { ...partner, ...change } }));
	for (const change of [
		...partnerChanges,
		{ partner: null },
		{ ownerId: other },
		{ birth },
		{ context: 'Não inferir sentimentos' },
		{ productId: 'synastry' },
		{ version: 'atv-date-request/1' },
		{ expectedRevision: 0 },
		{ expectedRevision: '1' },
		{ expectedRevision: null },
		{ expectedRevision: 1.5 },
		{ expectedRevision: 2147483647 },
		{ consent: { ...input().consent, partner: false } },
		{ consent: { ...input().consent, continuity: true } },
		{ consent: { ...input().consent, storage: false } },
		{ consent: { ...input().consent, extra: true } },
		{ partnerConsent: null },
		{ partnerConsent: { ...input().partnerConsent, permissionDeclared: false } },
		{ partnerConsent: { ...input().partnerConsent, sharing: true } },
		{ partnerConsent: { ...input().partnerConsent, storage: false } },
		{ partnerConsent: { ...input().partnerConsent, policyVersion: 'other' } },
		{ partnerConsent: { ...input().partnerConsent, bilateralVerified: true } }
	]) {
		const body = request(change);
		expect(parsePairRequestInput(body.input)).toBeNull();
		expect((await pairRequestApi(event(body))).status).toBe(400);
		await expect(submit(body)).rejects.toThrow();
	}
	for (const coordinate of [NaN, Infinity, -Infinity])
		expect(
			parsePairRequestInput(input({ partner: { ...partner, latitude: coordinate } }))
		).toBeNull();
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
});

it.each([
	['impossible calendar', '2001-02-29T10:00:00', '2001-02-29T10:00:00Z', 'UTC'],
	['normalized hour', '2000-02-29T24:00:00', '2000-03-01T00:00:00Z', 'UTC'],
	['out of range', '1899-12-31T12:00:00', '1899-12-31T12:00:00Z', 'UTC'],
	['unknown zone', '2000-02-29T10:00:00', '2000-02-29T10:00:00Z', 'Invalid/Zone'],
	['DST gap', '2024-03-10T02:30:00', '2024-03-10T07:30:00Z', 'America/New_York'],
	['mismatched UTC', '2000-02-29T10:00:00.125', '2000-02-29T10:00:00.126Z', 'UTC']
])(
	'SQL independently refuses %s before any write',
	async (_label, localDateTime, utcInstant, timezone) => {
		await save();
		await enable();
		const body = request({ partner: { ...partner, localDateTime, utcInstant, timezone } });
		await expect(submit(body)).rejects.toThrow('invalid_input');
		expect((await pairRequestApi(event(body))).status).toBe(400);
		expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
	}
);

it.each(['2024-11-03T05:30:00Z', '2024-11-03T06:30:00Z'])(
	'accepts explicitly resolved DST overlap %s without guessing',
	async (utcInstant) => {
		await save();
		await enable();
		await submit(
			request({
				partner: {
					...partner,
					localDateTime: '2024-11-03T01:30:00',
					utcInstant,
					timezone: 'America/New_York'
				}
			})
		);
		expect((await counts()).runs).toBe(1);
	}
);

it('requires latest consented EXACT owner profile; copying never overwrites onboarding', async () => {
	await enable();
	await expect(submit(request())).rejects.toThrow('revision_conflict');
	await save(0, { timePrecision: 'APPROXIMATE' });
	await expect(submit(request())).rejects.toThrow('exact_time_required');
	await save(1);
	await expect(submit(request())).rejects.toThrow('revision_conflict');
	await db.exec('delete from natal_storage_consents');
	await expect(submit(request({ expectedRevision: 2 }))).rejects.toThrow('natal_profile_required');
	await forget(2);
	await expect(submit(request({ expectedRevision: 3 }))).rejects.toThrow('natal_profile_required');
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
});

it('retains original partner and owner copies after edits/forget/revocation; read-only recovery works', async () => {
	await save();
	await enable();
	const body = request(),
		runId = await submit(body);
	await save(1, { latitude: 10 });
	await forget(2);
	await db.exec('update workflow_releases set enabled=false');
	expect(await submit(body)).toBe(runId);
	for (const change of [{ expectedRevision: 3 }, { partner: { ...partner, latitude: 10 } }])
		await expect(submit(request(change, body.requestKey))).rejects.toThrow('idempotency_conflict');
	const recovered = await asRole(db, 'authenticated', owner, () =>
		db.query<{ value: { runId: string } }>('select recover_product_request($1) value', [
			body.requestKey
		])
	);
	expect(recovered.rows[0].value.runId).toBe(runId);
	expect(
		(
			await db.query<{ input: { birth: unknown; partner: { latitude: number } } }>(
				'select input from product_runs'
			)
		).rows[0].input
	).toMatchObject({ birth, partner: { latitude: partner.latitude } });
	expect(await counts()).toEqual({ runs: 1, receipts: 1, events: 1, items: 1 });
});

it('enforces release, entitlement and quota atomically', async () => {
	await save();
	expect((await pairRequestApi(event(request()))).status).toBe(409);
	await enable();
	await db.exec(
		"update workflow_releases set access_policy='entitlement' where product_id='pair-preview'"
	);
	expect((await pairRequestApi(event(request()))).status).toBe(403);
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
	await db.exec(
		"update workflow_releases set access_policy='free' where product_id='pair-preview'"
	);
	for (let i = 0; i < 15; i++) await submit(request());
	expect((await pairRequestApi(event(request()))).status).toBe(429);
	expect(await counts()).toEqual({ runs: 15, receipts: 15, events: 15, items: 15 });
});

it('isolates owners, denies all direct receipt access and refuses inactive accounts', async () => {
	await save();
	await save(0, { latitude: 20 }, other);
	await enable();
	const body = request(),
		first = await submit(body),
		second = await submit(body, other);
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
		for (const sql of [
			'select * from pair_product_requests',
			'delete from pair_product_requests',
			'update pair_product_requests set command=null'
		])
			await expect(asRole(db, role, owner, () => db.query(sql))).rejects.toThrow(
				'permission denied'
			);
	}
	await expect(submit(body, null)).rejects.toThrow('auth_required');
	await db.query('update profiles set deleted_at=now() where id=$1', [owner]);
	await expect(submit(body)).rejects.toThrow('profile_unavailable');
	expect((await pairRequestApi(event(body, null))).status).toBe(401);
});

it('refuses date/natal/generic request key collisions', async () => {
	await save();
	await enable();
	await db.exec(
		"update workflow_releases set enabled=true where product_id in ('date-reading','birth-chart')"
	);
	for (const [name, command] of [
		[
			'request_date_product_run',
			{
				version: 'atv-date-request/1',
				productId: 'date-reading',
				expectedRevision: 1,
				targetDate: '2028-02-29',
				consent: { ...input().consent, partner: false }
			}
		],
		[
			'request_natal_product_run',
			{
				version: 'atv-natal-request/1',
				productId: 'birth-chart',
				expectedRevision: 1,
				consent: { ...input().consent, partner: false }
			}
		]
	] as const) {
		const body = request();
		await asRole(db, 'authenticated', owner, () =>
			db.query(`select ${name}($1,$2)`, [body.requestKey, command])
		);
		await expect(submit(body)).rejects.toThrow('idempotency_conflict');
	}
	const generic = request(),
		runId = await submit(generic);
	await db.query('delete from pair_product_requests where run_id=$1', [runId]);
	await expect(submit(generic)).rejects.toThrow('idempotency_conflict');
});

it('rejects cross-origin, malformed and oversized HTTP requests without persistence', async () => {
	await save();
	await enable();
	const body = request();
	for (const headers of [{ origin: 'https://elsewhere.test' }, { 'sec-fetch-site': 'cross-site' }])
		expect((await pairRequestApi(event(body, owner, headers))).status).toBe(403);
	for (const invalid of [
		null,
		[],
		{ ...body, ownerId: other },
		{ ...body, requestKey: 'invalid' },
		{ ...body, input: 'x'.repeat(5000) }
	])
		expect((await pairRequestApi(event(invalid))).status).toBe(400);
	const malformed = event(body);
	malformed.request = new Request(malformed.url, {
		method: 'POST',
		headers: { origin: malformed.url.origin, 'content-type': 'application/json' },
		body: '{'
	});
	expect((await pairRequestApi(malformed)).status).toBe(400);
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
});

it.each(['throw', 'error', 'bad-id'])('redacts backend failure %s', async (mode) => {
	const response = await pairRequestApi(event(request(), owner, {}, mode));
	expect(response.status).toBe(503);
	expect(await response.json()).toEqual({ error: 'workflow_unavailable' });
});

it('deleting a run cascades private declarations', async () => {
	await save();
	await enable();
	const runId = await submit(request());
	await db.query('delete from product_runs where id=$1', [runId]);
	expect((await counts()).receipts).toBe(0);
});

it('forward-fix revokes new bridge calls while preserving run/receipt and read recovery', async () => {
	await save();
	await enable();
	const body = request(),
		runId = await submit(body);
	await db.exec(await file('supabase/forward-fixes/disable_pair_product_requests.sql'));
	try {
		await expect(submit(request())).rejects.toThrow('permission denied');
		expect(await counts()).toEqual({ runs: 1, receipts: 1, events: 1, items: 1 });
		const recovered = await asRole(db, 'authenticated', owner, () =>
			db.query<{ value: { runId: string } }>('select recover_product_request($1) value', [
				body.requestKey
			])
		);
		expect(recovered.rows[0].value.runId).toBe(runId);
	} finally {
		await db.exec(
			'grant execute on function public.request_pair_product_run(uuid,jsonb) to authenticated'
		);
	}
});
