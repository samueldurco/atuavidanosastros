import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readDashboard } from './dashboard';
import { load } from '../../routes/dashboard/+page.server';
import { load as specLoad } from '../../routes/dashboard/_spec/+page.server';
import { ONBOARDING_VERSION } from '$lib/onboarding';
import { CONTINUITY_SUMMARY_VERSION } from '$lib/continuity-summary';

const owner = '00000000-0000-4000-8000-000000000052';
const initial = { version: ONBOARDING_VERSION, revision: 0, state: 'NOT_STARTED', natal: null };
const complete = (precision = 'APPROXIMATE') => ({
	version: ONBOARDING_VERSION,
	revision: 2,
	state: 'COMPLETE',
	natal: {
		version: 2,
		localDateTime: '2000-01-01T12:30:00',
		utcInstant: '2000-01-01T14:30:00Z',
		timezone: 'America/Sao_Paulo',
		latitude: -23.5,
		longitude: -46.6,
		locationSource: 'PRIVATE-SOURCE',
		locationLabel: 'PRIVATE-PLACE',
		countryCode: 'BR',
		timePrecision: precision
	}
});
const item = { id: owner, title: 'Leitura sintética', created_at: '2026-09-24T12:00:00Z' };
const summary = {
	version: CONTINUITY_SUMMARY_VERSION,
	enabled: false,
	consentState: 'revoked',
	counts: { total: 4, relevant: 2, irrelevant: 1, unreviewed: 1 }
};
const continuity = { state: 'AVAILABLE', snapshot: summary };
function clientFor(
	natal: unknown = initial,
	items: unknown = [],
	fail:
		| 'natal'
		| 'library'
		| 'throw-natal'
		| 'throw-library'
		| 'continuity'
		| 'throw-continuity'
		| null = null,
	continuityData: unknown = summary
) {
	const query = {
		select: vi.fn(),
		eq: vi.fn(),
		is: vi.fn(),
		order: vi.fn(),
		limit: vi.fn(),
		abortSignal: vi.fn()
	};
	for (const method of ['select', 'eq', 'is', 'order', 'limit'] as const)
		query[method].mockReturnValue(query);
	query.abortSignal.mockImplementation(async () => {
		if (fail === 'throw-library') throw new Error('SECRET');
		return { data: items, error: fail === 'library' ? { message: 'SECRET' } : null };
	});
	const rpcRead = vi.fn().mockImplementation(async () => {
		if (fail === 'throw-natal') throw new Error('PRIVATE');
		return { data: natal, error: fail === 'natal' ? { message: 'PRIVATE' } : null };
	});
	const continuityRead = vi.fn().mockImplementation(async () => {
		if (fail === 'throw-continuity') throw new Error('PRIVATE');
		return { data: continuityData, error: fail === 'continuity' ? { message: 'PRIVATE' } : null };
	});
	const rpc = vi.fn().mockImplementation((name: string) => {
		if (name === 'read_natal_onboarding') return { abortSignal: rpcRead };
		if (name === 'read_product_continuity_summary') return { abortSignal: continuityRead };
		throw new Error('Unexpected RPC');
	});
	const from = vi.fn().mockReturnValue(query);
	return {
		client: { rpc, from } as unknown as SupabaseClient,
		query,
		rpc,
		from,
		rpcRead,
		continuityRead
	};
}

