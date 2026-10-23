import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { load } from '../../routes/compartilhar/leitura/[token]/+page.server';
import { shareTokenHash } from '../trials/sharing';
import { trialWriter } from './private-trials';

vi.mock('./private-trials', () => ({ trialWriter: vi.fn() }));

const owner = '00000000-0000-4000-8000-000000000061';
const readingId = '00000000-0000-4000-8000-000000000062';
const other = '00000000-0000-4000-8000-000000000063';
const token = 'a'.repeat(64);
const now = '2026-10-23T12:00:00.000Z';
type Row = Record<string, unknown>;
let rows: Record<string, Row[]>;
let failures: Set<string>;
let queried: string[];

/** Evaluate the filters as a privileged client: RLS cannot hide archived or foreign rows. */
function from(table: string) {
	queried.push(table);
	const filters: ((row: Row) => boolean)[] = [];
	const query = {
		select: vi.fn(() => query),
		eq: vi.fn((key: string, value: unknown) => {
			filters.push((row) => row[key] === value);
			return query;
		}),
		is: vi.fn((key: string, value: unknown) => {
			filters.push((row) => row[key] === value);
			return query;
		}),
		gt: vi.fn((key: string, value: string) => {
			filters.push((row) => typeof row[key] === 'string' && String(row[key]) > value);
			return query;
		}),
		maybeSingle: vi.fn(async () => ({
			data: failures.has(table)
				? null
				: (rows[table]?.find((row) => filters.every((filter) => filter(row))) ?? null),
			error: failures.has(table) ? { message: 'Synthetic storage failure' } : null
		}))
	};
	return query;
}

const event = (value = token) => ({ params: { token: value }, setHeaders: vi.fn() });
const open = async (value = token) => load(event(value) as never);

beforeEach(async () => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.setSystemTime(now);
	failures = new Set();
	queried = [];
	rows = {
		atv_trial_shares: [
			{
				owner_id: owner,
				reading_id: readingId,
				token_hash: await shareTokenHash(token),
				revoked_at: null,
				expires_at: '2026-10-24T12:00:00.000Z'
			}
		],
		atv_trial_grants: [{ owner_id: owner, revoked_at: null, expires_at: null }],
		atv_trial_readings: [
			{
				id: readingId,
				owner_id: owner,
				product_id: 'synastry',
				archived_at: null,
				input: { presentation: { name: 'Pessoa sintética A', partnerName: 'Pessoa sintética B' } },
				approval: { status: 'approved', scope: 'private-free-test' },
				calculation: { private: 'Not shared' },
				reading: {
					title: 'Leitura sintética do encontro',
					opening: 'Abertura sintética.',
					sections: [
						{ title: 'Um encontro', text: 'Texto sintético.', factIds: ['private-fact'] },
						{ title: 'Referências desta leitura', text: 'Private source material' }
					],
					questions: ['Uma pergunta sintética?'],
					practice: 'Uma prática sintética.'
				}
			}
		]
	};
	vi.mocked(trialWriter).mockReturnValue({ from } as never);
});

afterEach(() => vi.useRealTimers());

describe('shared reading access through a privileged client', () => {
	it('opens the consented projection for a visitor with a valid token, without private metadata', async () => {
		const request = event();
		const result = (await load(request as never)) as { reading: unknown };
		expect(result.reading).toEqual({
			title: 'Leitura sintética do encontro',
			names: 'Pessoa sintética A e Pessoa sintética B',
			opening: 'Abertura sintética.',
			sections: [{ title: 'Um encontro', text: 'Texto sintético.' }],
			questions: ['Uma pergunta sintética?'],
			practice: 'Uma prática sintética.'
		});
		expect(request.setHeaders).toHaveBeenCalledWith({
			'cache-control': 'private, no-store',
			'x-robots-tag': 'noindex, nofollow',
			'referrer-policy': 'no-referrer'
		});
	});

	it('hides an archived reading even when its previously issued token remains active', async () => {
		rows.atv_trial_readings[0].archived_at = now;
		await expect(open()).rejects.toMatchObject({ status: 404 });
	});

	it.each(['owner_id', 'id'])('does not use a reading with a different %s', async (field) => {
		rows.atv_trial_readings[0][field] = other;
		await expect(open()).rejects.toMatchObject({ status: 404 });
	});

	it.each([
		{ revoked_at: now },
		{ expires_at: now },
		{ expires_at: '2026-10-22T12:00:00.000Z' },
		{ token_hash: 'different-hash' }
	])('rejects an unavailable token before reading the content: %j', async (change) => {
		Object.assign(rows.atv_trial_shares[0], change);
		await expect(open()).rejects.toMatchObject({ status: 404 });
		expect(queried).toEqual(['atv_trial_shares']);
	});

	it.each([
		{ owner_id: other },
		{ revoked_at: now },
		{ expires_at: now },
		{ expires_at: '2026-10-22T12:00:00.000Z' }
	])('requires the linked owner to retain an active grant: %j', async (change) => {
		Object.assign(rows.atv_trial_grants[0], change);
		await expect(open()).rejects.toMatchObject({ status: 404 });
		expect(queried).not.toContain('atv_trial_readings');
	});

	it.each([
		{ product_id: 'birth-chart' },
		{ approval: { status: 'rejected', scope: 'private-free-test' } },
		{ approval: { status: 'approved', scope: 'public' } }
	])('refuses content outside the shareable approved projection: %j', async (change) => {
		Object.assign(rows.atv_trial_readings[0], change);
		await expect(open()).rejects.toMatchObject({ status: 404 });
	});

	it.each(['atv_trial_shares', 'atv_trial_grants', 'atv_trial_readings'])(
		'reports an unavailable dependency without returning content: %s',
		async (table) => {
			failures.add(table);
			await expect(open()).rejects.toMatchObject({ status: 503 });
		}
	);

	it('rejects a malformed token before creating the privileged client', async () => {
		await expect(open('../private')).rejects.toMatchObject({ status: 404 });
		expect(trialWriter).not.toHaveBeenCalled();
		expect(queried).toEqual([]);
	});
});
