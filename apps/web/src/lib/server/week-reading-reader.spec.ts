import { describe, expect, it } from 'vitest';
import { weekReadingReaderFixture } from '../../../tests/fixtures/week-reading-reader';
import { parseProductRun } from '../product-run';
import { productFactLabel } from '../product-fact-label';
import { weekReadingTimeline } from '../week-reading-timeline';

describe('private Week specimen without editorial approval', () => {
	for (const withContext of [true, false])
		it(`preserves facts, claims and seven chronological links (${withContext})`, async () => {
			const fixture = await weekReadingReaderFixture('ready', withContext);
			const run = parseProductRun(fixture.run)!;
			expect(run).not.toBeNull();
			expect(run.calculation!.facts).toEqual(fixture.run.calculation!.facts);
			expect(run.calculation!.facts).toHaveLength(withContext ? 89 : 88);
			expect(run.editorial!.sections).toEqual(fixture.run.editorial!.sections);
			expect(run.editorial!.sections).toHaveLength(withContext ? 19 : 18);
			const timeline = weekReadingTimeline(run)!;
			expect(timeline.map((s) => s.date)).toEqual([
				'2026-09-29',
				'2026-09-30',
				'2026-10-01',
				'2026-10-02',
				'2026-10-03',
				'2026-10-04',
				'2026-10-05'
			]);
			for (const [index, sample] of timeline.entries()) {
				expect(sample.instant).toBe(`${sample.date}T12:00:00.000Z`);
				const sectionIndex = Number(sample.href.slice('#capitulo-'.length)) - 1;
				expect(run.editorial!.sections[sectionIndex].title).toContain(`[week-day-${index + 1}]`);
			}
			expect(productFactLabel('week-reading', 'week-range')).toBe(
				'Intervalo das sete amostras (week-range)'
			);
			expect(productFactLabel('week-reading', 'natal-pluto')).toBe(
				'Base natal compartilhada · Plutão (natal-pluto)'
			);
			expect(productFactLabel('week-reading', 'day-7-sample-instant')).toBe(
				'Amostra 7 · Instante (12h UTC) (day-7-sample-instant)'
			);
			expect(productFactLabel('week-reading', 'day-2-sample-mercury')).toBe(
				'Amostra 2 · Mercúrio (day-2-sample-mercury)'
			);
			expect(productFactLabel('week-reading', 'day-8-sample-sun')).toBe('day-8-sample-sun');
		});
	it('rejects transport overflow and dangling references without widening other products', async () => {
		const run = (await weekReadingReaderFixture('ready')).run;
		const bound = structuredClone(run);
		bound.calculation!.facts[0].source = 's'.repeat(300);
		expect(parseProductRun(bound)).not.toBeNull();
		bound.calculation!.facts[0].source += 's';
		expect(parseProductRun(bound)).toBeNull();
		bound.calculation!.facts[0].source = 's'.repeat(201);
		bound.productId = 'date-reading';
		expect(parseProductRun(bound)).toBeNull();
		const dangling = structuredClone(run);
		dangling.editorial!.sections.at(-1)!.evidence[0] = 'missing';
		expect(parseProductRun(dangling)).toBeNull();
	});
	it('withholds dates instead of constructing an ambiguous or false timeline', async () => {
		const run = (await weekReadingReaderFixture('ready')).run;
		const mutations: ((value: typeof run) => void)[] = [
			(v) => {
				v.calculation!.facts.pop();
			},
			(v) => {
				v.calculation!.facts[21].display = v.calculation!.facts[21].display.replaceAll(
					'2026-09-29',
					'2026-02-30'
				);
			},
			(v) => {
				v.calculation!.facts[32].display = v.calculation!.facts[32].display.replaceAll(
					'2026-09-30',
					'2026-10-01'
				);
			},
			(v) => {
				v.calculation!.facts[11].display = '2026-09-30 · wrong';
			},
			(v) => {
				v.calculation!.facts[0].display += ' forged';
			},
			(v) => {
				v.calculation!.facts[11].source += ' forged';
			},
			(v) => {
				v.editorial!.sections[11].evidence.pop();
			},
			(v) => {
				v.editorial!.sections[11].evidence[0] = v.editorial!.sections[11].evidence[1];
			},
			(v) => {
				v.editorial!.sections[11].title = v.editorial!.sections[12].title;
			},
			(v) => {
				v.editorial!.sections[11].text = 'Another date';
			},
			(v) => {
				v.calculation!.version = 'unknown';
			}
		];
		for (const mutate of mutations) {
			const changed = structuredClone(run);
			mutate(changed);
			expect(weekReadingTimeline(changed)).toBeNull();
		}
	});
	it('redacts even injected ready content when release is absent', async () => {
		const ready = (await weekReadingReaderFixture('ready')).run;
		for (const state of ['pending', 'revoked', 'failed']) {
			const run = (await weekReadingReaderFixture(state)).run;
			run.calculation = ready.calculation;
			run.editorial = ready.editorial;
			const parsed = parseProductRun(run)!;
			expect(parsed.calculation).toBeNull();
			expect(parsed.editorial).toBeNull();
			expect(weekReadingTimeline(parsed)).toBeNull();
		}
	});
});
