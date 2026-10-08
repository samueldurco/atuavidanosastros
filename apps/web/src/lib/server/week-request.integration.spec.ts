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
import {
	parseWeekRequestInput,
	WEEK_THEMES,
	WEEK_PREFERENCES_REQUEST_VERSION
} from '../week-request';
import { weekRequestApi } from './week-request-api';

let db: Awaited<ReturnType<typeof setupProductDatabase>>;
const natal = {
	localDateTime: '1990-06-15T12:30:00.123',
	utcInstant: '1990-06-15T15:30:00.123Z',
	timezone: 'America/Sao_Paulo',
	latitude: -23.55,
	longitude: -46.63,
	locationSource: 'synthetic-fixture/1',
	timePrecision: 'EXACT',
	locationLabel: 'Local sintético privado',
	countryCode: 'BR'
};
const input = (changes = {}) => ({
	version: 'atv-week-reading-request/1',
	productId: 'week-reading',
	expectedRevision: 1,
	targetDate: '2028-02-29',
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
				await db.query<{ value: string }>('select request_week_reading_product_run($1,$2) value', [
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
function event(body: unknown, user: string | null = owner, headers = {}, mode = 'normal') {
	return {
		url: new URL('https://atv.test/api/workflows/week'),
		request: new Request('https://atv.test/api/workflows/week', {
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
					expect(name).toBe('request_week_reading_product_run');
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
	(select count(*)::int from product_runs) runs, (select count(*)::int from week_reading_product_requests) receipts,
	(select count(*)::int from product_run_events) events, (select count(*)::int from library_items) items`)
	).rows[0];
}
async function enable() {
	await db.exec("update workflow_releases set enabled=true where product_id='week-reading'");
}
beforeAll(async () => {
	db = await setupProductDatabase();
	for (const name of [
		'20260923180000_natal_onboarding.sql',
		'20260924170000_product_request_recovery.sql',
		'20260925140000_product_request_access.sql',
		'20260925160000_natal_product_requests.sql',
		'20260929120000_week_reading_product_requests.sql',
		'20260929140000_week_reading_preferences.sql',
		'20261008180000_week_period_closing_bound.sql'
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

it('reports only Week eligibility and keeps creation gated independently', async () => {
	const access = () =>
		asRole(db, 'authenticated', owner, () =>
			db.query<{ value: unknown }>("select read_product_request_access('week-reading') value")
		);
	expect((await access()).rows[0].value).toEqual({ state: 'UNRELEASED' });
	await save();
	await expect(submit(request())).rejects.toThrow('workflow_unreleased');
	await enable();
	expect((await access()).rows[0].value).toEqual({ state: 'AVAILABLE' });
	await db.exec(
		"update workflow_releases set access_policy='entitlement' where product_id='week-reading'"
	);
	expect((await access()).rows[0].value).toEqual({ state: 'ACCESS_REQUIRED' });
	await expect(submit(request())).rejects.toThrow('entitlement_required');
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
});

it.each(['1900-01-01', '2000-02-29', '2028-02-29', '2099-12-24'])(
	'preserves explicit date %s and only the current six-field birth snapshot',
	async (targetDate) => {
		await save();
		await enable();
		const body = request({ targetDate });
		expect(parseWeekRequestInput(body.input)).toEqual(body.input);
		const response = await weekRequestApi(event(body));
		expect(response.status).toBe(202);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('referrer-policy')).toBe('no-referrer');
		expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
		const { runId } = (await response.json()) as { runId: string };
		const run = (
			await db.query<{ input: unknown; state: string }>(
				'select input,state from product_runs where id=$1',
				[runId]
			)
		).rows[0];
		const parsed = parseWorkflowInput(run.input);
		expect(parsed).toEqual({
			version: 'atv-workflow/1.0.0',
			productId: 'week-reading',
			targetDate,
			consent: body.input.consent,
			birth: {
				localDateTime: natal.localDateTime,
				utcInstant: natal.utcInstant,
				timezone: natal.timezone,
				latitude: natal.latitude,
				longitude: natal.longitude,
				locationSource: natal.locationSource
			}
		});
		expect(run.state).toBe('QUEUED');
		expect(await counts()).toEqual({ runs: 1, receipts: 1, events: 1, items: 1 });
		const receipt = (
			await db.query('select command,natal_version from week_reading_product_requests')
		).rows[0];
		expect(receipt).toEqual({ command: body.input, natal_version: 1 });
		expect(JSON.stringify(receipt)).not.toMatch(/1990|latitude|locationLabel/);
		expect((await db.query('select * from editorial_promotions')).rows).toHaveLength(0);
	}
);

it('rejects impossible, normalized, absent or out-of-range dates in HTTP and direct SQL', async () => {
	await save();
	await enable();
	for (const targetDate of [
		null,
		undefined,
		20260925,
		'',
		'2026-02-29',
		'1900-02-29',
		'2026-04-31',
		'2026-00-01',
		'2026-13-01',
		'2026-01-00',
		'0000-01-01',
		'1899-12-31',
		'2100-01-01',
		'2099-12-25',
		'2099-12-26',
		'2099-12-31',
		'2026-9-25',
		' 2026-09-25',
		'2026-09-25T12:00:00Z',
		'infinity'
	]) {
		const body = request({ targetDate });
		expect(parseWeekRequestInput(body.input)).toBeNull();
		expect((await weekRequestApi(event(body))).status).toBe(400);
		await expect(submit(body)).rejects.toThrow('invalid_input');
	}
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
});

it('refuses extra birth/owner/context/timezone or broader cycle products and consent changes', async () => {
	await save();
	await enable();
	for (const change of [
		{ ownerId: other },
		{ birth: natal },
		{ timePrecision: 'EXACT' },
		{ timezone: 'UTC' },
		{ productId: 'solar-return' },
		{ productId: 'weekly-sky' },
		{ returnYear: 2026 },
		{ version: 'atv-natal-request/1' },
		{ expectedRevision: 0 },
		{ expectedRevision: -1 },
		{ expectedRevision: 1.5 },
		{ expectedRevision: '1' },
		{ expectedRevision: null },
		{ expectedRevision: 2147483647 },
		{ consent: null },
		{ consent: { ...input().consent, storage: false } },
		{ consent: { ...input().consent, partner: true } },
		{ consent: { ...input().consent, continuity: true } },
		{ consent: { ...input().consent, unknown: false } }
	]) {
		const body = request(change);
		expect(parseWeekRequestInput(body.input)).toBeNull();
		expect((await weekRequestApi(event(body))).status).toBe(400);
		await expect(submit(body)).rejects.toThrow();
	}
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
});

it('requires the latest consented EXACT profile, including after precision or revision changes', async () => {
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
	await save(3, { latitude: 10 });
	await submit(request({ expectedRevision: 4 }));
	expect(
		(
			await db.query<{ latitude: number }>(
				"select (input#>>'{birth,latitude}')::float8 latitude from product_runs"
			)
		).rows[0].latitude
	).toBe(10);
});

it('same owner/key/command returns original date and profile after edits, forget and revocation', async () => {
	await save();
	await enable();
	const body = request(),
		runId = await submit(body);
	await save(1, { latitude: 10 });
	await forget(2);
	await db.exec('update workflow_releases set enabled=false');
	expect(await submit(body)).toBe(runId);
	for (const change of [{ expectedRevision: 3 }, { targetDate: '2028-03-01' }])
		await expect(submit(request(change, body.requestKey))).rejects.toThrow('idempotency_conflict');
	const recovered = await asRole(db, 'authenticated', owner, () =>
		db.query<{ value: { runId: string } }>('select recover_product_request($1) value', [
			body.requestKey
		])
	);
	expect(recovered.rows[0].value.runId).toBe(runId);
	const run = (
		await db.query<{ target: string; latitude: number }>(
			"select input->>'targetDate' target,(input#>>'{birth,latitude}')::float8 latitude from product_runs"
		)
	).rows[0];
	expect(run).toEqual({ target: body.input.targetDate, latitude: natal.latitude });
	expect(await counts()).toEqual({ runs: 1, receipts: 1, events: 1, items: 1 });
});

it('enforces release, entitlement and quota with atomic receipts', async () => {
	await save();
	await expect(submit(request())).rejects.toThrow('workflow_unreleased');
	await enable();
	await db.exec(
		"update workflow_releases set access_policy='entitlement' where product_id='week-reading'"
	);
	await expect(submit(request())).rejects.toThrow('entitlement_required');
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
	await db.exec(
		"update workflow_releases set access_policy='free' where product_id='week-reading'"
	);
	for (let i = 0; i < 15; i++) await submit(request());
	await expect(submit(request())).rejects.toThrow('request_limit');
	expect(await counts()).toEqual({ runs: 15, receipts: 15, events: 15, items: 15 });
});

it('isolates account snapshots, refuses inactive accounts and denies direct receipt/service access', async () => {
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
		await expect(
			asRole(db, role, owner, () => db.query('select * from week_reading_product_requests'))
		).rejects.toThrow('permission denied');
		await expect(
			asRole(db, role, owner, () => db.query('delete from week_reading_product_requests'))
		).rejects.toThrow('permission denied');
	}
	await db.query('update profiles set deleted_at=now() where id=$1', [owner]);
	await expect(submit(body)).rejects.toThrow('profile_unavailable');
	expect((await weekRequestApi(event(body, null))).status).toBe(401);
});

it('refuses natal or generic key collisions instead of inventing date lineage', async () => {
	await save();
	await enable();
	await db.exec("update workflow_releases set enabled=true where product_id='birth-chart'");
	const body = request(),
		natalCommand = { ...input(), version: 'atv-natal-request/1', productId: 'birth-chart' };
	const natalInput = {
		version: natalCommand.version,
		productId: natalCommand.productId,
		expectedRevision: natalCommand.expectedRevision,
		consent: natalCommand.consent
	};
	await asRole(db, 'authenticated', owner, () =>
		db.query('select request_natal_product_run($1,$2)', [body.requestKey, natalInput])
	);
	await expect(submit(body)).rejects.toThrow('idempotency_conflict');
	const generic = request(),
		runId = await submit(generic);
	await db.query('delete from week_reading_product_requests where run_id=$1', [runId]);
	await expect(submit(generic)).rejects.toThrow('idempotency_conflict');
	expect((await counts()).receipts).toBe(0);
});

it('rejects cross-origin, malformed, oversized or extra HTTP fields before persistence', async () => {
	await save();
	await enable();
	const body = request();
	for (const headers of [{ origin: 'https://elsewhere.test' }, { 'sec-fetch-site': 'cross-site' }])
		expect((await weekRequestApi(event(body, owner, headers))).status).toBe(403);
	for (const invalid of [
		null,
		[],
		{ ...body, ownerId: other },
		{ ...body, requestKey: 'invalid' },
		{ ...body, input: 'x'.repeat(9000) }
	])
		expect((await weekRequestApi(event(invalid))).status).toBe(400);
	const malformed = event(body);
	malformed.request = new Request(malformed.url, {
		method: 'POST',
		headers: { origin: malformed.url.origin, 'content-type': 'application/json' },
		body: '{'
	});
	expect((await weekRequestApi(malformed)).status).toBe(400);
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
});

it.each(['throw', 'error', 'bad-id'])('redacts backend failures: %s', async (mode) => {
	const response = await weekRequestApi(event(request(), owner, {}, mode));
	expect(response.status).toBe(503);
	expect(await response.json()).toEqual({ error: 'workflow_unavailable' });
	expect(response.headers.get('cache-control')).toBe('private, no-store');
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
});

it.each([
	undefined,
	'  Relato privado sintético\ncom pausas\t  ',
	'界'.repeat(1200),
	'🌌'.repeat(600)
])('optional report %# is exact and private through HTTP and SQL', async (context) => {
	await save();
	await enable();
	const body = request({
		version: 'atv-week-reading-request/1',
		...(context === undefined ? {} : { context })
	});
	const response = await weekRequestApi(event(body));
	expect(response.status).toBe(202);
	const payload = (await response.json()) as { runId: string };
	expect(Object.keys(payload)).toEqual(['runId']);
	const run = (
		await db.query<{ input: Record<string, unknown> }>(
			'select input from product_runs where id=$1',
			[payload.runId]
		)
	).rows[0];
	expect(run.input.context).toBe(context);
	expect(Object.hasOwn(run.input, 'context')).toBe(context !== undefined);
	expect(parseWorkflowInput(run.input)).toEqual(run.input);
	expect(
		(await db.query<{ command: unknown }>('select command from week_reading_product_requests'))
			.rows[0].command
	).toEqual(body.input);
	await save(1, { latitude: 10 });
	await forget(2);
	await db.exec('update workflow_releases set enabled=false');
	expect(await submit(body)).toBe(payload.runId);
	await expect(
		submit(request({ ...body.input, context: 'Alterado' }, body.requestKey))
	).rejects.toThrow('idempotency_conflict');
	const recovered = await asRole(db, 'authenticated', owner, () =>
		db.query<{ value: { runId: string } }>('select recover_product_request($1) value', [
			body.requestKey
		])
	);
	expect(recovered.rows[0].value.runId).toBe(payload.runId);
	expect(JSON.stringify(recovered)).not.toContain('context');
	const foreign = await asRole(db, 'authenticated', other, () =>
		db.query<{ value: unknown }>('select recover_product_request($1) value', [body.requestKey])
	);
	expect(foreign.rows[0].value).toBeNull();
	expect(await counts()).toEqual({ runs: 1, receipts: 1, events: 1, items: 1 });
});

it('rejects invalid optional context and broader commands consistently before any persistence', async () => {
	await save();
	await enable();
	for (const change of [
		...[
			null,
			1,
			{},
			[],
			'',
			' \t\n',
			'\u00a0\u2000\ufeff',
			'a'.repeat(1201),
			'🌌'.repeat(601),
			'a\u0008',
			'a\u007f',
			'a\u0085'
		].map((context) => ({ context })),
		{ weekContext: 'alias' },
		{ ownerId: other },
		{ birth: natal },
		{ timezone: 'UTC' },
		{ productId: 'weekly-sky' },
		{ productId: 'solar-return' },
		{ version: 'atv-week-reading-request/2' },
		{ consent: { ...input().consent, continuity: true } }
	]) {
		const body = request({ version: 'atv-week-reading-request/1', ...change });
		expect(parseWeekRequestInput(body.input)).toBeNull();
		expect((await weekRequestApi(event(body))).status).toBe(400);
		await expect(submit(body)).rejects.toThrow('invalid_input');
	}
	// PostgreSQL rejects NUL/unpaired surrogates before PL/pgSQL; HTTP must refuse them too.
	for (const context of ['a\u0000', '\ud800', '\udfff']) {
		const body = request({ version: 'atv-week-reading-request/1', context });
		expect((await weekRequestApi(event(body))).status).toBe(400);
		await expect(submit(body)).rejects.toThrow();
	}
	expect(await counts()).toEqual({ runs: 0, receipts: 0, events: 0, items: 0 });
});

it('accepts maximum escaped Unicode within 8192 bytes, rejects larger wire bodies', async () => {
	await save();
	await enable();
	const body = request({ version: 'atv-week-reading-request/1', context: '界'.repeat(1200) });
	const serialized = JSON.stringify(body).replaceAll('界', '\\u754c');
	expect(new TextEncoder().encode(serialized).length).toBeLessThan(8192);
	const accepted = event(body);
	accepted.request = new Request(accepted.url, {
		method: 'POST',
		headers: { origin: accepted.url.origin, 'content-type': 'application/json' },
		body: serialized
	});
	expect((await weekRequestApi(accepted)).status).toBe(202);
	const oversized = event(body);
	oversized.request = new Request(oversized.url, {
		method: 'POST',
		headers: { origin: oversized.url.origin, 'content-type': 'application/json' },
		body: serialized + ' '.repeat(8192)
	});
	expect((await weekRequestApi(oversized)).status).toBe(400);
	expect((await counts()).runs).toBe(1);
});

it('cascades receipt deletion; forward-fix preserves snapshots and read-only recovery', async () => {
	await save();
	await enable();
	const body = request({ context: 'Relato privado sintético' }),
		runId = await submit(body),
		second = await submit(request());
	const before = (await db.query('select input from product_runs where id=$1', [runId])).rows[0];
	await db.query('delete from product_runs where id=$1', [second]);
	expect((await counts()).receipts).toBe(1);
	await db.exec(await file('supabase/forward-fixes/disable_week_reading_product_requests.sql'));
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
			await file('supabase/migrations/20260929120000_week_reading_product_requests.sql')
		);
		await db.exec(await file('supabase/migrations/20260929140000_week_reading_preferences.sql'));
	}

	expect(await submit(body)).toBe(runId);
	expect((await db.query('select input from product_runs where id=$1', [runId])).rows[0]).toEqual(
		before
	);
	await submit(request());
	expect((await counts()).receipts).toBe(2);
});

const preferences = (changes = {}) => ({
	version: WEEK_PREFERENCES_REQUEST_VERSION,
	timezone: 'America/Fortaleza',
	theme: 'priorities',
	...changes
});
it.each(Object.entries(WEEK_THEMES))(
	'v2 theme %s remains declared, exact and private',
	async (theme, label) => {
		await save();
		await enable();
		const context = '  Relato sintético\nsem inferência.  ';
		const body = request(preferences({ theme, context }));
		expect(parseWeekRequestInput(body.input)).toEqual(body.input);
		const response = await weekRequestApi(event(body));
		expect(response.status).toBe(202);
		expect(response.headers.get('cache-control')).toContain('no-store');
		const { runId } = (await response.json()) as { runId: string };
		const run = (
			await db.query<{ input: { context: string; birth: { timezone: string } } }>(
				'select input from product_runs where id=$1',
				[runId]
			)
		).rows[0];
		expect(run.input.context).toBe(
			`Fuso atual declarado: America/Fortaleza (não usado para calcular dias locais).\nTema escolhido: ${label}.\n\nContexto declarado: ${context}`
		);
		expect(run.input.birth.timezone).toBe(natal.timezone);
		expect(parseWorkflowInput(run.input)).toEqual(run.input);
		expect(run.input).not.toHaveProperty('theme');
		expect(run.input).not.toHaveProperty('timezone');
		const v1 = await submit(request());
		const legacy = (
			await db.query<{ input: unknown }>('select input from product_runs where id=$1', [v1])
		).rows[0].input;
		const { context: declared, ...geometryInput } = run.input;
		expect(declared).toContain(label);
		expect(geometryInput).toEqual(legacy);
		expect(
			(
				await db.query<{ command: unknown }>(
					'select command from week_reading_product_requests where run_id=$1',
					[runId]
				)
			).rows[0].command
		).toEqual(body.input);
		await expect(
			asRole(db, 'authenticated', owner, () =>
				db.query('select command from week_reading_product_requests')
			)
		).rejects.toThrow('permission denied');
		const recovered = await asRole(db, 'authenticated', owner, () =>
			db.query('select recover_product_request($1) value', [body.requestKey])
		);
		expect(JSON.stringify(recovered.rows)).not.toContain('Fortaleza');
		expect(JSON.stringify(recovered.rows)).not.toContain(context);
		await expect(
			submit(
				request(
					preferences({ theme: theme === 'care' ? 'general' : 'care', context }),
					body.requestKey
				)
			)
		).rejects.toThrow('idempotency_conflict');
	}
);

it('v2 omission, UTF-16 boundary and UTC are valid; preferences are immutable after profile/gate changes', async () => {
	await save();
	await enable();
	for (const context of [undefined, '界'.repeat(900), '🪐'.repeat(450)]) {
		const body = request(
			preferences({ timezone: 'UTC', ...(context === undefined ? {} : { context }) })
		);
		expect(parseWeekRequestInput(body.input)).toEqual(body.input);
		const id = await submit(body);
		const persisted = (
			await db.query<{ input: { context: string } }>('select input from product_runs where id=$1', [
				id
			])
		).rows[0].input;
		expect(persisted.context.length).toBeLessThanOrEqual(1200);
		expect(parseWorkflowInput(persisted)).toEqual(persisted);
		if (context !== undefined) expect(persisted.context.endsWith(context)).toBe(true);
		else expect(persisted.context).not.toContain('Contexto declarado:');
	}
	const body = request(preferences());
	const id = await submit(body);
	const before = (await db.query('select input from product_runs where id=$1', [id])).rows[0];
	await save(1, { timezone: 'UTC', localDateTime: '1990-06-15T15:30:00.123' });
	await forget(2);
	await db.exec("update workflow_releases set enabled=false where product_id='week-reading'");
	expect(await submit(body)).toBe(id);
	expect((await db.query('select input from product_runs where id=$1', [id])).rows[0]).toEqual(
		before
	);
	await expect(submit(request(preferences({ timezone: 'UTC' }), body.requestKey))).rejects.toThrow(
		'idempotency_conflict'
	);
});

it('v2 rejects missing/unknown preferences and shortened-report violations in HTTP and SQL without allocation', async () => {
	await save();
	await enable();
	const before = await counts();
	const changes = [
		...[
			undefined,
			null,
			'',
			'UTC+03:00',
			'-03:00',
			'Brazil',
			'america/sao_paulo',
			'America/Fake',
			' UTC',
			'UTC\n',
			true,
			12,
			{},
			'America/' + 'a'.repeat(60)
		].map((timezone) => ({ timezone })),
		...[undefined, null, '', 'money', 'constructor', 'toString', true, 2, {}].map((theme) => ({
			theme
		})),
		...['a'.repeat(901), '🪐'.repeat(451), '   ', '\u0001', 'a\u007f'].map((context) => ({
			context
		})),
		{ currentTimezone: 'UTC' },
		{ importantDates: [] },
		{ calendar: true },
		{ version: 'atv-week-reading-request/3' },
		{ consent: { ...input().consent, continuity: true } }
	];
	for (const change of changes) {
		const body = request(preferences(change));
		expect(parseWeekRequestInput(body.input), JSON.stringify(change)).toBeNull();
		expect((await weekRequestApi(event(body))).status).toBe(400);
		await expect(submit(body)).rejects.toThrow('invalid_input');
	}
	expect(await counts()).toEqual(before);
});

it('v2 forward-fix denies creation while preserving receipts/recovery; reapply restores exact replay', async () => {
	await save();
	await enable();
	const body = request(preferences());
	const id = await submit(body);
	await db.exec(await file('supabase/forward-fixes/disable_week_reading_product_requests.sql'));
	try {
		await expect(submit(body)).rejects.toThrow('permission denied');
		await expect(submit(request(preferences()))).rejects.toThrow('permission denied');
		const recovered = await asRole(db, 'authenticated', owner, () =>
			db.query<{ value: { runId: string } }>('select recover_product_request($1) value', [
				body.requestKey
			])
		);
		expect(recovered.rows[0].value.runId).toBe(id);
	} finally {
		await db.exec(await file('supabase/migrations/20260929140000_week_reading_preferences.sql'));
	}
	expect(await submit(body)).toBe(id);
	expect((await counts()).receipts).toBe(1);
});
