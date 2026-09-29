import { describe, expect, it } from 'vitest';
import { weekTemporalReaderFixture } from '../../../tests/fixtures/week-temporal-reader';
import { parseProductRun } from '../product-run';
import { productFactLabel } from '../product-fact-label';
import { weekReadingTimeline } from '../week-reading-timeline';
import { weekTemporalFacts } from '../week-temporal-facts';

describe('private Week 1.2 factual presentation', () => {
	it('reads the persisted projection without constructing a seven-day timeline', () => {
		const run = parseProductRun(weekTemporalReaderFixture())!;
		expect(run).not.toBeNull();
		expect(weekReadingTimeline(run)).toBeNull();
		const temporal = weekTemporalFacts(run)!;
		expect(temporal.summary).toContain('34 janelas candidatas');
		expect(temporal.bodies).toHaveLength(10);
		expect(temporal.bodies.map((fact) => fact.id)).toEqual(
			[
				'sun',
				'moon',
				'mercury',
				'venus',
				'mars',
				'jupiter',
				'saturn',
				'uranus',
				'neptune',
				'pluto'
			].map((body) => `week-temporal-${body}`)
		);
		expect(productFactLabel('week-reading', 'week-temporal-moon')).toBe(
			'Busca temporal · Lua (week-temporal-moon)'
		);
	});

	it('withholds malformed, unrelated or unreleased temporal projections', () => {
		const fixture = weekTemporalReaderFixture();
		for (const mutate of [
			(v: typeof fixture) => {
				v.calculation!.facts.pop();
			},
			(v: typeof fixture) => {
				v.calculation!.facts[1].source = 'other;atv-week-reading-calculation/1.2.0';
			},
			(v: typeof fixture) => {
				v.calculation!.facts[1].id = 'week-temporal-moon';
			},
			(v: typeof fixture) => {
				v.calculation!.version = 'atv-week-reading-calculation/1.0.0';
			},
			(v: typeof fixture) => {
				v.editorial = null;
			},
			(v: typeof fixture) => {
				v.released = false;
			},
			(v: typeof fixture) => {
				v.productId = 'horoscope';
			}
		]) {
			const changed = structuredClone(fixture);
			mutate(changed);
			expect(weekTemporalFacts(changed)).toBeNull();
		}
		const unreleased = structuredClone(fixture);
		unreleased.released = false;
		expect(parseProductRun(unreleased)?.calculation).toBeNull();
	});
});
