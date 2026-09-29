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
import { parsePersonalCalendarRequestInput } from '../personal-calendar-request';
import { personalCalendarRequestApi } from './personal-calendar-request-api';

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
const marks = {
	authorization: 'atv-personal-calendar-marks/1',
	entries: [
		{ date: '2028-02-01', label: 'Planejamento pessoal' },
		{ date: '2028-02-29', label: 'Revisão pessoal' }
	]
};
const input = (changes: Record<string, unknown> = {}) => ({
	version: 'atv-personal-calendar-request/1',
	productId: 'personal-calendar',
	expectedRevision: 1,
	targetDate: '2028-02-01',
	consent: {
		storage: true,
		policyVersion: 'atv-input-consent/1',
		partner: false,
		continuity: false
	},
	...changes
});
const request = (changes: Record<string, unknown> = {}, requestKey: string = randomUUID()) => ({
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
				await db.query<{ value: string }>(
					'select request_personal_calendar_product_run($1,$2) value',
					[body.requestKey, body.input]
				)
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
	const url = new URL('https://atv.test/api/workflows/personal-calendar');
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
					expect(name).toBe('request_personal_calendar_product_run');
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
		(select count(*)::int from personal_calendar_product_requests) receipts`)
	).rows[0];
}
beforeAll(async () => {
	db = await setupProductDatabase();
	for (const name of [
		'20260923180000_natal_onboarding.sql',
		'20260924170000_product_request_recovery.sql',
		'20260925140000_product_request_access.sql',
		'20260929190000_personal_calendar_product_requests.sql'
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

it('stores a private month request with authorized reports and respects the release gate', async () => {
	await save();
	const body = request({ context: 'Notas pessoais deste mês.', calendarMarks: marks });
	expect(parsePersonalCalendarRequestInput(body.input)).toEqual(body.input);
	expect((await personalCalendarRequestApi(event(body))).status).toBe(409);
	expect(await counts()).toEqual({ runs: 0, receipts: 0 });
	await db.exec("update workflow_releases set enabled=true where product_id='personal-calendar'");
	const response = await personalCalendarRequestApi(event(body));
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
		productId: 'personal-calendar',
		targetDate: '2028-02-01',
		birth: { localDateTime: natal.localDateTime, locationSource: natal.locationSource },
		context: 'Notas pessoais deste mês.',
		calendarMarks: marks
	});
	expect(
		(await db.query('select command,natal_version from personal_calendar_product_requests')).rows[0]
	).toEqual({ command: body.input, natal_version: 1 });
	expect(await submit(body)).toBe(runId);
	expect(await counts()).toEqual({ runs: 1, receipts: 1 });
});

it('rejects malformed months and unauthorized or out-of-month marks at both boundaries', async () => {
	await save();
	await db.exec("update workflow_releases set enabled=true where product_id='personal-calendar'");
	for (const change of [
		{ targetDate: '2028-02-02' },
		{ targetDate: '2028-13-01' },
		{ calendarMarks: { ...marks, authorization: 'missing' } },
		{ calendarMarks: { ...marks, entries: [{ date: '2028-03-01', label: 'Fora' }] } },
		{
			calendarMarks: {
				...marks,
				entries: [
					{ date: '2028-02-29', label: 'A' },
					{ date: '2028-02-29', label: 'B' }
				]
			}
		},
		{ calendarMarks: { ...marks, entries: [{ date: '2028-02-29', label: 'Controle\u0001' }] } },
		{ calendarMarks: { ...marks, entries: [{ date: '2028-02-29', label: '😀'.repeat(41) }] } },
		{ calendarMarks: { ...marks, entries: [{ date: '2028-02-29', label: '\u00a0' }] } },
		{ context: '' },
		{
			consent: {
				storage: true,
				policyVersion: 'atv-input-consent/1',
				partner: false,
				continuity: true
			}
		}
	]) {
		const body = request(change);
		expect(parsePersonalCalendarRequestInput(body.input)).toBeNull();
		expect((await personalCalendarRequestApi(event(body))).status).toBe(400);
		await expect(submit(body)).rejects.toThrow('invalid_input');
	}
	expect(await counts()).toEqual({ runs: 0, receipts: 0 });
});

it('scopes receipts to owner and exact command, requires a current exact natal profile', async () => {
	await save();
	await db.exec("update workflow_releases set enabled=true where product_id='personal-calendar'");
	const body = request({ calendarMarks: marks });
	await expect(submit(request({ expectedRevision: 0 }))).rejects.toThrow('invalid_input');
	await expect(submit(request({ expectedRevision: 2 }))).rejects.toThrow('revision_conflict');
	const runId = await submit(body);
	await expect(
		submit(request({ calendarMarks: marks, context: 'Outra nota.' }, body.requestKey))
	).rejects.toThrow('idempotency_conflict');
	await expect(submit(body, other)).rejects.toThrow('revision_conflict');
	await expect(
		asRole(db, 'authenticated', other, () =>
			db.query('select * from personal_calendar_product_requests')
		)
	).rejects.toThrow();
	expect(await submit(body)).toBe(runId);
	expect(await counts()).toEqual({ runs: 1, receipts: 1 });
});

it('requires same-origin authenticated API requests', async () => {
	expect((await personalCalendarRequestApi(event(request(), null))).status).toBe(401);
	expect(
		(
			await personalCalendarRequestApi(
				event(request(), owner, { origin: 'https://elsewhere.test' })
			)
		).status
	).toBe(403);
	expect(await counts()).toEqual({ runs: 0, receipts: 0 });
});

it('requires a natal profile with exact birth time', async () => {
	await save({ timePrecision: 'APPROXIMATE' });
	await db.exec("update workflow_releases set enabled=true where product_id='personal-calendar'");
	const body = request({ calendarMarks: marks });
	await expect(submit(body)).rejects.toThrow('exact_time_required');
	expect((await personalCalendarRequestApi(event(body))).status).toBe(409);
	expect(await counts()).toEqual({ runs: 0, receipts: 0 });
});
