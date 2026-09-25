import { describe, expect, it, vi } from 'vitest';
import { createReprocessRequest } from './reprocess-request';

const parent = '10000000-0000-4000-8000-000000000001';
const child = '10000000-0000-4000-8000-000000000002';
const library = '10000000-0000-4000-8000-000000000003';
const key = '10000000-0000-4000-8000-000000000004';
const name = `atv-reprocess:${parent}`;
const productId = 'daily-card';
const date = '2026-09-25T12:00:00Z';
const request = { runId: child, productId, libraryItemId: library };
const run = {
	id: child,
	productId,
	parentId: parent,
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
	const options = { runId: parent, productId, storage, fetch: fetcher, randomUUID };
	return { values, storage, fetcher, randomUUID, options, client: createReprocessRequest(options) };
}

describe('owner reprocessing recovery without automatic replay', () => {
	it.each([null, parent])(
		'detects externally changed storage after an uncertain write: %s',
		async (replacement) => {
			const s = setup();
			s.fetcher.mockRejectedValueOnce(new TypeError('offline'));
			await s.client.perform(true);
			if (replacement === null) s.values.delete(name);
			else s.values.set(name, replacement);
			expect((await s.client.perform(true)).mode).toBe('blocked');
			expect(s.fetcher).toHaveBeenCalledTimes(1);
			expect(s.randomUUID).toHaveBeenCalledTimes(1);
		}
	);
	it('persists only the UUID before sending; verifies child lineage before navigating', async () => {
		const s = setup();
		s.fetcher
			.mockImplementationOnce(async () => {
				expect([...s.values]).toEqual([[name, key]]);
				return json({ runId: child }, 202);
			})
			.mockResolvedValueOnce(json({ request }))
			.mockResolvedValueOnce(json({ run }));
		expect(await s.client.perform(true)).toMatchObject({
			mode: 'recover',
			href: `/biblioteca/${library}`
		});
		expect(s.fetcher.mock.calls.map(([url]) => url)).toEqual([
			`/api/workflows/${parent}/reprocess`,
			'/api/workflows/recover',
			`/api/workflows/${child}`
		]);
		for (const [, init] of s.fetcher.mock.calls) {
			expect(init).toMatchObject({ credentials: 'same-origin', cache: 'no-store' });
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			if (init?.method === 'POST')
				expect(JSON.parse(String(init.body))).toEqual({ requestKey: key });
		}
		expect(s.storage.removeItem).not.toHaveBeenCalled();
	});
	it('lost acknowledgement survives controller recreation/reload without another create', async () => {
		const s = setup();
		s.fetcher.mockRejectedValueOnce(new TypeError('offline'));
		expect(await s.client.perform(true)).toMatchObject({ mode: 'recover' });
		const reloaded = createReprocessRequest(s.options);
		expect(reloaded.inspect().mode).toBe('recover');
		s.fetcher.mockResolvedValueOnce(json({ request })).mockResolvedValueOnce(json({ run }));
		expect((await reloaded.perform(false)).href).toBe(`/biblioteca/${library}`);
		expect(s.randomUUID).toHaveBeenCalledTimes(1);
		expect(s.fetcher.mock.calls.filter(([url]) => String(url).endsWith('/reprocess'))).toHaveLength(
			1
		);
	});
	it('null remains uncertain after repeated manual lookup even if release is allowed', async () => {
		const s = setup(key);
		s.fetcher.mockImplementation(async () => json({ request: null }));
		for (let i = 0; i < 3; i++) {
			expect(await s.client.perform(true)).toMatchObject({
				mode: 'recover',
				message: expect.stringContaining('em andamento')
			});
		}
		expect(s.fetcher.mock.calls.every(([url]) => url === '/api/workflows/recover')).toBe(true);
		expect(s.randomUUID).not.toHaveBeenCalled();
		expect(s.values.get(name)).toBe(key);
	});
	it.each([401, 403, 404, 409, 429, 500, 503])(
		'lookup %i never forgets or replays',
		async (status) => {
			const s = setup(key);
			s.fetcher.mockResolvedValue(json({ error: 'auth_required' }, status));
			expect(await s.client.perform(true)).toMatchObject({ mode: 'recover' });
			expect(s.storage.removeItem).not.toHaveBeenCalled();
			expect(s.fetcher).toHaveBeenCalledTimes(1);
		}
	);
	it.each([
		{},
		{ request: { ...request, productId: 'birth-chart' } },
		{ request: { ...request, runId: 'bad' } },
		{ request, extra: true },
		{ request: { ...request, href: 'https://evil.invalid' } },
		{ request: { ...request, libraryItemId: null } }
	])('does not navigate from malformed or archived lookup %#', async (payload) => {
		const s = setup(key);
		s.fetcher.mockResolvedValue(json(payload));
		expect((await s.client.perform(true)).href).toBeUndefined();
		expect(s.fetcher).toHaveBeenCalledTimes(1);
		expect(s.values.get(name)).toBe(key);
	});
	it.each([
		{ ...run, parentId: null },
		{ ...run, parentId: child },
		{ ...run, id: parent },
		{ ...run, productId: 'birth-chart' },
		{ ...run, libraryItemId: parent },
		{ ...run, history: [] }
	])('requires valid child reader and exact lineage %#', async (value) => {
		const s = setup(key);
		s.fetcher.mockResolvedValueOnce(json({ request })).mockResolvedValueOnce(json({ run: value }));
		expect((await s.client.perform(false)).href).toBeUndefined();
		expect(s.values.get(name)).toBe(key);
	});
	it('rejects a lookup that disagrees with the acknowledged run', async () => {
		const s = setup();
		s.fetcher
			.mockResolvedValueOnce(json({ runId: parent }, 202))
			.mockResolvedValueOnce(json({ request }));
		expect((await s.client.perform(true)).href).toBeUndefined();
		expect(s.fetcher).toHaveBeenCalledTimes(2);
	});
	it.each(['get', 'set', 'verify', 'corrupt', 'uuid'] as const)(
		'storage/identity %s blocks before transport',
		async (failure) => {
			const s = setup(failure === 'corrupt' ? 'not-a-key' : undefined);
			if (failure === 'get')
				s.storage.getItem.mockImplementation(() => {
					throw Error('denied');
				});
			if (failure === 'set')
				s.storage.setItem.mockImplementation(() => {
					throw Error('quota');
				});
			if (failure === 'verify') s.storage.setItem.mockImplementation(() => {});
			if (failure === 'uuid') s.randomUUID.mockReturnValue('bad');
			expect((await s.client.perform(true)).mode).toBe('blocked');
			expect(s.fetcher).not.toHaveBeenCalled();
		}
	);
	it('disabled release with no existing key cannot create', async () => {
		const s = setup();
		expect((await s.client.perform(false)).mode).toBe('new');
		expect(s.fetcher).not.toHaveBeenCalled();
		expect(s.randomUUID).not.toHaveBeenCalled();
	});
	it('double activation cannot issue a second mutation', async () => {
		const s = setup();
		let finish!: (value: Response) => void;
		s.fetcher.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				})
		);
		const first = s.client.perform(true);
		await s.client.perform(true);
		expect(s.fetcher).toHaveBeenCalledTimes(1);
		finish(json({}, 503));
		await first;
	});
	it('only exact pre-write refusal can remove a fresh key', async () => {
		const s = setup();
		s.fetcher.mockResolvedValue(json({ error: 'workflow_unreleased' }, 409));
		expect((await s.client.perform(true)).mode).toBe('new');
		expect(s.values.has(name)).toBe(false);
	});
	it.each([
		[409, { error: 'idempotency_conflict' }],
		[503, { error: 'workflow_unreleased' }],
		[409, { error: 'workflow_unreleased', extra: true }],
		[202, { runId: 'bad' }],
		[202, { runId: child, extra: true }]
	])('ambiguous creation response %# retains original key', async (status, body) => {
		const s = setup();
		s.fetcher.mockResolvedValue(json(body, status as number));
		expect((await s.client.perform(true)).mode).toBe('recover');
		expect(s.values.get(name)).toBe(key);
	});
	it('failed key removal remains recovery-only', async () => {
		const s = setup();
		s.storage.removeItem.mockImplementation(() => {
			throw Error('denied');
		});
		s.fetcher.mockResolvedValueOnce(json({ error: 'workflow_unreleased' }, 409));
		expect((await s.client.perform(true)).mode).toBe('recover');
		expect(s.values.get(name)).toBe(key);
	});
	it('non-JSON response and failed reader remain uncertain', async () => {
		const s = setup(key);
		s.fetcher.mockResolvedValueOnce(new Response('<html>offline</html>'));
		expect((await s.client.perform(true)).href).toBeUndefined();
		s.fetcher.mockResolvedValueOnce(json({ request })).mockResolvedValueOnce(json({}, 503));
		expect((await s.client.perform(true)).href).toBeUndefined();
		expect(s.values.get(name)).toBe(key);
	});
});
