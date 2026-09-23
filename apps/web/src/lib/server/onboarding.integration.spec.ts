import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole } from '../../../../../scripts/helpers/artifact-fixture.mjs';
import {
	ONBOARDING_VERSION,
	NATAL_CONSENT_VERSION,
	parseOnboardingCommand,
	parseOnboardingSnapshot
} from '../onboarding';
import { onboardingApi } from './onboarding-api';

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
const command = (action = 'save-natal', expectedRevision = 0, changes = {}) => ({
	version: ONBOARDING_VERSION,
	action,
	expectedRevision,
	...(action === 'save-natal'
		? { natal: { ...natal }, consent: { storage: true, policyVersion: NATAL_CONSENT_VERSION } }
		: {}),
	...changes
});
async function rpc(
	name: string,
	args: Record<string, unknown>,
	user: string | null = owner,
	role = 'authenticated'
) {
	if (!['read_natal_onboarding', 'update_natal_onboarding'].includes(name))
		throw new Error('unexpected RPC');
	return asRole(db, role, user, async () => {
		const result =
			name === 'read_natal_onboarding'
				? await db.query('select read_natal_onboarding() as value')
				: await db.query('select update_natal_onboarding($1) as value', [args.p_command]);
		return (result.rows[0] as { value: unknown }).value;
	});
}
const save = (body: unknown, user = owner) =>
	rpc('update_natal_onboarding', { p_command: body }, user);
const read = (user = owner) => rpc('read_natal_onboarding', {}, user);
function event(
	body?: unknown,
	user: string | null = owner,
	overrides: Record<string, string> = {}
) {
	return {
		url: new URL('https://atv.test/api/onboarding'),
		request: new Request('https://atv.test/api/onboarding', {
			method: body === undefined ? 'GET' : 'POST',
			headers: { 'content-type': 'application/json', origin: 'https://atv.test', ...overrides },
			...(body === undefined ? {} : { body: JSON.stringify(body) })
		}),
		locals: {
			supabase: {
				auth: { getClaims: async () => ({ data: { claims: { sub: user } }, error: null }) },
				rpc: async (name: string, args: Record<string, unknown> = {}) => {
					try {
						return { data: await rpc(name, args, user), error: null };
					} catch (error) {
						return { data: null, error: { message: (error as Error).message } };
					}
				}
			}
		}
	} as unknown as Pick<RequestEvent, 'request' | 'url' | 'locals'>;
}
beforeAll(async () => {
	db = await setupProductDatabase();
	await db.exec(await file('supabase/migrations/20260923180000_natal_onboarding.sql'));
}, 20000);
beforeEach(async () => {
	await db.exec(
		"delete from natal_profiles; delete from natal_storage_consents; update profiles set onboarding_revision=0,onboarding_state='NOT_STARTED',deleted_at=null"
	);
});
afterAll(async () => {
	await db?.close();
});

it('persists progressive start, complete natal profile, recovery and immutable previous versions through the API', async () => {
	let response = await onboardingApi(event(), 'read');
	expect(response.status).toBe(200);
	expect(((await response.json()) as { onboarding: unknown }).onboarding).toEqual({
		version: ONBOARDING_VERSION,
		revision: 0,
		state: 'NOT_STARTED',
		natal: null
	});
	response = await onboardingApi(event(command('begin')), 'write');
	expect(((await response.json()) as { onboarding: unknown }).onboarding).toMatchObject({
		revision: 1,
		state: 'IN_PROGRESS',
		natal: null
	});
	response = await onboardingApi(event(command('save-natal', 1)), 'write');
	expect(response.status).toBe(200);
	const first = ((await response.json()) as { onboarding: unknown }).onboarding;
	expect(first).toEqual({
		version: ONBOARDING_VERSION,
		revision: 2,
		state: 'COMPLETE',
		natal: { ...natal, version: 2 }
	});
	expect(await read()).toEqual(first);
	expect(response.headers.get('cache-control')).toBe('private, no-store');
	expect(response.headers.get('referrer-policy')).toBe('no-referrer');
	await save(
		command('save-natal', 2, {
			natal: { ...natal, timePrecision: 'APPROXIMATE', locationLabel: 'Correção sintética' }
		})
	);
	expect(
		(
			await db.query(
				'select version,is_current,location_label from natal_profiles order by version'
			)
		).rows
	).toEqual([
		{ version: 2, is_current: false, location_label: 'Local sintético' },
		{ version: 3, is_current: true, location_label: 'Correção sintética' }
	]);
	expect((await read()) as object).toMatchObject({
		revision: 3,
		natal: { version: 3, timePrecision: 'APPROXIMATE' }
	});
	expect(
		(await db.query('select granted,policy_version from natal_storage_consents')).rows
	).toHaveLength(2);
	expect((await db.query('select count(*)::int as n from consent_events')).rows).toEqual([
		{ n: 0 }
	]);
});

