import { expect, it, vi } from 'vitest';
import { createWorkflowRequest } from './workflow-request';
import { natalProducts, NATAL_REQUEST_VERSION } from './natal-request';
const owner = '20000000-0000-4000-8000-000000000001';
const key = '20000000-0000-4000-8000-000000000002';
const id = '20000000-0000-4000-8000-000000000003';
const library = '20000000-0000-4000-8000-000000000004';
const at = '2026-09-25T12:00:00Z';
const command = (productId = 'birth-chart') => ({
	version: NATAL_REQUEST_VERSION,
	productId,
	expectedRevision: 2,
	consent: {
		storage: true,
		policyVersion: 'atv-input-consent/1',
		partner: false,
		continuity: false
	}
});
function setup(productId = 'birth-chart', previous?: string) {
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
		operation: { kind: 'create-natal' as const, ownerId: owner },
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
	return { values, slot, options, fetcher, found, run, client: createWorkflowRequest(options) };
}
it.each(natalProducts)(
	'%s sends only the reviewed command after preserving UUID',
	async (productId) => {
		const s = setup(productId);
		s.fetcher.mockImplementationOnce(async () => {
			expect([...s.values]).toEqual([[s.slot, key]]);
			return Response.json({ runId: id }, { status: 202 });
		});
		s.found();
		expect(await s.client.perform(true, command(productId))).toMatchObject({
			href: `/biblioteca/${library}`
		});
		expect(s.fetcher.mock.calls.map(([url]) => url)).toEqual([
			'/api/workflows/natal',
			'/api/workflows/recover',
			`/api/workflows/${id}`
		]);
		expect(JSON.parse(String(s.fetcher.mock.calls[0][1]?.body))).toEqual({
			requestKey: key,
			input: command(productId)
		});
		expect(s.client.startAnother().mode).toBe('new');
		expect(s.values.size).toBe(0);
	}
);
it.each([
	undefined,
	{ ...command(), expectedRevision: 0 },
	{ ...command(), birth: {} },
	{ ...command(), consent: { storage: true } },
	command('daily-card'),
	{ ...command(), expectedRevision: 2.1 }
])('rejects malformed/forged commands before key allocation %#', async (input) => {
	const s = setup();
	expect((await s.client.perform(true, input)).mode).toBe('new');
	expect(s.fetcher).not.toHaveBeenCalled();
	expect(s.options.randomUUID).not.toHaveBeenCalled();
});
it('no creation without access or supported product', async () => {
	const s = setup();
	await s.client.perform(false, command());
	expect(s.fetcher).not.toHaveBeenCalled();
	const unsupported = setup('daily-card');
	expect((await unsupported.client.perform(true, command('daily-card'))).mode).toBe('blocked');
	expect(unsupported.fetcher).not.toHaveBeenCalled();
});
it('lost acknowledgement, reload and changed profile only read the original request', async () => {
	const s = setup();
	s.fetcher.mockRejectedValueOnce(new Error('offline'));
	expect((await s.client.perform(true, command())).mode).toBe('recover');
	const reloaded = createWorkflowRequest(s.options);
	s.found();
	expect((await reloaded.perform(false, { ...command(), expectedRevision: 50 })).href).toBe(
		`/biblioteca/${library}`
	);
	expect(s.fetcher.mock.calls.filter(([url]) => url === '/api/workflows/natal')).toHaveLength(1);
});
it.each([
	'revision_conflict',
	'exact_time_required',
	'natal_profile_required',
	'profile_unavailable'
])('only exact pre-write natal refusal %s releases new key', async (error) => {
	const s = setup();
	s.fetcher.mockResolvedValueOnce(Response.json({ error }, { status: 409 }));
	expect((await s.client.perform(true, command())).mode).toBe('new');
	expect(s.values.size).toBe(0);
});
it.each(['idempotency_conflict', 'workflow_unavailable', 'unknown'])(
	'uncertain %s keeps key and forbids another request',
	async (error) => {
		const s = setup();
		s.fetcher.mockResolvedValueOnce(Response.json({ error }, { status: 409 }));
		expect((await s.client.perform(true, command())).mode).toBe('recover');
		expect(s.values.size).toBe(1);
		expect(s.client.startAnother().mode).toBe('recover');
	}
);
it('natal-only refusals cannot clear a generic request key', async () => {
	const s = setup();
	s.fetcher.mockResolvedValueOnce(Response.json({ error: 'revision_conflict' }, { status: 409 }));
	const generic = createWorkflowRequest({
		...s.options,
		operation: { kind: 'create', ownerId: owner },
		productId: 'daily-card'
	});
	expect(
		(
			await generic.perform(true, {
				version: 'atv-workflow/1.0.0',
				productId: 'daily-card',
				questions: ['Pergunta?'],
				consent: command().consent
			})
		).mode
	).toBe('recover');
	expect(s.values.size).toBe(1);
});
it('does not confuse a reprocessed child with the requested root', async () => {
	const s = setup('birth-chart', key);
	s.run.parentId = id as unknown as null;
	s.found();
	expect((await s.client.perform(false)).href).toBeUndefined();
	expect(s.values.size).toBe(1);
});
