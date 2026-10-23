import { describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { readTrialReaderExtras } from './trial-reader-extras';

const owner = '00000000-0000-4000-8000-000000000001';
const reading = {
	id: '00000000-0000-4000-8000-000000000002',
	product_id: 'birth-chart',
	reading: { sections: [{}, {}, {}] }
};
const feedback = { decision: 'approved', comment: 'Comentário preservado', reading_id: reading.id };
const notes = [{ step: 0, text: 'Anotação preservada', updated_at: '2026-10-23T12:00:00Z' }];
const position = { chapter: 2, bookmarks: [1, 2] };
const tables = ['atv_trial_feedback', 'atv_trial_notes', 'atv_trial_reader_state'] as const;
const unavailableKey = ['feedback', 'notes', 'readerState'] as const;

function clientWith(failed?: string, malformed = false) {
	const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
		const url = new URL(String(input));
		const table = url.pathname.split('/').at(-1)!;
		expect(url.searchParams.get('owner_id')).toBe(`eq.${owner}`);
		if (table === 'atv_trial_feedback')
			expect(url.searchParams.get('product_id')).toBe(`eq.${reading.product_id}`);
		else expect(url.searchParams.get('reading_id')).toBe(`eq.${reading.id}`);
		if (failed === table || failed === 'all')
			return new Response('{"message":"private detail"}', { status: 400 });
		const data =
			table === tables[0]
				? feedback
				: table === tables[1]
					? notes
					: malformed
						? { chapter: 99, bookmarks: [] }
						: position;
		return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
	});
	return createClient('https://fixture.invalid', 'synthetic-key', {
		auth: { persistSession: false, autoRefreshToken: false },
		global: { fetch }
	});
}

describe('optional private reader workspaces', () => {
	it.each(tables)('isolates a failure of %s without discarding other records', async (failed) => {
		const result = await readTrialReaderExtras(clientWith(failed), owner, reading);
		const failedIndex = tables.indexOf(failed);
		expect(result.optionalUnavailable).toEqual(
			Object.fromEntries(unavailableKey.map((key, index) => [key, index === failedIndex]))
		);
		if (failedIndex !== 0) expect(result.feedback).toEqual(feedback);
		if (failedIndex !== 1) expect(result.notes).toEqual(notes);
		if (failedIndex !== 2) expect(result.readerState).toEqual(position);
		expect(JSON.stringify(result)).not.toContain('private detail');
	});

	it('marks all empty fallbacks unavailable when all optional queries fail', async () => {
		const result = await readTrialReaderExtras(clientWith('all'), owner, reading);
		expect(result).toEqual({
			feedback: null,
			notes: [],
			readerState: { chapter: 0, bookmarks: [] },
			optionalUnavailable: { feedback: true, notes: true, readerState: true }
		});
	});

	it('does not allow a malformed saved position to be overwritten as a new empty state', async () => {
		const result = await readTrialReaderExtras(clientWith(undefined, true), owner, reading);
		expect(result.optionalUnavailable.readerState).toBe(true);
		expect(result.notes).toEqual(notes);
	});
});
