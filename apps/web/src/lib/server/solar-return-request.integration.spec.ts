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
import { parseSolarReturnRequestInput, solarTargetDate } from '../solar-return-request';
import { solarReturnRequestApi } from './solar-return-request-api';

let db: Awaited<ReturnType<typeof setupProductDatabase>>;
const natal = {
	localDateTime: '1992-02-29T12:30:00.123',
	utcInstant: '1992-02-29T15:30:00.123Z',
	timezone: 'America/Sao_Paulo',
	latitude: -23.55,
	longitude: -46.63,
	locationSource: 'synthetic-fixture/1',
	timePrecision: 'EXACT',
	locationLabel: 'Local sintético privado',
	countryCode: 'BR'
};
const input = (changes: Record<string, unknown> = {}) => ({
	version: 'atv-solar-return-request/1',
	productId: 'solar-return',
	expectedRevision: 1,
	returnYear: 2027,
	targetDate: '2027-02-28',
	returnLocation: {
		city: 'Rio de Janeiro',
		timezone: 'America/Sao_Paulo',
		latitude: -22.9068,
		longitude: -43.1729
	},
	consent: {
		storage: true,
		policyVersion: 'atv-input-consent/1',
		partner: false,
		continuity: false
	},
	...changes
});
const request = (changes: Record<string, unknown> = {}, requestKey = randomUUID()) => ({
	requestKey,
	input: input(changes)
});
async function submit(
	body: { requestKey: string; input: ReturnType<typeof input> },
	user: string | null = owner,
	role = 'authenticated'
) {
	return asRole(
		db,
		role,
		user,
		async () =>
			(
				await db.query<{ value: string }>('select request_solar_return_product_run($1,$2) value', [
					body.requestKey,
					body.input
				])
			).rows[0].value
	);
}
async function save(changes: Record<string, unknown> = {}, user = owner) {
	return asRole(db, 'authenticated', user, () =>
		db.query('select update_natal_onboarding($1)', [
			{
				version: 'atv-onboarding/1',
				action: 'save-natal',
				expectedRevision: 0,
				natal: { ...natal, ...changes },
				consent: { storage: true, policyVersion: 'atv-natal-storage/1' }
			}
		])
	);
}
function event(body: unknown, user: string | null = owner, headers = {}) {
	const url = new URL('https://atv.test/api/workflows/solar-return');
	return {
		url,
		request: new Request(url, {
			method: 'POST',
			headers: { origin: url.origin, 'content-type': 'application/json', ...headers },
			body: JSON.stringify(body)
		}),
		locals: {
			supabase: {
				auth: { getClaims: async () => ({ data: { claims: { sub: user } }, error: null }) },
				rpc: async (
					name: string,
					args: { p_request_key: string; p_command: ReturnType<typeof input> }
				) => {
					expect(name).toBe('request_solar_return_product_run');
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
		await db.query<{ runs: number; receipts: number }>(`select
		(select count(*)::int from product_runs) runs,
		(select count(*)::int from solar_return_product_requests) receipts`)
	).rows[0];
}
beforeAll(async () => {
	db = await setupProductDatabase();
	for (const name of [
		'20260923180000_natal_onboarding.sql',
		'20260924170000_product_request_recovery.sql',
		'20260925140000_product_request_access.sql',
		'20260929160000_solar_return_product_requests.sql',
		'20260929170000_solar_return_important_dates.sql'
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

it('derives a leap birthday, preserves declared city separately and enforces the release gate', async () => {
	expect(solarTargetDate(natal.localDateTime, 2027)).toBe('2027-02-28');
	expect(solarTargetDate(natal.localDateTime, 2028)).toBe('2028-02-29');
	await save();
	const importantDates = {
		authorization: 'atv-solar-important-dates/1',
		entries: [
			{ date: '2027-04-10', label: 'Mudança planejada' },
			{ date: '2028-02-28', label: 'Revisão do ciclo' }
		]
	};
	const body = request({ context: 'Prioridades deste ciclo.', importantDates });
	expect(parseSolarReturnRequestInput(body.input)).toEqual(body.input);
	expect((await solarReturnRequestApi(event(body))).status).toBe(409);
	expect(await counts()).toEqual({ runs: 0, receipts: 0 });
	await db.exec("update workflow_releases set enabled=true where product_id='solar-return'");
	const response = await solarReturnRequestApi(event(body));
	expect(response.status).toBe(202);
	expect(response.headers.get('cache-control')).toBe('private, no-store');
	const { runId } = (await response.json()) as { runId: string };
	const run = (
		await db.query<{ input: unknown; state: string }>(
			'select input,state from product_runs where id=$1',
			[runId]
		)
	).rows[0];
	expect(run.state).toBe('QUEUED');
	expect(parseWorkflowInput(run.input)).toMatchObject({
		productId: 'solar-return',
		returnYear: 2027,
		targetDate: '2027-02-28',
		returnLocation: { ...body.input.returnLocation, locationSource: 'declared-manual/1' },
		birth: {
			latitude: natal.latitude,
			longitude: natal.longitude,
			locationSource: natal.locationSource
		},
		context: 'Prioridades deste ciclo.',
		importantDates
	});
	expect(
		(await db.query('select command,natal_version from solar_return_product_requests')).rows[0]
	).toEqual({ command: body.input, natal_version: 1 });
	expect(await counts()).toEqual({ runs: 1, receipts: 1 });
});

it('rejects forged anchors and coordinates in both client and SQL, with no writes', async () => {
	await save();
	await db.exec("update workflow_releases set enabled=true where product_id='solar-return'");
	for (const change of [
		{ targetDate: '2027-03-01' },
		{ targetDate: '2027-02-29' },
		{ returnYear: 1991, targetDate: '1991-02-28' },
		{ returnLocation: null },
		{ returnLocation: 'São Paulo' },
		{ returnLocation: { ...input().returnLocation, latitude: 91 } },
		{ returnLocation: { ...input().returnLocation, timezone: 'Not/A_Zone' } },
		{ importantDates: '2027-04-10' },
		{ importantDates: { entries: [{ date: '2027-04-10', label: 'Mudança' }] } },
		{ importantDates: { authorization: 'atv-solar-important-dates/1', entries: [] } },
		{ importantDates: { authorization: 'atv-solar-important-dates/1', entries: ['2027-04-10'] } },
		{
			importantDates: {
				authorization: 'atv-solar-important-dates/1',
				entries: Array.from({ length: 4 }, (_, i) => ({ date: `2027-04-${10 + i}`, label: 'Data' }))
			}
		},
		{
			importantDates: {
				authorization: 'atv-solar-important-dates/1',
				entries: [{ date: '2027-02-27', label: 'Antes do ciclo' }]
			}
		},
		{
			importantDates: {
				authorization: 'atv-solar-important-dates/1',
				entries: [
					{ date: '2027-04-10', label: 'Mudança' },
					{ date: '2027-04-10', label: 'Duplicada' }
				]
			}
		},
		{ birth: natal },
		{ consent: { ...input().consent, continuity: true } }
	]) {
		const body = request(change);
		if (change.targetDate === '2027-03-01' || change.returnYear === 1991)
			expect(parseSolarReturnRequestInput(body.input)).toEqual(body.input);
		else expect(parseSolarReturnRequestInput(body.input)).toBeNull();
		await expect(submit(body)).rejects.toThrow('invalid_input');
	}
	expect(await counts()).toEqual({ runs: 0, receipts: 0 });
});

it('keeps replay private and idempotent across profile and release changes', async () => {
	await save();
	await db.exec("update workflow_releases set enabled=true where product_id='solar-return'");
	const body = request();
	const runId = await submit(body);
	await db.exec("update workflow_releases set enabled=false where product_id='solar-return'");
	expect(await submit(body)).toBe(runId);
	await expect(
		submit(
			request({ returnLocation: { ...input().returnLocation, city: 'São Paulo' } }, body.requestKey)
		)
	).rejects.toThrow('idempotency_conflict');
	await save({}, other);
	await expect(submit(body, other)).rejects.toThrow('workflow_unreleased');
	for (const role of ['anon', 'authenticated', 'service_role'])
		await expect(
			asRole(db, role, owner, () => db.query('select * from solar_return_product_requests'))
		).rejects.toThrow('permission denied');
	expect((await solarReturnRequestApi(event(body, null))).status).toBe(401);
	expect(
		(await solarReturnRequestApi(event(body, owner, { origin: 'https://foreign.test' }))).status
	).toBe(403);
	expect(await counts()).toEqual({ runs: 1, receipts: 1 });
});
