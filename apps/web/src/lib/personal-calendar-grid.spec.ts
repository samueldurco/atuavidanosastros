import { describe, expect, it } from 'vitest';
import { parsePersonalCalendarGrid } from './personal-calendar-grid';
import { parseProductRun } from './product-run';

const fixture = () => {
	const dates = Array.from({ length: 29 }, (_, index) =>
		new Date(Date.UTC(2024, 1, index + 1)).toISOString().slice(0, 10)
	);
	return {
		grid: {
			version: 'atv-personal-calendar-grid/1.0.0',
			basis: 'utc-civil-month',
			startDate: '2024-02-01',
			endDateExclusive: '2024-03-01',
			dates
		},
		facts: [
			{ id: 'natal-sun', kind: 'calculated', display: 'Sol natal: 1° Áries', source: 'test' },
			...dates.map((date) => ({
				id: `civil-day-${date}`,
				kind: 'calculated',
				display: `Dia civil: ${date}`,
				source: 'atv-personal-calendar-calculation/1.1.0'
			})),
			{
				id: 'reported-mark-1',
				kind: 'reported',
				display: '2024-02-29: Mudança informada',
				source: 'input.calendarMarks.entries[0]'
			}
		]
	};
};

describe('Personal Calendar released factual grid', () => {
	it('shows only a validated leap-month grid and reported marks after release', () => {
		const { grid, facts } = fixture();
		const run = {
			id: '00000000-0000-4000-8000-000000000001',
			productId: 'personal-calendar',
			state: 'READY',
			revision: 1,
			parentId: null,
			createdAt: '2026-09-29T00:00:00Z',
			updatedAt: '2026-09-29T00:00:00Z',
			released: true,
			canReprocess: false,
			libraryItemId: null,
			history: [{ revision: 1, state: 'READY', at: '2026-09-29T00:00:00Z' }],
			calculation: {
				version: 'atv-personal-calendar-calculation/1.1.0',
				facts,
				limits: [],
				personalCalendar: grid
			},
			editorial: {
				version: 'fixture/1',
				promotionId: 'fixture',
				reviewDigest: 'a'.repeat(64),
				title: 'Leitura sintética',
				sections: [{ title: 'Base', text: 'Texto.', evidence: ['natal-sun'] }],
				limits: []
			}
		};
		expect(parseProductRun(run)?.calculation?.personalCalendar?.dates).toHaveLength(29);
		expect(parseProductRun({ ...run, released: false })?.calculation).toBeNull();
		expect(
			parsePersonalCalendarGrid({ ...grid, privateInput: 'secret' }, facts)
		).not.toHaveProperty('privateInput');
		expect(parsePersonalCalendarGrid(grid, facts)?.marks).toEqual([
			{
				id: 'reported-mark-1',
				date: '2024-02-29',
				display: '2024-02-29: Mudança informada',
				source: 'input.calendarMarks.entries[0]'
			}
		]);
	});
	it('withholds the grid when dates or reported source facts conflict', () => {
		const changes: ((candidate: ReturnType<typeof fixture>) => void)[] = [
			({ grid }) => {
				grid.dates[1] = '2024-02-04';
			},
			({ grid }) => {
				grid.endDateExclusive = '2024-02-29';
			},
			({ facts }) => {
				facts[1].display = 'Dia civil: 2024-02-02';
			},
			({ facts }) => {
				facts.at(-1)!.source = 'input.context';
			},
			({ facts }) => {
				facts.at(-1)!.display = '2024-03-01: Outside month';
			}
		];
		for (const change of changes) {
			const candidate = fixture();
			change(candidate);
			expect(parsePersonalCalendarGrid(candidate.grid, candidate.facts)).toBeNull();
		}
	});
});
