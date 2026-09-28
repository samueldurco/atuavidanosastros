import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readLibraryPage } from './library-page';
import { libraryPageHref } from '$lib/library-page';
import { load } from '../../routes/biblioteca/+page.server';
import { load as fixtureLoad } from '../../routes/biblioteca/_spec/historico/+page.server';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner = id(9000);
const instant = '2026-09-28T12:00:00.123456+00:00';
const item = (n: number) => ({
	id: id(n),
	title: `Leitura sintética ${n}`,
	universe: 'SONHOS',
	item_type: 'PRODUCT_RUN',
	source_id: id(n + 5000),
	occurred_at: instant,
	created_at: instant
});
type Reply = { data: unknown; error: unknown };
const ok = (data: unknown): Reply => ({ data, error: null });
function mockClient(replies: (Reply | Promise<Reply>)[]) {
	const queries: ReturnType<typeof makeQuery>[] = [];
	function makeQuery(reply: Reply | Promise<Reply>) {
		const query = {
			select: vi.fn(),
			eq: vi.fn(),
			is: vi.fn(),
			order: vi.fn(),
			limit: vi.fn(),
			or: vi.fn(),
			maybeSingle: vi.fn(),
			abortSignal: vi.fn(),
			then: Promise.resolve(reply).then.bind(Promise.resolve(reply))
		};
		for (const key of [
			'select',
			'eq',
			'is',
			'order',
			'limit',
			'or',
			'maybeSingle',
			'abortSignal'
		] as const)
			query[key].mockReturnValue(query);
		return query;
	}
	const from = vi.fn().mockImplementation(() => {
		const query = makeQuery(replies[queries.length] ?? ok([]));
		queries.push(query);
		return query;
	});
	return { client: { from } as unknown as SupabaseClient, from, queries };
}
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('Biblioteca: bounded owner-scoped keyset reads', () => {
	it('traverses 1051 synthetic rows via the real client builder without overlaps or offset limits', async () => {
		const rows = Array.from({ length: 1051 }, (_, i) => item(1051 - i));
		const requests: URL[] = [];
		const transport: typeof fetch = async (input) => {
			const url = new URL(String(input));
			requests.push(url);
			expect(url.searchParams.get('user_id')).toBe(`eq.${owner}`);
			expect(url.searchParams.get('archived_at')).toBe('is.null');
			let data: unknown;
			if (url.searchParams.has('id')) {
				const target = url.searchParams.get('id')!.slice(3);
				data = rows
					.filter((row) => row.id === target)
					.map((row) => ({ id: row.id, created_at: row.created_at }));
			} else {
				expect(url.searchParams.get('limit')).toBe('51');
				expect(url.searchParams.get('order')).toBe('created_at.desc,id.desc');
				expect(url.searchParams.has('offset')).toBe(false);
				const filter = url.searchParams.get('or');
				const boundary = filter?.match(/id\.lt\.([\da-f-]+)\)\)$/)?.[1];
				if (filter)
					expect(filter).toBe(
						`(created_at.lt.${instant},and(created_at.eq.${instant},id.lt.${boundary}))`
					);
				data = rows.filter((row) => !boundary || row.id < boundary).slice(0, 51);
			}
			return new Response(JSON.stringify(data), {
				headers: { 'content-type': 'application/json' }
			});
		};
		const client = createClient('https://fixture.invalid', 'synthetic-key', {
			auth: { persistSession: false, autoRefreshToken: false },
			global: { fetch: transport }
		});
		const visited: string[] = [];
		let before: string | null = null;
		let pages = 0;
		do {
			const page = await readLibraryPage(client, owner, before);
			expect(page.libraryError).toBe(false);
			expect(page.pagination.expired).toBe(false);
			visited.push(...page.items.map((row) => row.id));
			before = page.pagination.next;
			pages++;
			expect(pages).toBeLessThan(24);
		} while (before);
		expect(visited).toEqual(rows.map((row) => row.id));
		expect(new Set(visited).size).toBe(1051);
		expect(pages).toBe(22);
		expect(requests).toHaveLength(43);
	});
	it('returns 50 of 51 and uses the last visible row, not the sentinel, as cursor', async () => {
		const m = mockClient([ok(Array.from({ length: 51 }, (_, i) => item(100 - i)))]);
		const result = await readLibraryPage(m.client, owner);
		expect(result.items).toHaveLength(50);
		expect(result.pagination).toEqual({ before: null, next: id(51), expired: false });
		expect(result.items.at(-1)?.id).toBe(id(51));
		const q = m.queries[0];
		expect(m.from).toHaveBeenCalledWith('library_items');
		expect(q.eq).toHaveBeenCalledWith('user_id', owner);
		expect(q.is).toHaveBeenCalledWith('archived_at', null);
		expect(q.order.mock.calls).toEqual([
			['created_at', { ascending: false }],
			['id', { ascending: false }]
		]);
		expect(q.limit).toHaveBeenCalledWith(51);
		expect(q.or).not.toHaveBeenCalled();
	});
	it.each([0, 1, 50])('does not invent an older page for %i rows', async (length) => {
		const m = mockClient([ok(Array.from({ length }, (_, i) => item(i + 1)))]);
		const result = await readLibraryPage(m.client, owner);
		expect(result.items).toHaveLength(length);
		expect(result.pagination.next).toBeNull();
		expect(result.libraryError).toBe(false);
	});
	it('resolves an owned active cursor and preserves microseconds and id tie-breaking', async () => {
		const m = mockClient([ok({ id: id(50), created_at: instant }), ok([item(49)])]);
		const result = await readLibraryPage(m.client, owner, id(50));
		expect(result.items[0].id).toBe(id(49));
		expect(m.queries[0].select).toHaveBeenCalledWith('id,created_at');
		expect(m.queries[0].eq.mock.calls).toEqual([
			['user_id', owner],
			['id', id(50)]
		]);
		expect(m.queries[0].is).toHaveBeenCalledWith('archived_at', null);
		expect(m.queries[1].eq).toHaveBeenCalledWith('user_id', owner);
		expect(m.queries[1].is).toHaveBeenCalledWith('archived_at', null);
		expect(m.queries[1].or).toHaveBeenCalledWith(
			`created_at.lt.${instant},and(created_at.eq.${instant},id.lt.${id(50)})`
		);
	});
	it.each(['', 'invalid', `${id(50)},id.gt.0`, 'https://example.test/'])(
		'rejects invalid cursor %s without querying',
		async (cursor) => {
			const m = mockClient([]);
			const result = await readLibraryPage(m.client, owner, cursor);
			expect(result.pagination.expired).toBe(true);
			expect(m.from).not.toHaveBeenCalled();
		}
	);
	it('does not distinguish missing, archived or foreign cursor', async () => {
		const m = mockClient([ok(null)]);
		const result = await readLibraryPage(m.client, owner, id(50));
		expect(result.pagination.expired).toBe(true);
		expect(result.libraryError).toBe(false);
		expect(m.from).toHaveBeenCalledTimes(1);
		expect(result.items).toEqual([]);
	});
	it.each([
		{ id: id(49), created_at: instant },
		{ id: id(50), created_at: `${instant},id.gt.0` }
	])('fails closed for malformed cursor replies', async (cursor) => {
		const m = mockClient([ok(cursor)]);
		expect((await readLibraryPage(m.client, owner, id(50))).libraryError).toBe(true);
		expect(m.from).toHaveBeenCalledTimes(1);
	});
	it.each([
		null,
		{},
		[item(1), item(1)],
		[{ ...item(1), title: '' }],
		[{ ...item(1), created_at: 'invalid' }],
		Array.from({ length: 52 }, (_, i) => item(i + 1))
	])('rejects malformed or oversized pages', async (data) => {
		const m = mockClient([ok(data)]);
		const result = await readLibraryPage(m.client, owner);
		expect(result.libraryError).toBe(true);
		expect(result.items).toEqual([]);
	});
	it('strips fields not in the private list contract', async () => {
		const m = mockClient([ok([{ ...item(1), raw_notes: 'PRIVATE-CANARY' }])]);
		expect((await readLibraryPage(m.client, owner)).items).toEqual([item(1)]);
	});
	it.each([false, true])(
		'sanitizes database errors, including cursor lookup (%s)',
		async (cursor) => {
			const m = mockClient([{ data: null, error: { message: 'PRIVATE-CANARY' } }]);
			const result = await readLibraryPage(m.client, owner, cursor ? id(50) : null);
			expect(result.libraryError).toBe(true);
			expect(JSON.stringify(result)).not.toContain('PRIVATE-CANARY');
		}
	);
	it('requires an authenticated owner and configured client', async () => {
		const m = mockClient([]);
		expect((await readLibraryPage(m.client, 'bad-owner')).libraryError).toBe(true);
		expect((await readLibraryPage(undefined, owner)).libraryError).toBe(true);
		expect(m.from).not.toHaveBeenCalled();
	});
	it.each([false, true])(
		'enforces a deadline even when transport ignores abort (cursor=%s)',
		async (cursor) => {
			vi.useFakeTimers();
			let resolve!: (value: Reply) => void;
			const stalled = new Promise<Reply>((r) => {
				resolve = r;
			});
			const m = mockClient([stalled]);
			const resultPromise = readLibraryPage(m.client, owner, cursor ? id(50) : null);
			await vi.advanceTimersByTimeAsync(10_000);
			const result = await resultPromise;
			expect(result.libraryError).toBe(true);
			expect(m.queries[0].abortSignal.mock.calls[0][0].aborted).toBe(true);
			resolve(ok(cursor ? { id: id(50), created_at: instant } : [item(1)]));
			await vi.advanceTimersByTimeAsync(0);
			expect(m.from).toHaveBeenCalledTimes(1);
			expect(result.items).toEqual([]);
			expect(vi.getTimerCount()).toBe(0);
		}
	);
	it('clears its timer on success', async () => {
		vi.useFakeTimers();
		const m = mockClient([ok([])]);
		await readLibraryPage(m.client, owner);
		expect(vi.getTimerCount()).toBe(0);
	});
	it('shares the ten-second budget between cursor resolution and page fetch', async () => {
		vi.useFakeTimers();
		let resolve!: (value: Reply) => void;
		const cursor = new Promise<Reply>((r) => {
			resolve = r;
		});
		const m = mockClient([cursor, new Promise<Reply>(() => {})]);
		const pending = readLibraryPage(m.client, owner, id(50));
		await vi.advanceTimersByTimeAsync(9000);
		resolve(ok({ id: id(50), created_at: instant }));
		await vi.advanceTimersByTimeAsync(0);
		expect(m.from).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1000);
		expect((await pending).libraryError).toBe(true);
		expect(m.queries[1].abortSignal.mock.calls[0][0].aborted).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe('Biblioteca route and private cursor URL', () => {
	it.each(['example.test', 'localhost.example.test'])(
		'never serves the synthetic fixture on %s',
		async (hostname) => {
			await expect(
				fixtureLoad({
					url: new URL(`https://${hostname}/biblioteca/_spec/historico`),
					setHeaders: vi.fn()
				} as unknown as Parameters<typeof fixtureLoad>[0])
			).rejects.toMatchObject({ status: 404 });
		}
	);
	function event(
		user: { id: string } | null,
		authConfigured = true,
		query = '',
		client?: SupabaseClient
	) {
		const setHeaders = vi.fn();
		return {
			setHeaders,
			parent: async () => ({ user, authConfigured }),
			locals: { supabase: client },
			url: new URL(`https://example.test/biblioteca${query}`)
		};
	}
	const call = (value: ReturnType<typeof event>) =>
		load(value as unknown as Parameters<typeof load>[0]);
	it('redirects an unauthenticated request with private headers', async () => {
		const e = event(null);
		await expect(call(e)).rejects.toMatchObject({ status: 303, location: '/entrar' });
		expect(e.setHeaders).toHaveBeenCalledWith({
			'cache-control': 'private, no-store',
			'referrer-policy': 'no-referrer',
			'x-robots-tag': 'noindex, nofollow'
		});
	});
	it('supports only the existing unauthenticated configuration preview', async () => {
		expect(await call(event(null, false))).toMatchObject({
			preview: true,
			items: [],
			libraryError: false
		});
		expect(await call(event({ id: owner }))).toMatchObject({ preview: false, libraryError: true });
	});
	it('rejects repeated cursor parameters without database calls', async () => {
		const m = mockClient([]);
		expect(
			await call(event({ id: owner }, true, `?before=${id(1)}&before=${id(2)}`, m.client))
		).toMatchObject({ pagination: { expired: true } });
		expect(m.from).not.toHaveBeenCalled();
	});
	it('passes only the cursor to the reader and never reflects other query parameters', async () => {
		const m = mockClient([ok({ id: id(50), created_at: instant }), ok([item(49)])]);
		const result = await call(
			event({ id: owner }, true, `?before=${id(50)}&notes=PRIVATE-CANARY`, m.client)
		);
		expect(result).toMatchObject({ pagination: { before: id(50) } });
		expect(JSON.stringify(result)).not.toContain('PRIVATE-CANARY');
		expect(libraryPageHref(id(50))).toBe(`/biblioteca?before=${id(50)}`);
		expect(libraryPageHref(null)).toBe('/biblioteca');
	});
});
