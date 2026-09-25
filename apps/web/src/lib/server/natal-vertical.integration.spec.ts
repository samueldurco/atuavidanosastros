import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkflowInput, CalculationSnapshot } from '@atv/domain';
import { bodies, CaelusEphemerisProvider } from '@atv/astrology';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole } from '../../../../../scripts/helpers/artifact-fixture.mjs';
import { createProductProcessor } from '../../../../worker/src/product-runtime';
import { createProductPublisher } from '../../../../worker/src/product-publication';
import { createNatalCalculators } from '../../../../worker/src/natal-calculators';
import { createContextCalculators } from '../../../../worker/src/context-calculators';
import { natalProducts, parseNatalRequestInput } from '../natal-request';
import { parseDateRequestInput } from '../date-request';
import { parseOnboardingSnapshot } from '../onboarding';
import { createWorkflowRequest } from '../workflow-request';
import { natalRequestApi } from './natal-request-api';
import { dateRequestApi } from './date-request-api';
import { onboardingApi } from './onboarding-api';
import { workflowApi } from './workflow-api';
import { recoverWorkflowRequest } from './workflow-recovery';
import { workflowArtifacts } from './workflow-artifacts';
import { readLibraryResult } from './library-reader';

// Local PostgreSQL/RLS and actual handlers/calculators. Synthetic claims, one connection.
// Never seed editorial approval, promotions or READY output to make a vertical pass.
let db: Awaited<ReturnType<typeof setupProductDatabase>>;
const profileProducts = [...natalProducts, 'date-reading'] as const;
const targetDate = '2028-02-29';
const requestPath = (productId: string) =>
	productId === 'date-reading' ? '/api/workflows/date' : '/api/workflows/natal';
const requestApi = (productId: string) =>
	productId === 'date-reading' ? dateRequestApi : natalRequestApi;
