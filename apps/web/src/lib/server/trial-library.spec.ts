import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { retiredTarotIds } from '@atv/domain';
import { readTrialLibrary } from './trial-library';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner = id(9000);
const instant = '2026-10-23T12:00:00.123456+00:00';
const row = (n: number, product_id = 'birth-chart') => ({
	id: id(n),
	product_id,
	created_at: instant,
	owner_id: owner,
	archived_at: null as string | null
});
const clientWith = (fetch: typeof globalThis.fetch) =>
	createClient('https://fixture.invalid', 'synthetic-key', {
		auth: { persistSession: false, autoRefreshToken: false },
		global: { fetch }
	});

describe('private trial history pagination', () => {
	it('reaches all 125 current readings despite 120 newer retired readings, preserving microsecond ties', async () => {
		const current = Array.from({ length: 125 }, (_, i) => row(125 - i));
		const rows = [
			...Array.from({ length: 120 }, (_, i) =>
				row(1000 - i, retiredTarotIds[i % retiredTarotIds.length])
			),
			{ ...row(1500), archived_at: instant },
			{ ...row(1600), owner_id: id(9001) },
			...current
		];
		const requests: URL[] = [];
		const client = clientWith(async (input) => {
			const url = new URL(String(input));
			requests.push(url);
			expect(url.searchParams.get('owner_id')).toBe(`eq.${owner}`);
			expect(url.searchParams.get('archived_at')).toBe('is.null');
			expect(url.searchParams.get('product_id')).toBe(`not.in.(${retiredTarotIds.join(',')})`);
			// Apply the actual URL filters before the requested SQL limit.
			let eligible = rows.filter(
				(item) =>
					item.owner_id === owner &&
					item.archived_at === null &&
					!retiredTarotIds.includes(item.product_id)
			);
			if (url.searchParams.has('id')) {
				eligible = eligible.filter((item) => item.id === url.searchParams.get('id')!.slice(3));
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
				eligible = eligible.filter((item) => !boundary || item.id < boundary).slice(0, 51);
			}
			return new Response(JSON.stringify(eligible), {
				headers: { 'content-type': 'application/json' }
			});
		});
		const visited: string[] = [];
		let before: string | null = null;
		let pages = 0;
		do {
			const page = await readTrialLibrary(client, owner, before);
			expect(page.unavailable).toBe(false);
			expect(page.pagination?.expired).toBe(false);
			expect(page.readings.length).toBeLessThanOrEqual(50);
			visited.push(...page.readings.map((item) => item.id));
			before = page.pagination!.next;
			pages++;
			expect(pages).toBeLessThanOrEqual(3);
		} while (before);
		expect(pages).toBe(3);
		expect(visited).toEqual(current.map((item) => item.id));
		expect(new Set(visited).size).toBe(125);
		expect(requests).toHaveLength(5);
	});

	it('rejects malformed cursors without querying and expires missing or inaccessible cursors', async () => {
		let requests = 0;
		const client = clientWith(async () => {
			requests++;
			return new Response('[]', { headers: { 'content-type': 'application/json' } });
		});
		expect((await readTrialLibrary(client, owner, 'bad-cursor')).pagination?.expired).toBe(true);
		expect(requests).toBe(0);
		expect((await readTrialLibrary(client, owner, id(8000))).pagination?.expired).toBe(true);
		expect(requests).toBe(1);
	});

	it('does not misrepresent a failed query as empty history', async () => {
		const client = clientWith(
			async () => new Response('{"message":"private detail"}', { status: 400 })
		);
		const page = await readTrialLibrary(client, owner);
		expect(page).toMatchObject({ readings: [], unavailable: true });
		expect(JSON.stringify(page)).not.toContain('private detail');
	});
});
