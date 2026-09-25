import { expect, it, vi } from 'vitest';
import { createWorkflowRequest } from './workflow-request';
import { DATE_REQUEST_VERSION } from './date-request';
const owner = '30000000-0000-4000-8000-000000000001';
const key = '30000000-0000-4000-8000-000000000002';
const id = '30000000-0000-4000-8000-000000000003';
const library = '30000000-0000-4000-8000-000000000004';
const productId = 'date-reading';
const at = '2026-09-25T12:00:00Z';
const command = () => ({
	version: DATE_REQUEST_VERSION,
	productId,
	expectedRevision: 2,
	targetDate: '2028-02-29',
	consent: {
		storage: true,
		policyVersion: 'atv-input-consent/1',
		partner: false,
		continuity: false
	}
});
function setup(previous?: string) {
	const slot = `atv-create:${owner}:${productId}`;
	const values = new Map<string, string>(previous ? [[slot, previous]] : []);
	const storage = {
		getItem: (k: string) => values.get(k) ?? null,
		setItem: (k: string, v: string) => {
			values.set(k, v);
		},
		removeItem: (k: string) => {
			values.delete(k);
		}
	};
	const fetcher = vi.fn<typeof fetch>();
	const options = {
		operation: { kind: 'create-date' as const, ownerId: owner },
		productId,
		storage,
		fetch: fetcher,
		randomUUID: vi.fn(() => key)
	};
	const run = {
		id,
		productId,
		parentId: null,
		libraryItemId: library,
		state: 'QUEUED',
		revision: 1,
		createdAt: at,
		updatedAt: at,
		released: false,
		canReprocess: false,
		calculation: null,
		editorial: null,
		history: [{ revision: 1, state: 'QUEUED', at }]
	};
	const found = () =>
		fetcher
			.mockResolvedValueOnce(
				Response.json({ request: { runId: id, productId, libraryItemId: library } })
			)
			.mockResolvedValueOnce(Response.json({ run }));
	return { slot, values, options, fetcher, run, found, client: createWorkflowRequest(options) };
}
it('preserves only UUID before sending reviewed revision/date and verifies Library before linking', async () => {
	const s = setup();
	s.fetcher.mockImplementationOnce(async (url, init) => {
		expect(url).toBe('/api/workflows/date');
		expect([...s.values]).toEqual([[s.slot, key]]);
		expect(JSON.parse(init?.body as string)).toEqual({ requestKey: key, input: command() });
		return Response.json({ runId: id }, { status: 202 });
	});
	s.found();
	expect((await s.client.perform(true, command())).href).toBe(`/biblioteca/${library}`);
	expect(s.client.startAnother().mode).toBe('new');
	expect(s.values.size).toBe(0);
});
it.each([
	'2027-02-29',
	'1900-02-29',
	'2028-04-31',
	'1899-12-31',
	'2100-01-01',
	'2028-2-29',
	'2028-02-29T12:00:00Z',
	''
])('refuses date %s before storing or writing', async (targetDate) => {
	const s = setup();
	expect((await s.client.perform(true, { ...command(), targetDate })).mode).toBe('new');
	expect(s.fetcher).not.toHaveBeenCalled();
	expect(s.options.randomUUID).not.toHaveBeenCalled();
	expect(s.values.size).toBe(0);
});
it.each([
	{ expectedRevision: 0 },
	{ birth: {} },
	{ timezone: 'UTC' },
	{ targetDate: undefined },
	{ productId: 'solar-return' },
	{ consent: { ...command().consent, continuity: true } }
])('refuses unsupported command %# without a write', async (change) => {
	const s = setup();
	expect((await s.client.perform(true, { ...command(), ...change })).mode).toBe('new');
	expect(s.fetcher).not.toHaveBeenCalled();
	expect(s.values.size).toBe(0);
});
it('recovers after lost response even when profile and date are gone; never replays', async () => {
	const s = setup();
	s.fetcher.mockRejectedValueOnce(new Error('lost acknowledgement'));
	expect((await s.client.perform(true, command())).mode).toBe('recover');
	const reloaded = createWorkflowRequest(s.options);
	s.found();
	expect((await reloaded.perform(false)).href).toBe(`/biblioteca/${library}`);
	expect(s.fetcher.mock.calls.map(([url]) => url)).toEqual([
		'/api/workflows/date',
		'/api/workflows/recover',
		`/api/workflows/${id}`
	]);
	expect([...s.values]).toEqual([[s.slot, key]]);
});
it.each([
	'revision_conflict',
	'exact_time_required',
	'natal_profile_required',
	'profile_unavailable'
])('exact pre-write refusal %s allows fresh profile review', async (error) => {
	const s = setup();
	s.fetcher.mockResolvedValueOnce(Response.json({ error }, { status: 409 }));
	expect((await s.client.perform(true, command())).mode).toBe('new');
	expect(s.values.size).toBe(0);
});
it.each([
	{ error: 'revision_conflict', status: 503 },
	{ error: 'idempotency_conflict', status: 409 },
	{ error: 'workflow_unavailable', status: 503 }
])('uncertainty %# preserves key and disallows another submission', async ({ error, status }) => {
	const s = setup();
	s.fetcher.mockResolvedValueOnce(Response.json({ error }, { status }));
	expect((await s.client.perform(true, command())).mode).toBe('recover');
	expect(s.client.startAnother().mode).toBe('recover');
	expect([...s.values]).toEqual([[s.slot, key]]);
});
it('rejects unrelated product before any network or storage write', async () => {
	const s = setup();
	const wrong = createWorkflowRequest({ ...s.options, productId: 'birth-chart' });
	expect((await wrong.perform(true, command())).mode).toBe('blocked');
	expect(s.fetcher).not.toHaveBeenCalled();
	expect(s.values.size).toBe(0);
});
it('does not link a reprocessed child as original date request', async () => {
	const s = setup(key);
	s.run.parentId = id as unknown as null;
	s.found();
	expect((await s.client.perform(false)).href).toBeUndefined();
	expect(s.values.size).toBe(1);
});
