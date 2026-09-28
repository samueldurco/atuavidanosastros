import { describe, expect, it } from 'vitest';
import { CONTINUITY_SUMMARY_VERSION, parseContinuitySummary } from './continuity-summary';

const valid = {
	version: CONTINUITY_SUMMARY_VERSION,
	enabled: false,
	consentState: 'revoked',
	counts: { total: 6, relevant: 3, irrelevant: 1, unreviewed: 2 }
};

describe('continuity dashboard summary contract', () => {
	it('accepts exact metadata without confusing counts with eligibility', () => {
		expect(parseContinuitySummary(valid)).toEqual(valid);
		expect(
			parseContinuitySummary({ ...valid, enabled: true, consentState: 'granted' })
		).not.toBeNull();
	});
	it('accepts empty and 100-item boundaries', () => {
		for (const total of [0, 100])
			expect(
				parseContinuitySummary({
					...valid,
					counts: { total, relevant: total, irrelevant: 0, unreviewed: 0 }
				})
			).not.toBeNull();
	});
	it.each([
		null,
		[],
		{ ...valid, version: 'future' },
		{ ...valid, enabled: 'true' },
		{ ...valid, consentState: 'unknown' },
		{ ...valid, notes: 'PRIVATE' },
		{ ...valid, counts: { ...valid.counts, selection: 'PRIVATE' } },
		{ ...valid, counts: null },
		{ ...valid, counts: { total: 6, relevant: 3, irrelevant: 1 } },
		{ ...valid, counts: { ...valid.counts, total: 7 } },
		...[-1, 1.5, 101, NaN, Infinity, '6'].map((total) => ({
			...valid,
			counts: { ...valid.counts, total }
		}))
	])('rejects malformed or excessive summaries', (value) => {
		expect(parseContinuitySummary(value)).toBeNull();
	});
	it('returns a fresh projection, not the transport object', () => {
		const parsed = parseContinuitySummary(valid)!;
		expect(parsed).not.toBe(valid);
		expect(parsed.counts).not.toBe(valid.counts);
	});
});