it('refuses stale revisions, including retries, with no new profile or consent', async () => {
	const original = await save(command());
	const response = await onboardingApi(event(command()), 'write');
	expect(response.status).toBe(409);
	expect(await response.json()).toEqual({ error: 'revision_conflict' });
	await expect(save(command('forget-natal', 0))).rejects.toThrow('revision_conflict');
	expect(await read()).toEqual(original);
	expect((await db.query('select count(*)::int as n from natal_storage_consents')).rows).toEqual([
		{ n: 1 }
	]);
});

it('isolates owners, denies bypass writes and service/anonymous execution', async () => {
	await save(command());
	expect(await read(other)).toMatchObject({ revision: 0, natal: null });
	for (const table of ['natal_profiles', 'natal_storage_consents']) {
		expect(
			(await asRole(db, 'authenticated', other, () => db.query(`select * from ${table}`))).rows
		).toEqual([]);
		await expect(
			asRole(db, 'authenticated', owner, () => db.exec(`delete from ${table}`))
		).rejects.toThrow('permission denied');
	}
	await expect(
		asRole(db, 'authenticated', owner, () =>
			db.exec("update profiles set onboarding_state='COMPLETE'")
		)
	).rejects.toThrow('permission denied');
	for (const role of ['anon', 'service_role'])
		for (const name of ['read_natal_onboarding', 'update_natal_onboarding'])
			await expect(rpc(name, { p_command: command() }, owner, role)).rejects.toThrow(
				'permission denied'
			);
	await expect(rpc('read_natal_onboarding', {}, null)).rejects.toThrow('auth_required');
});

it('requires exact versioned consent and strict independent SQL/API schemas', async () => {
	const bad = [
		null,
		[],
		{},
		command('begin', 0, { userId: other }),
		command('begin', -1),
		command('begin', 0.5),
		command('begin', 0, { natal }),
		command('save-natal', 0, { consent: { storage: false, policyVersion: NATAL_CONSENT_VERSION } }),
		command('save-natal', 0, { consent: { storage: true, policyVersion: 'future' } }),
		command('save-natal', 0, {
			consent: { storage: true, policyVersion: NATAL_CONSENT_VERSION, marketing: true }
		}),
		command('save-natal', 0, { natal: { ...natal, latitude: '0' } }),
		command('save-natal', 0, { natal: { ...natal, timePrecision: 'UNKNOWN' } }),
		command('save-natal', 0, { natal: { ...natal, locationLabel: 'x'.repeat(201) } }),
		command('save-natal', 0, { natal: { ...natal, ownerId: other } })
	];
	for (const body of bad) {
		expect(parseOnboardingCommand(body)).toBeNull();
		await expect(save(body)).rejects.toThrow('invalid_input');
		expect((await onboardingApi(event(body), 'write')).status).toBe(400);
	}
	expect(await read()).toMatchObject({ revision: 0, natal: null });
});

it('rejects invalid calendar, normalization, unknown zone, UTC mismatch, range and DST gap without persisting', async () => {
	const bad = [
		{ localDateTime: '1990-02-30T12:30:00' },
		{ localDateTime: '1990-06-15T24:30:00' },
		{ utcInstant: '1990-06-15T15:30:60Z' },
		{ utcInstant: '1990-06-15T15:30:00.124Z' },
		{ timezone: 'America/Unknown' },
		{ timezone: 'PST' },
		{ latitude: 91 },
		{ longitude: -181 },
		{ localDateTime: '1899-12-31T00:00:00', utcInstant: '1899-12-31T00:00:00Z', timezone: 'UTC' },
		{
			localDateTime: '2024-03-10T02:30:00',
			utcInstant: '2024-03-10T07:30:00Z',
			timezone: 'America/New_York'
		}
	];
	for (const changes of bad)
		await expect(
			save(command('save-natal', 0, { natal: { ...natal, ...changes } }))
		).rejects.toThrow('invalid_input');
	expect(await read()).toMatchObject({ revision: 0, natal: null });
});

