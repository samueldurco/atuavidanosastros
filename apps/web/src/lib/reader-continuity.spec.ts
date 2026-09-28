import { describe, expect, it } from 'vitest';
import { readerContinuityReferences } from './reader-continuity';
import { exportFixture } from '../../tests/fixtures/product-export';

describe('reader continuity candidates, never eligibility', () => {
	it.each([
		'birth-chart',
		'date-reading',
		'synastry',
		'daily-card',
		'purpose-career',
		'dream-reading'
	])('offers hypotheses across the six universes: %s', (productId) => {
		const run = exportFixture();
		run.productId = productId;
		expect(readerContinuityReferences(run).map((ref) => ref.selection)).toEqual([
			{ kind: 'hypothesis', sectionIndex: 0 }
		]);
	});
	it.each(['released', 'pending', 'editorial', 'calculation', 'product', 'uuid'])(
		'fails closed on %s',
		(reason) => {
			const run = exportFixture();
			if (reason === 'released') run.released = false;
			if (reason === 'pending') run.state = 'AWAITING_EDITORIAL';
			if (reason === 'editorial') run.editorial = null;
			if (reason === 'calculation') run.calculation = null;
			if (reason === 'product') run.productId = 'unknown';
			if (reason === 'uuid') run.id = 'invalid';
			expect(readerContinuityReferences(run)).toEqual([]);
		}
	);
	it('preserves original section indexes; excludes long, blank, control text and indexes beyond 63 without truncating', () => {
		const run = exportFixture();
		run.editorial!.sections = Array.from({ length: 65 }, (_, i) => ({
			title: `Section ${i}`,
			text: 'x'.repeat(1200),
			evidence: []
		}));
		run.editorial!.sections[0].text += 'x';
		run.editorial!.sections[1].text = '  ';
		run.editorial!.sections[2].text = 'text\u0000';
		const refs = readerContinuityReferences(run);
		expect(refs).toHaveLength(61);
		expect(refs[0].selection).toEqual({ kind: 'hypothesis', sectionIndex: 3 });
		expect(refs.at(-1)!.selection).toEqual({ kind: 'hypothesis', sectionIndex: 63 });
	});
	it('offers only unique calculated cycle IDs, not reported facts or calculations of another universe', () => {
		const run = exportFixture();
		run.productId = 'date-reading';
		const fact = {
			id: 'cycle-1',
			kind: 'calculated',
			display: 'Synthetic cycle',
			source: 'Fixture'
		};
		run.calculation!.facts = [
			fact,
			{ ...fact, id: 'duplicate' },
			{ ...fact, id: 'duplicate' },
			{ ...fact, id: 'reported', kind: 'reported' },
			{ ...fact, id: 'bad/id' },
			{ ...fact, id: 'long', display: 'x'.repeat(1201) }
		];
		expect(
			readerContinuityReferences(run)
				.filter((r) => r.selection.kind === 'cycle')
				.map((r) => r.selection)
		).toEqual([{ kind: 'cycle', factId: 'cycle-1' }]);
		run.productId = 'birth-chart';
		expect(readerContinuityReferences(run).every((r) => r.selection.kind === 'hypothesis')).toBe(
			true
		);
	});
	it('selectors contain no reading text or evidence and do not alias source data', () => {
		const run = exportFixture();
		const refs = readerContinuityReferences(run);
		expect(JSON.stringify(refs.map((r) => r.selection))).not.toContain(
			run.editorial!.sections[0].text
		);
		expect(Object.keys(refs[0].selection)).toEqual(['kind', 'sectionIndex']);
		run.editorial!.sections[0].title = 'Changed';
		expect(refs[0].label).not.toContain('Changed');
	});
});