const birth = {
	localDateTime: '1990-06-15T12:30:00.123',
	utcInstant: '1990-06-15T15:30:00.123Z',
	timezone: 'America/Sao_Paulo',
	latitude: -23.55,
	longitude: -46.63,
	locationSource: 'synthetic-fixture/1'
};
const natal = {
	...birth,
	timePrecision: 'EXACT',
	locationLabel: 'Local sintético privado',
	countryCode: 'BR'
};
const consent = {
	storage: true,
	policyVersion: 'atv-input-consent/1',
	partner: false,
	continuity: false
};
beforeAll(async () => {
	db = await setupProductDatabase({ processing: true });
	for (const migration of [
		'20260915180000_product_artifacts.sql',
		'20260923110000_product_editorial_publication.sql',
		'20260923180000_natal_onboarding.sql',
		'20260924170000_product_request_recovery.sql',
		'20260925140000_product_request_access.sql',
		'20260925160000_natal_product_requests.sql',
		'20260925190000_date_product_requests.sql'
	])
		await db.exec(await file('supabase/migrations/' + migration));
}, 20000);
afterAll(async () => {
	await db?.close();
});
beforeEach(async () => {
	await db.exec(
		"delete from product_runs; delete from library_items; delete from natal_profiles; delete from natal_storage_consents; update profiles set onboarding_revision=0,onboarding_state='NOT_STARTED',deleted_at=null; update workflow_releases set enabled=false,engine_approved=false,access_policy='free'"
	);
});
const statements = {
	read_natal_onboarding: ['select read_natal_onboarding() as value', []],
	update_natal_onboarding: ['select update_natal_onboarding($1) as value', ['p_command']],
	request_natal_product_run: [
		'select request_natal_product_run($1,$2) as value',
		['p_request_key', 'p_command']
	],
	request_date_product_run: [
		'select request_date_product_run($1,$2) as value',
		['p_request_key', 'p_command']
	],
	request_product_run: [
		'select request_product_run($1,$2,$3,$4) as value',
		['p_product_id', 'p_request_key', 'p_input', 'p_parent_id']
	],
	read_product_run: ['select read_product_run($1) as value', ['p_id']],
	recover_product_request: ['select recover_product_request($1) as value', ['p_request_key']],
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
	args: Record<string, unknown> = {},
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
const workerRpc = async (name: string, args: Record<string, unknown>, signal: AbortSignal) => {
	signal.throwIfAborted();
	return query(name, args, null, 'service_role');
};
function sessionClient(user: string) {
	return {
		auth: { getClaims: async () => ({ data: { claims: { sub: user } }, error: null }) },
		rpc(name: string, args: Record<string, unknown> = {}) {
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
			const filters: Record<string, string> = {};
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
async function save(expectedRevision = 0, changes = {}) {
	const response = await onboardingApi(
		event('/api/onboarding', {
			version: 'atv-onboarding/1',
			action: 'save-natal',
			expectedRevision,
			natal: { ...natal, ...changes },
			consent: { storage: true, policyVersion: 'atv-natal-storage/1' }
		}),
		'write'
	);
	expect(response.status).toBe(200);
}
async function forget(expectedRevision: number) {
	expect(
		(
			await onboardingApi(
				event('/api/onboarding', {
					version: 'atv-onboarding/1',
					action: 'forget-natal',
					expectedRevision
				}),
				'write'
			)
		).status
	).toBe(200);
}
async function command(productId: string, date = targetDate) {
	const response = await onboardingApi(event('/api/onboarding'), 'read');
	expect(response.status).toBe(200);
	const payload = (await response.json()) as { onboarding: unknown };
	const snapshot = parseOnboardingSnapshot(payload.onboarding);
	expect(snapshot).toMatchObject({ state: 'COMPLETE', natal: { timePrecision: 'EXACT' } });
	const parse = productId === 'date-reading' ? parseDateRequestInput : parseNatalRequestInput;
	const input = parse({
		version: productId === 'date-reading' ? 'atv-date-request/1' : 'atv-natal-request/1',
		productId,
		...(productId === 'date-reading' ? { targetDate: date } : {}),
		expectedRevision: snapshot!.revision,
		consent
	});
	if (!input) throw new Error('invalid_fixture');
	return input;
}
function browser(productId: string, lostAcknowledgement = false) {
	const values = new Map<string, string>();
	const fetcher = vi.fn<typeof fetch>(async (path, init) => {
		const e = event(String(path), init?.body ? JSON.parse(String(init.body)) : undefined);
		if (e.url.pathname === requestPath(productId)) {
			const response = await requestApi(productId)(e);
			if (lostAcknowledgement && response.status === 202)
				throw new TypeError('lost acknowledgement');
			return response;
		}
		if (e.url.pathname === '/api/workflows/recover') return recoverWorkflowRequest(e);
		return workflowApi(e, 'read', e.url.pathname.split('/').at(-1));
	});
	const options = {
		productId,
		operation: {
			kind: productId === 'date-reading' ? ('create-date' as const) : ('create-natal' as const),
			ownerId: owner
		},
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
	input: WorkflowInput;
	calculation: CalculationSnapshot | null;
	state: string;
	revision: number;
	parent_id: string | null;
}
function deterministicSnapshot(value: unknown) {
	expect(value).toMatchObject({
		status: 'experimental',
		facts: expect.any(Array),
		data: expect.any(Object)
	});
	const snapshot = structuredClone(value) as CalculationSnapshot;
	expect(snapshot.facts.length).toBeGreaterThan(0);
	const projections =
		snapshot.kind === 'cycles' ? [snapshot.data.first, snapshot.data.second] : [snapshot.data];
	for (const projection of projections) {
		const provenance = (projection as { provenance: Record<string, unknown> }).provenance;
		expect(provenance.calculatedAt).toEqual(expect.any(String));
		expect(Number.isFinite(Date.parse(String(provenance.calculatedAt)))).toBe(true);
		// Execution time is provenance, not an astronomical result. Keep every other field.
		provenance.calculatedAt = '<validated-execution-time>';
	}
	return snapshot;
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
			'select (select count(*) from product_runs) runs,(select count(*) from product_run_events) events,(select count(*) from library_items) items,((select count(*) from natal_product_requests)+(select count(*) from date_product_requests)) receipts'
		)
	).rows[0];
}
async function enable(productId: string) {
	// Local intake/calculation only: engine/editorial/artifact approval is never granted.
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
	expect(JSON.stringify(metrics)).not.toMatch(
		/1990|privad|runId|owner|latitude|longitude|timezone|token/
	);
}

it.each(['1900-01-01', '2028-02-29', '2099-12-31'])(
	'date-reading %s: persisted basis is one UTC sample, not birth-location noon or a local day',
	async (date) => {
		await save();
		await enable('date-reading');
		const s = browser('date-reading');
		expect((await s.client.perform(true, await command('date-reading', date))).href).toBeTruthy();
		await process('date-reading');
		const run = await stored();
		expect(run.input.targetDate).toBe(date);
		const calculation = run.calculation!;
		expect(calculation).toMatchObject({
			kind: 'cycles',
			status: 'experimental',
			data: {
				targetDate: date,
				sampleInstant: `${date}T12:00:00.000Z`,
				aspects: [],
				events: [],
				compatibilityScore: null,
				sharing: 'not-authorized',
				projection: {
					completeness: 'partial',
					interpretation: 'not-produced',
					dateSampling: 'one-instant-at-12:00:00Z/not-local-day/not-event-search'
				},
				first: { role: 'natal', provenance: { temporal: { utcInstant: birth.utcInstant } } },
				second: {
					role: 'sample',
					provenance: { temporal: { utcInstant: `${date}T12:00:00.000Z`, offsetSeconds: 0 } }
				}
			}
		});
		const independent = await new CaelusEphemerisProvider().calculate({
			localDateTime: `${date}T12:00:00`,
			utcInstant: `${date}T12:00:00Z`,
			timezone: 'UTC',
			latitude: 0,
			longitude: 0,
			locationSource: 'internal-geocentric-reference/no-local-houses'
		});
		const sample = calculation.data.second as Record<string, unknown>;
		expect(sample.positions).toEqual(independent.positions);
		expect(Object.keys(sample).sort()).toEqual(['positions', 'provenance', 'role']);
		expect(calculation.facts.map((f) => f.id)).toEqual([
			...bodies.map((body) => `natal-${body}`),
			...bodies.map((body) => `sample-${body}`),
			'sample-instant'
		]);
		expect(calculation.limits).toContain(
			'A data foi amostrada somente às 12:00 UTC. Não é meio-dia local, cobertura do dia, janela favorável, previsão ou busca de trânsito exato.'
		);
		expect(run.state).toBe('AWAITING_EDITORIAL');
		expect(await counts()).toEqual({ runs: 1, events: 3, items: 1, receipts: 1 });
	}
);

it('date-reading: an explicit second date creates a separate snapshot without modifying the original', async () => {
	await save();
	await enable('date-reading');
	const s = browser('date-reading');
	const firstResult = await s.client.perform(true, await command('date-reading'));
	const first = await stored();
	expect(s.client.startAnother().mode).toBe('new');
	const secondResult = await s.client.perform(true, await command('date-reading', '2028-03-01'));
	expect(secondResult.href).toMatch(/^\/biblioteca\/[0-9a-f-]{36}$/);
	expect(secondResult.href).not.toBe(firstResult.href);
	const rows = (await db.query<StoredRun>('select * from product_runs where id<>$1', [first.id]))
		.rows;
	expect(rows).toHaveLength(1);
	expect(rows[0].input).toEqual({ ...first.input, targetDate: '2028-03-01' });
	expect(await stored(first.id)).toEqual(first);
	expect(await counts()).toEqual({ runs: 2, events: 2, items: 2, receipts: 2 });
});

it.each(profileProducts)(
	'%s: consented profile → controller → SQL → deterministic calculation → pending Library',
	async (productId) => {
		await save();
		await enable(productId);
		const s = browser(productId),
			input = await command(productId);
		const result = await s.client.perform(true, input);
		expect(result.href).toMatch(/^\/biblioteca\/[0-9a-f-]{36}$/);
		const run = await stored();
		expect(run.input).toEqual({
			version: 'atv-workflow/1.0.0',
			productId,
			birth,
			consent,
			...(productId === 'date-reading' ? { targetDate } : {})
		});
		expect(run.state).toBe('QUEUED');
		const idle = vi.fn(workerRpc);
		expect(await createProductProcessor(idle).step()).toBe('idle');
		expect(await createProductPublisher(idle).step()).toBe('idle');
		expect(idle).not.toHaveBeenCalled();
		await process(productId);
		const calculated = await stored(run.id);
		expect(calculated).toMatchObject({ state: 'AWAITING_EDITORIAL', revision: 3, parent_id: null });
		const calculators =
			productId === 'date-reading' ? createContextCalculators() : createNatalCalculators();
		const expected = await calculators[productId](run.input, {
			signal: new AbortController().signal,
			runId: run.id
		});
		expect(deterministicSnapshot(calculated.calculation)).toEqual(deterministicSnapshot(expected));
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
		expect(JSON.stringify(library)).not.toMatch(
			/1990|privad|latitude|longitude|utcInstant|position-sun/
		);
		expect(
			(await workflowArtifacts(event(`/api/workflows/${run.id}/artifacts`), run.id)).status
		).toBe(404);
		expect(await counts()).toEqual({ runs: 1, events: 3, items: 1, receipts: 1 });
		expect((await db.query('select count(*) n from editorial_promotions')).rows).toEqual([
			{ n: 0 }
		]);
	}
);

it.each(profileProducts)(
	'%s: edit then forget cannot change queued snapshot; lost acknowledgement recovers without replay',
	async (productId) => {
		await save();
		await enable(productId);
		const s = browser(productId, true);
		expect((await s.client.perform(true, await command(productId))).mode).toBe('recover');
		const initial = await stored();
		await save(1, { latitude: 10, locationLabel: 'Outro local sintético' });
		await forget(2);
		await process(productId);
		const before = await stored(initial.id),
			totals = await counts();
		expect(before.input).toEqual(initial.input);
		expect(before.input.birth).toEqual(birth);
		await db.exec('update workflow_releases set enabled=false');
		const recovered = await createWorkflowRequest(s.options).perform(false);
		expect(recovered.href).toMatch(/^\/biblioteca\/[0-9a-f-]{36}$/);
		expect(await stored(initial.id)).toEqual(before);
		expect(await counts()).toEqual(totals);
		expect(s.fetcher.mock.calls.filter(([path]) => path === requestPath(productId))).toHaveLength(
			1
		);
		expect([...s.values.keys()]).toEqual([`atv-create:${owner}:${productId}`]);
		expect([...s.values.values()]).toEqual([expect.stringMatching(/^[0-9a-f-]{36}$/)]);
		expect((await db.query('select count(*) n from natal_profiles')).rows).toEqual([{ n: 0 }]);
	}
);

it.each(profileProducts)(
	'%s: session ownership fences profile, recovery, Library, calculation and downloads',
	async (productId) => {
		await save();
		await enable(productId);
		const s = browser(productId),
			result = await s.client.perform(true, await command(productId));
		const run = await stored();
		await process(productId);
		const profile = await onboardingApi(event('/api/onboarding', undefined, other), 'read');
		const profilePayload = (await profile.json()) as { onboarding: unknown };
		expect(profilePayload.onboarding).toMatchObject({
			revision: 0,
			state: 'NOT_STARTED',
			natal: null
		});
		const recovery = await recoverWorkflowRequest(
			event('/api/workflows/recover', { requestKey: [...s.values.values()][0] }, other)
		);
		expect(await recovery.json()).toEqual({ request: null });
		expect(
			(await workflowApi(event(`/api/workflows/${run.id}`, undefined, other), 'read', run.id))
				.status
		).toBe(404);
		const itemId = result.href!.split('/').at(-1)!;
		expect(await readLibraryResult(sessionClient(other), other, itemId)).toEqual({
			state: 'not-found'
		});
		expect(await readLibraryResult(sessionClient(other), owner, itemId)).toEqual({
			state: 'not-found'
		});
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

it.each(profileProducts)(
	'%s: stale revision and current release/entitlement refuse before persistence',
	async (productId) => {
		await save();
		const s = browser(productId),
			stale = await command(productId);
		await save(1, { latitude: 10 });
		await enable(productId);
		const conflict = await s.client.perform(true, stale);
		expect(conflict).toMatchObject({
			mode: 'new',
			message: expect.stringContaining('perfil mudou')
		});
		expect(s.values.size).toBe(0);
		expect(await counts()).toEqual({ runs: 0, events: 0, items: 0, receipts: 0 });
		const current = await command(productId);
		await db.exec('update workflow_releases set enabled=false');
		expect((await s.client.perform(true, current)).mode).toBe('new');
		await enable(productId);
		await db.query("update workflow_releases set access_policy='entitlement' where product_id=$1", [
			productId
		]);
		expect((await s.client.perform(true, current)).mode).toBe('new');
		expect(s.values.size).toBe(0);
		expect(await counts()).toEqual({ runs: 0, events: 0, items: 0, receipts: 0 });
	}
);

it.each(profileProducts)(
	'%s: explicit reprocessing recalculates parent snapshot, never the edited or forgotten profile',
	async (productId) => {
		await save();
		await enable(productId);
		const s = browser(productId);
		await s.client.perform(true, await command(productId));
		const first = await stored();
		await process(productId);
		const original = await stored(first.id);
		await save(1, { latitude: 10 });
		await forget(2);
		const response = await workflowApi(
			event(`/api/workflows/${first.id}/reprocess`, { requestKey: randomUUID() }),
			'reprocess',
			first.id
		);
		expect(response.status).toBe(202);
		const { runId } = (await response.json()) as { runId: string };
		expect(runId).not.toBe(first.id);
		expect(await stored(runId)).toMatchObject({
			parent_id: first.id,
			input: original.input,
			calculation: null,
			state: 'QUEUED'
		});
		await process(productId);
		expect(deterministicSnapshot((await stored(runId)).calculation)).toEqual(
			deterministicSnapshot(original.calculation)
		);
		expect(await stored(first.id)).toEqual(original);
		expect(await counts()).toEqual({ runs: 2, events: 6, items: 2, receipts: 1 });
	}
);

it.each(profileProducts)(
	'%s: precision downgrade between read and submission never creates an exact run',
	async (productId) => {
		await save();
		await enable(productId);
		const s = browser(productId),
			original = await command(productId);
		await save(1, { timePrecision: 'APPROXIMATE' });
		expect((await s.client.perform(true, original)).mode).toBe('new');
		const response = await requestApi(productId)(
			event(requestPath(productId), {
				requestKey: randomUUID(),
				input: { ...original, expectedRevision: 2 }
			})
		);
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: 'exact_time_required' });
		expect(await counts()).toEqual({ runs: 0, events: 0, items: 0, receipts: 0 });
	}
);