it('uses explicit UTC to disambiguate either side of a repeated local time', async () => {
	for (const [revision, instant] of ['2024-11-03T05:30:00Z', '2024-11-03T06:30:00Z'].entries()) {
		const result = await save(
			command('save-natal', revision, {
				natal: {
					...natal,
					localDateTime: '2024-11-03T01:30:00',
					utcInstant: instant,
					timezone: 'America/New_York'
				}
			})
		);
		expect(result).toMatchObject({
			state: 'COMPLETE',
			natal: { utcInstant: instant.replace('Z', '.000Z') }
		});
	}
});

it('forgets all natal versions, preserves consent receipts without birth data and never reuses a version', async () => {
	await save(command());
	await save(command('save-natal', 1));
	await save(command(), other);
	const result = await save(command('forget-natal', 2));
	expect(result).toEqual({
		version: ONBOARDING_VERSION,
		revision: 3,
		state: 'IN_PROGRESS',
		natal: null
	});
	expect((await db.query('select * from natal_profiles where user_id=$1', [owner])).rows).toEqual(
		[]
	);
	expect((await read(other)) as object).toMatchObject({ state: 'COMPLETE' });
	expect(
		(
			await db.query(
				'select granted from natal_storage_consents where user_id=$1 order by revision',
				[owner]
			)
		).rows
	).toEqual([{ granted: true }, { granted: true }, { granted: false }]);
	expect(await save(command('save-natal', 3))).toMatchObject({ natal: { version: 4 } });
});

it('blocks deleted profiles and excludes their direct natal reads', async () => {
	await save(command());
	await db.query('update profiles set deleted_at=now() where id=$1', [owner]);
	await expect(read()).rejects.toThrow('profile_unavailable');
	await expect(save(command('forget-natal', 1))).rejects.toThrow('profile_unavailable');
	expect(
		(await asRole(db, 'authenticated', owner, () => db.query('select * from natal_profiles'))).rows
	).toEqual([]);
});

it('rejects CSRF, missing auth, oversized input and untrusted database output without leaking details', async () => {
	expect(
		(await onboardingApi(event(command(), owner, { origin: 'https://other.test' }), 'write')).status
	).toBe(403);
	expect(
		(await onboardingApi(event(command(), owner, { 'sec-fetch-site': 'cross-site' }), 'write'))
			.status
	).toBe(403);
	expect((await onboardingApi(event(command(), null), 'write')).status).toBe(401);
	expect(
		(await onboardingApi(event({ ...command(), padding: 'x'.repeat(4096) }), 'write')).status
	).toBe(400);
	const broken = event();
	broken.locals.supabase = {
		auth: { getClaims: async () => ({ data: { claims: { sub: owner } } }) },
		rpc: async () => ({ data: { natal: natal }, error: null })
	} as unknown as typeof broken.locals.supabase;
	expect(await (await onboardingApi(broken, 'read')).json()).toEqual({
		error: 'onboarding_unavailable'
	});
	broken.locals.supabase = undefined;
	expect((await onboardingApi(broken, 'read')).status).toBe(503);
	expect(
		parseOnboardingSnapshot({
			version: ONBOARDING_VERSION,
			revision: 0,
			state: 'COMPLETE',
			natal: null
		})
	).toBeNull();
});

it('forward-fix disables mutations, retains recovery and does not restore direct-write bypass', async () => {
	const previous = await save(command());
	await db.exec(await file('supabase/forward-fixes/disable_natal_onboarding_writes.sql'));
	try {
		await expect(save(command('forget-natal', 1))).rejects.toThrow('permission denied');
		expect(await read()).toEqual(previous);
		await expect(
			asRole(db, 'authenticated', owner, () => db.exec('delete from natal_profiles'))
		).rejects.toThrow('permission denied');
	} finally {
		await db.exec('grant execute on function update_natal_onboarding(jsonb) to authenticated');
	}
});
