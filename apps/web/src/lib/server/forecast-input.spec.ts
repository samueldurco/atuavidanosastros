import { describe, expect, it } from 'vitest';
import { anchorForecastInput } from './forecast-input';

describe('forecast generation date', () => {
	it('sets server UTC and rolling period for both new forecasts, ignoring client dates', () => {
		for (const productId of ['personal-calendar', 'career-forecast-30d']) {
			expect(
				anchorForecastInput(
					{ productId, targetDate: '1999-01-01', context: 'teste' },
					undefined,
					new Date('2026-10-16T00:01:00Z')
				)
			).toEqual({
				productId,
				targetDate: '2026-10-16',
				forecastPeriod: 'rolling-30-days',
				context: 'teste'
			});
		}
	});
	it('replays the stored rolling date across midnight without mutating saved data', () => {
		const saved = Object.freeze({
			productId: 'personal-calendar',
			targetDate: '2026-10-15',
			forecastPeriod: 'rolling-30-days'
		});
		expect(
			anchorForecastInput(
				{ ...saved, targetDate: '2040-01-01' },
				saved,
				new Date('2026-10-16T01:00:00Z')
			)
		).toEqual(saved);
	});
	it('preserves historical civil month inputs and other products exactly', () => {
		const saved = { productId: 'personal-calendar', targetDate: '2026-09-01' };
		expect(anchorForecastInput(saved, saved)).toBe(saved);
		const other = { productId: 'date-reading', targetDate: '2030-01-01' };
		expect(anchorForecastInput(other)).toBe(other);
		for (const malformed of [null, 'input', []])
			expect(anchorForecastInput(malformed)).toBe(malformed);
	});
});
