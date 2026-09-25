import { describe, expect, it, vi } from 'vitest';
import { WORKFLOW_VERSION } from '@atv/domain';
import { createWorkflowRequest } from './workflow-request';

const owner = '20000000-0000-4000-8000-000000000001';
const id = '20000000-0000-4000-8000-000000000002';
const library = '20000000-0000-4000-8000-000000000003';
const key = '20000000-0000-4000-8000-000000000004';
const nextKey = '20000000-0000-4000-8000-000000000005';
const productId = 'daily-card';
const name = `atv-create:${owner}:${productId}`;
const date = '2026-09-25T12:00:00Z';
const consent = {
	storage: true,
	policyVersion: 'atv-input-consent/1',
	partner: false,
	continuity: false
};
const input = {
	version: WORKFLOW_VERSION,
	productId,
	consent,
	questions: ['Como cuidar da minha atenção?']
};
const request = { runId: id, productId, libraryItemId: library };
const run = {
	id,
	productId,
	parentId: null,
	libraryItemId: library,
	state: 'QUEUED',
	revision: 1,
	createdAt: date,
	updatedAt: date,
	released: false,
	canReprocess: false,
	calculation: null,
	editorial: null,
	history: [{ revision: 1, state: 'QUEUED', at: date }]
};
const json = (body: unknown, status = 200) => Response.json(body, { status });
function setup(previous?: string) {
	const values = new Map<string, string>(previous === undefined ? [] : [[name, previous]]);
	const storage = {
		getItem: vi.fn((id: string) => values.get(id) ?? null),
		setItem: vi.fn((id: string, value: string) => {
			values.set(id, value);
		}),
		removeItem: vi.fn((id: string) => {
			values.delete(id);
		})
	};
	const fetcher = vi.fn<typeof fetch>();
	const randomUUID = vi.fn(() => key);
	const options = {
		operation: { kind: 'create' as const, ownerId: owner },
		productId,
		storage,
		fetch: fetcher,
		randomUUID
	};
	return { values, storage, fetcher, randomUUID, options, client: createWorkflowRequest(options) };
}
function found(s: ReturnType<typeof setup>, root = run) {
	s.fetcher.mockResolvedValueOnce(json({ request })).mockResolvedValueOnce(json({ run: root }));
}

