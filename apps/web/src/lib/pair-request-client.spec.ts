import { expect, it, vi } from 'vitest';
import { createWorkflowRequest } from './workflow-request';
import { PAIR_REQUEST_VERSION } from './pair-request';
const owner = '40000000-0000-4000-8000-000000000001';
const key = '40000000-0000-4000-8000-000000000002';
const id = '40000000-0000-4000-8000-000000000003';
const library = '40000000-0000-4000-8000-000000000004';
const productId = 'pair-preview';
const command = () => ({
	version: PAIR_REQUEST_VERSION,
	productId,
	expectedRevision: 2,
	partner: {
		localDateTime: '2000-02-29T10:00:00',
		utcInstant: '2000-02-29T10:00:00Z',
		timezone: 'UTC',
		latitude: 51.5,
		longitude: -0.12,
		locationSource: 'manual-partner/1',
		timePrecision: 'EXACT'
	},
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
	}
});
function setup() {
	const slot = `atv-create:${owner}:${productId}`;
	const values = new Map<string, string>();
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
		operation: { kind: 'create-pair' as const, ownerId: owner },
		productId,
		storage,
		fetch: fetcher,
		randomUUID: vi.fn(() => key)
	};
	const at = '2026-09-25T12:00:00Z';
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
	return { slot, values, options, fetcher, found, client: createWorkflowRequest(options) };
}
it('sends only minimal third-party command and stores only UUID before verifying Library', async () => {
	const s = setup();
	s.fetcher.mockImplementationOnce(async (url, init) => {
		expect(url).toBe('/api/workflows/pair');
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
	{ partnerConsent: null },
	{ partnerConsent: { ...command().partnerConsent, sharing: true } },
	{ consent: { ...command().consent, partner: false } },
	{ partner: { ...command().partner, timePrecision: 'UNKNOWN' } },
	{ partner: { ...command().partner, name: 'synthetic' } },
	{ ownerId: owner },
	{ expectedRevision: 0 },
	{ productId: 'natal-snapshot' }
])('refuses malformed command without storing or sending %#', async (change) => {
	const s = setup();
	expect((await s.client.perform(true, { ...command(), ...change })).mode).toBe('new');
	expect(s.fetcher).not.toHaveBeenCalled();
	expect(s.options.randomUUID).not.toHaveBeenCalled();
	expect(s.values.size).toBe(0);
});
it('recovers after lost acknowledgement without input or replay', async () => {
	const s = setup();
	s.fetcher.mockRejectedValueOnce(new Error('lost'));
	expect((await s.client.perform(true, command())).mode).toBe('recover');
	s.found();
	expect((await createWorkflowRequest(s.options).perform(false)).href).toBe(
		`/biblioteca/${library}`
	);
	expect(s.fetcher.mock.calls.map(([url]) => url)).toEqual([
		'/api/workflows/pair',
		'/api/workflows/recover',
		`/api/workflows/${id}`
	]);
	expect(JSON.parse(s.fetcher.mock.calls[1][1]?.body as string)).toEqual({ requestKey: key });
});
it.each([
	'revision_conflict',
	'natal_profile_required',
	'exact_time_required',
	'profile_unavailable'
])('releases UUID only on exact pre-write rejection %s', async (error) => {
	const s = setup();
	s.fetcher.mockResolvedValueOnce(Response.json({ error }, { status: 409 }));
	expect((await s.client.perform(true, command())).mode).toBe('new');
	expect(s.values.size).toBe(0);
});
it('keeps UUID on unknown backend failure and refuses mismatched operation product', async () => {
	const s = setup();
	s.fetcher.mockResolvedValueOnce(Response.json({ error: 'PRIVATE' }, { status: 503 }));
	expect((await s.client.perform(true, command())).message).not.toContain('PRIVATE');
	expect(s.values.get(s.slot)).toBe(key);
	expect(createWorkflowRequest({ ...s.options, productId: 'date-reading' }).inspect().mode).toBe(
		'blocked'
	);
});