afterEach(() => vi.useRealTimers());
it.each(['natal', 'library', 'continuity', 'all'] as const)(
	'bounds %s stalled reads independently without erasing healthy sections',
	async (target) => {
		vi.useFakeTimers();
		const mock = clientFor(complete(), [item]);
		const ports = {
			natal: mock.rpcRead,
			library: mock.query.abortSignal,
			continuity: mock.continuityRead
		};
		for (const [name, port] of Object.entries(ports)) {
			if (name === target || target === 'all') port.mockImplementation(() => new Promise(() => {}));
		}
		const pending = readDashboard(mock.client, owner);
		await vi.advanceTimersByTimeAsync(9999);
		for (const port of Object.values(ports)) expect(port).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		const result = await pending;
		expect(result.libraryError).toBe(target === 'library' || target === 'all');
		expect(result.items).toEqual(result.libraryError ? [] : [item]);
		expect(result.natal.state).toBe(
			target === 'natal' || target === 'all' ? 'UNAVAILABLE' : 'COMPLETE'
		);
		expect(result.continuity.state).toBe(
			target === 'continuity' || target === 'all' ? 'UNAVAILABLE' : 'AVAILABLE'
		);
		expect(vi.getTimerCount()).toBe(0);
		for (const [name, port] of Object.entries(ports)) {
			expect(port).toHaveBeenCalledTimes(1);
			expect(port.mock.calls[0][0].aborted).toBe(name === target || target === 'all');
		}
	}
);
describe('dashboard minimal authenticated recovery', () => {
	it.each(['continuity', 'throw-continuity'] as const)(
		'isolates %s failures without retry or private error text',
		async (fail) => {
			const mock = clientFor(complete(), [item], fail);
			const result = await readDashboard(mock.client, owner);
			expect(result).toMatchObject({
				items: [item],
				libraryError: false,
				natal: { state: 'COMPLETE' },
				continuity: { state: 'UNAVAILABLE' }
			});
			expect(mock.continuityRead).toHaveBeenCalledTimes(1);
			expect(JSON.stringify(result)).not.toContain('PRIVATE');
		}
	);
	it('rejects continuity content leakage; a new read recovers current counts', async () => {
		const mock = clientFor(initial, [], null, { ...summary, notes: 'PRIVATE' });
		expect((await readDashboard(mock.client, owner)).continuity).toEqual({ state: 'UNAVAILABLE' });
		mock.continuityRead.mockResolvedValueOnce({ data: summary, error: null });
		expect((await readDashboard(mock.client, owner)).continuity).toEqual(continuity);
		expect(mock.rpc).not.toHaveBeenCalledWith('read_product_continuity');
	});
	it.each(['NOT_STARTED', 'IN_PROGRESS'])(
		'recovers %s without inventing completion',
		async (state) => {
			const { client } = clientFor({ ...initial, state });
			expect(await readDashboard(client, owner)).toEqual({
				preview: false,
				items: [],
				libraryError: false,
				natal: { state },
				continuity
			});
		}
	);
	it.each(['EXACT', 'APPROXIMATE'])(
		'projects only state and %s precision, never natal PII',
		async (precision) => {
			const mock = clientFor(complete(precision), [{ ...item, ignored_private: 'PRIVATE' }]);
			const result = await readDashboard(mock.client, owner);
			expect(result).toEqual({
				preview: false,
				items: [item],
				libraryError: false,
				natal: { state: 'COMPLETE', timePrecision: precision },
				continuity
			});
			expect(JSON.stringify(result)).not.toMatch(
				/PRIVATE|latitude|longitude|2000-01-01|timezone|countryCode/
			);
			expect(mock.rpc).toHaveBeenCalledTimes(2);
			expect(mock.rpc).toHaveBeenCalledWith('read_natal_onboarding');
			expect(mock.rpc).toHaveBeenCalledWith('read_product_continuity_summary');
			expect(mock.continuityRead).toHaveBeenCalledExactlyOnceWith(expect.any(AbortSignal));
			expect(mock.from).toHaveBeenCalledExactlyOnceWith('library_items');
			expect(mock.query.select).toHaveBeenCalledWith('id,title,created_at');
			expect(mock.query.eq).toHaveBeenCalledWith('user_id', owner);
			expect(mock.query.is).toHaveBeenCalledWith('archived_at', null);
			expect(mock.query.limit).toHaveBeenCalledWith(3);
			expect(mock.rpcRead).toHaveBeenCalledWith(expect.any(AbortSignal));
		}
	);
	it.each(['natal', 'throw-natal'] as const)(
		'isolates %s failure from saved library',
		async (fail) => {
			const result = await readDashboard(clientFor(complete(), [item], fail).client, owner);
			expect(result).toEqual({
				preview: false,
				items: [item],
				libraryError: false,
				natal: { state: 'UNAVAILABLE' },
				continuity
			});
		}
	);
	it.each(['library', 'throw-library'] as const)(
		'isolates %s failure from recovered natal status',
		async (fail) => {
			expect(await readDashboard(clientFor(initial, [item], fail).client, owner)).toEqual({
				preview: false,
				items: [],
				libraryError: true,
				natal: { state: 'NOT_STARTED' },
				continuity
			});
		}
	);
	it.each([
		null,
		{ ...initial, version: 'future' },
		{ ...initial, state: 'COMPLETE' },
		{ ...complete(), injected: true }
	])('refuses malformed snapshots', async (data) => {
		expect((await readDashboard(clientFor(data).client, owner)).natal).toEqual({
			state: 'UNAVAILABLE'
		});
	});
	it.each([
		null,
		[{ ...item, created_at: 'invalid' }],
		[{ ...item, id: '../bad' }],
		[{ ...item, title: '' }],
		Array(4).fill(item)
	])('marks malformed library unavailable, not empty', async (items) => {
		expect((await readDashboard(clientFor(initial, items).client, owner)).libraryError).toBe(true);
	});
	it('does not query missing client or invalid owner', async () => {
		const mock = clientFor();
		expect((await readDashboard(undefined, owner)).natal.state).toBe('UNAVAILABLE');
		expect((await readDashboard(mock.client, 'bad-owner')).natal.state).toBe('UNAVAILABLE');
		expect(mock.rpc).not.toHaveBeenCalled();
		expect(mock.from).not.toHaveBeenCalled();
	});
	it('redirects configured anonymous sessions before any query and marks response private', async () => {
		const mock = clientFor();
		const setHeaders = vi.fn();
		await expect(
			load({
				parent: async () => ({ authConfigured: true, user: null }),
				locals: { supabase: mock.client },
				setHeaders
			} as unknown as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 303, location: '/entrar' });
		expect(setHeaders).toHaveBeenCalledWith({
			'cache-control': 'private, no-store',
			'referrer-policy': 'no-referrer',
			'x-robots-tag': 'noindex, nofollow'
		});
		expect(mock.rpc).not.toHaveBeenCalled();
	});
	it('keeps preview explicit without reading a profile', async () => {
		const mock = clientFor();
		expect(
			await load({
				parent: async () => ({ authConfigured: false, user: null }),
				locals: { supabase: mock.client },
				setHeaders: vi.fn()
			} as unknown as Parameters<typeof load>[0])
		).toMatchObject({
			preview: true,
			natal: { state: 'PREVIEW' },
			continuity: { state: 'PREVIEW' }
		});
		expect(mock.rpc).not.toHaveBeenCalled();
	});
	it('uses the verified parent subject and does not return a natal payload', async () => {
		const mock = clientFor(complete());
		expect(
			await load({
				parent: async () => ({ authConfigured: true, user: { id: owner } }),
				locals: { supabase: mock.client },
				setHeaders: vi.fn()
			} as unknown as Parameters<typeof load>[0])
		).toMatchObject({ preview: false, natal: { state: 'COMPLETE', timePrecision: 'APPROXIMATE' } });
		expect(mock.query.eq).toHaveBeenCalledWith('user_id', owner);
	});
	it('rejects the QA fixture on public hosts', () => {
		expect(() =>
			specLoad({
				url: new URL('https://example.com/dashboard/_spec'),
				setHeaders: vi.fn()
			} as unknown as Parameters<typeof specLoad>[0])
		).toThrow();
	});
});