describe('first submission recovery without replay or personal browser persistence', () => {
	it('saves only a UUID before the bounded POST and requires a root reader before linking', async () => {
		const s = setup();
		s.fetcher.mockImplementationOnce(async () => {
			expect([...s.values]).toEqual([[name, key]]);
			return json({ runId: id }, 202);
		});
		found(s);
		expect(await s.client.perform(true, input)).toMatchObject({
			mode: 'recover',
			href: `/biblioteca/${library}`
		});
		expect(s.fetcher.mock.calls.map(([url]) => url)).toEqual([
			'/api/workflows',
			'/api/workflows/recover',
			`/api/workflows/${id}`
		]);
		expect(JSON.parse(String(s.fetcher.mock.calls[0][1]?.body))).toEqual({
			requestKey: key,
			input
		});
		expect(JSON.parse(String(s.fetcher.mock.calls[1][1]?.body))).toEqual({ requestKey: key });
		for (const [url, init] of s.fetcher.mock.calls) {
			expect(String(url)).not.toContain(key);
			expect(init).toMatchObject({ credentials: 'same-origin', cache: 'no-store' });
			expect(init?.signal).toBeInstanceOf(AbortSignal);
		}
		expect([...s.values]).toEqual([[name, key]]);
		expect(s.storage.removeItem).not.toHaveBeenCalled();
	});
	it('lost acknowledgement reload only reads, even with changed or missing form input', async () => {
		const s = setup();
		s.fetcher.mockRejectedValueOnce(new TypeError('offline'));
		expect((await s.client.perform(true, input)).mode).toBe('recover');
		const reloaded = createWorkflowRequest(s.options);
		expect(reloaded.inspect().mode).toBe('recover');
		found(s);
		expect((await reloaded.perform(false)).href).toBe(`/biblioteca/${library}`);
		s.fetcher.mockResolvedValueOnce(json({ request: null }));
		expect(
			(await reloaded.perform(true, { ...input, questions: ['Outra pergunta'] })).href
		).toBeUndefined();
		expect(s.fetcher.mock.calls.filter(([url]) => url === '/api/workflows')).toHaveLength(1);
		expect(s.randomUUID).toHaveBeenCalledTimes(1);
	});
	it('release denied and invalid identities never allocate a key or send', async () => {
		const s = setup();
		expect((await s.client.perform(false, input)).mode).toBe('new');
		for (const options of [
			{ ...s.options, productId: 'invented' },
			{ ...s.options, operation: { kind: 'create' as const, ownerId: 'bad' } }
		])
			expect((await createWorkflowRequest(options).perform(true, input)).mode).toBe('blocked');
		expect(s.fetcher).not.toHaveBeenCalled();
		expect(s.randomUUID).not.toHaveBeenCalled();
	});
	it.each([
		undefined,
		null,
		{},
		{ ...input, productId: 'dream-reading' },
		{ ...input, consent: { ...consent, storage: false } },
		{ ...input, consent: { ...consent, continuity: undefined } },
		{ ...input, consent: { ...consent, partner: true } },
		{ ...input, consent: { ...consent, policyVersion: 'old' } },
		{ ...input, questions: [''] },
		{ ...input, questions: ['x'.repeat(401)] },
		{ ...input, questions: ['one', 'two'] },
		{ ...input, unknown: true },
		{ ...input, context: 'x'.repeat(1201) }
	])('rejects invalid input/consent before persistence or transport %#', async (value) => {
		const s = setup();
		expect((await s.client.perform(true, value)).mode).toBe('new');
		expect(s.fetcher).not.toHaveBeenCalled();
		expect(s.storage.setItem).not.toHaveBeenCalled();
	});
	it('enforces bytes, not characters, before saving a key', async () => {
		const s = setup();
		const client = createWorkflowRequest({ ...s.options, productId: 'dream-reading' });
		const dream = {
			date: '2026-09-25',
			narrative: '界'.repeat(6000),
			associations: ['界'.repeat(200)],
			emotions: []
		};
		const value = {
			version: WORKFLOW_VERSION,
			productId: 'dream-reading',
			consent,
			dream,
			context: '界'.repeat(1200)
		};
		expect(await client.perform(true, value)).toMatchObject({
			mode: 'new',
			message: expect.stringContaining('limite')
		});
		expect(s.fetcher).not.toHaveBeenCalled();
		expect(s.storage.setItem).not.toHaveBeenCalled();
	});
	it.each([true, false])(
		'preserves explicit continuity consent (%s) and dream facts without inference',
		async (continuity) => {
			const s = setup();
			const client = createWorkflowRequest({ ...s.options, productId: 'dream-journal' });
			const dream = {
				date: '2026-09-25',
				narrative: 'Vi uma casa azul.',
				associations: ['Casa da infância'],
				emotions: ['Curiosidade']
			};
			const value = {
				version: WORKFLOW_VERSION,
				productId: 'dream-journal',
				consent: { ...consent, continuity },
				dream
			};
			s.fetcher.mockResolvedValueOnce(json({}, 503));
			await client.perform(true, value);
			expect(JSON.parse(String(s.fetcher.mock.calls[0][1]?.body))).toEqual({
				requestKey: key,
				input: value
			});
			expect([...s.values]).toEqual([[`atv-create:${owner}:dream-journal`, key]]);
		}
	);
	it('snapshots the input before transport, without holding a replayable draft', async () => {
		const s = setup();
		const draft = structuredClone(input);
		s.fetcher.mockImplementationOnce(async () => {
			draft.questions[0] = 'changed after send';
			return json({}, 503);
		});
		await s.client.perform(true, draft);
		expect(JSON.parse(String(s.fetcher.mock.calls[0][1]?.body)).input).toEqual(input);
		s.fetcher.mockResolvedValueOnce(json({ request: null }));
		await s.client.perform(true, draft);
		expect(s.fetcher.mock.calls[1][1]?.body).toBe(JSON.stringify({ requestKey: key }));
	});
	it.each([401, 403, 404, 409, 429, 500, 503])(
		'lookup %i cannot clear a pending key',
		async (status) => {
			const s = setup(key);
			s.fetcher.mockResolvedValue(json({ error: 'auth_required' }, status));
			expect((await s.client.perform(true, input)).href).toBeUndefined();
			expect(s.client.startAnother().mode).toBe('recover');
			expect(s.values.get(name)).toBe(key);
			expect(s.fetcher).toHaveBeenCalledTimes(1);
		}
	);
	it.each([
		{ request: null },
		{},
		{ request, extra: true },
		{ request: { ...request, productId: 'three-questions' } },
		{ request: { ...request, runId: 'bad' } },
		{ request: { ...request, libraryItemId: null } },
		{ request: { ...request, href: 'https://evil.invalid' } }
	])(
		'malformed, missing or archived lookup cannot authorize a new submission %#',
		async (payload) => {
			const s = setup(key);
			s.fetcher.mockResolvedValue(json(payload));
			await s.client.perform(false);
			expect(s.client.startAnother().mode).toBe('recover');
			expect(s.values.get(name)).toBe(key);
			expect(s.storage.removeItem).not.toHaveBeenCalled();
		}
	);
	it.each([
		{ ...run, parentId: owner },
		{ ...run, id: owner },
		{ ...run, productId: 'three-questions' },
		{ ...run, libraryItemId: owner },
		{ ...run, history: [] }
	])('requires the root lineage, exact product and Library reference %#', async (value) => {
		const s = setup(key);
		found(s, value as typeof run);
		expect((await s.client.perform(false)).href).toBeUndefined();
		expect(s.client.startAnother().mode).toBe('recover');
	});
	it('rejects acknowledgement/lookup disagreement', async () => {
		const s = setup();
		s.fetcher.mockResolvedValueOnce(json({ runId: owner }, 202));
		found(s);
		expect((await s.client.perform(true, input)).href).toBeUndefined();
		expect(s.fetcher).toHaveBeenCalledTimes(2);
	});
	it.each(['get', 'set', 'verify', 'corrupt', 'uuid'] as const)(
		'storage or identity failure %s blocks before transport',
		async (failure) => {
			const s = setup(failure === 'corrupt' ? 'invalid' : undefined);
			if (failure === 'get')
				s.storage.getItem.mockImplementation(() => {
					throw Error('denied');
				});
			if (failure === 'set')
				s.storage.setItem.mockImplementation(() => {
					throw Error('denied');
				});
			if (failure === 'verify') s.storage.setItem.mockImplementation(() => {});
			if (failure === 'uuid') s.randomUUID.mockReturnValue('bad');
			expect((await s.client.perform(true, input)).mode).toBe('blocked');
			expect(s.fetcher).not.toHaveBeenCalled();
		}
	);
	it.each([null, nextKey])(
		'observed replacement/removal %s blocks another write',
		async (replacement) => {
			const s = setup();
			s.fetcher.mockRejectedValueOnce(Error('offline'));
			await s.client.perform(true, input);
			if (replacement === null) s.values.delete(name);
			else s.values.set(name, replacement);
			expect((await s.client.perform(true, input)).mode).toBe('blocked');
			expect(s.fetcher).toHaveBeenCalledTimes(1);
		}
	);
	it('does not erase a replacement key when a refusal arrives late', async () => {
		const s = setup();
		s.fetcher.mockImplementationOnce(async () => {
			s.values.set(name, nextKey);
			return json({ error: 'workflow_unreleased' }, 409);
		});
		expect((await s.client.perform(true, input)).mode).toBe('blocked');
		expect(s.values.get(name)).toBe(nextKey);
		expect(s.storage.removeItem).not.toHaveBeenCalled();
	});
	it.each([
		[409, 'workflow_unreleased'],
		[403, 'entitlement_required'],
		[429, 'request_limit'],
		[400, 'invalid_input'],
		[401, 'auth_required'],
		[403, 'same_origin_required']
	])('known exact refusal %s/%s permits correcting a fresh request', async (status, error) => {
		const s = setup();
		s.fetcher.mockResolvedValueOnce(json({ error }, status as number));
		expect((await s.client.perform(true, input)).mode).toBe('new');
		expect(s.values.has(name)).toBe(false);
	});
	it.each([
		[409, { error: 'idempotency_conflict' }],
		[409, { error: 'parent_not_reprocessable' }],
		[503, { error: 'workflow_unreleased' }],
		[409, { error: 'workflow_unreleased', extra: true }],
		[202, { runId: 'bad' }],
		[202, { runId: id, extra: true }]
	])('ambiguous first response %# retains the key', async (status, payload) => {
		const s = setup();
		s.fetcher.mockResolvedValueOnce(json(payload, status as number));
		expect((await s.client.perform(true, input)).mode).toBe('recover');
		expect(s.values.get(name)).toBe(key);
	});
	it('requires explicit startAnother after verified recovery, never on acknowledgement alone', async () => {
		const s = setup();
		s.fetcher
			.mockResolvedValueOnce(json({ runId: id }, 202))
			.mockResolvedValueOnce(json({ request: null }));
		await s.client.perform(true, input);
		expect(s.client.startAnother().mode).toBe('recover');
		found(s);
		await s.client.perform(false);
		expect(s.client.startAnother().mode).toBe('new');
		expect(s.fetcher).toHaveBeenCalledTimes(4);
		expect(s.values.has(name)).toBe(false);
		s.randomUUID.mockReturnValueOnce(nextKey);
		s.fetcher.mockResolvedValueOnce(json({}, 503));
		await s.client.perform(true, input);
		expect(s.values.get(name)).toBe(nextKey);
		expect(s.fetcher.mock.calls.filter(([url]) => url === '/api/workflows')).toHaveLength(2);
	});
	it.each(['throws', 'no-op', 'changed'] as const)(
		'failed explicit reset %s preserves recovery or blocks',
		async (failure) => {
			const s = setup(key);
			found(s);
			await s.client.perform(false);
			if (failure === 'throws')
				s.storage.removeItem.mockImplementation(() => {
					throw Error('denied');
				});
			if (failure === 'no-op') s.storage.removeItem.mockImplementation(() => {});
			if (failure === 'changed') s.values.set(name, nextKey);
			expect(s.client.startAnother().mode).not.toBe('new');
			expect(s.values.has(name)).toBe(true);
		}
	);
	it('duplicate activation and reset while pending cannot issue or prepare another write', async () => {
		const s = setup();
		let finish!: (value: Response) => void;
		s.fetcher.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				})
		);
		const first = s.client.perform(true, input);
		await s.client.perform(true, input);
		expect(s.client.startAnother().mode).toBe('recover');
		expect(s.fetcher).toHaveBeenCalledTimes(1);
		finish(json({}, 503));
		await first;
	});
	it('another owner does not reuse the previous owner pending slot', async () => {
		const s = setup(key);
		const client = createWorkflowRequest({
			...s.options,
			operation: { kind: 'create', ownerId: id }
		});
		expect(client.inspect().mode).toBe('new');
		await client.perform(false);
		expect(s.fetcher).not.toHaveBeenCalled();
		expect(s.values.get(name)).toBe(key);
	});
});
