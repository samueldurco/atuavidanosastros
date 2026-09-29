import { describe, expect, it } from 'vitest';
import { parseSolarReturnCalendar } from './solar-return-calendar';
import { parseProductRun } from './product-run';

const fixture = () => ({
	calendar: {
		version: 'atv-solar-return-calendar/1.0.0',
		basis: 'declared-civil-anniversary',
		startDate: '2024-01-31',
		endDateExclusive: '2025-01-31',
		months: [
			'2024-01-31',
			'2024-02-29',
			'2024-03-31',
			'2024-04-30',
			'2024-05-31',
			'2024-06-30',
			'2024-07-31',
			'2024-08-31',
			'2024-09-30',
			'2024-10-31',
			'2024-11-30',
			'2024-12-31',
			'2025-01-31'
		]
			.slice(0, 12)
			.map((startDate, index, dates) => ({
				number: index + 1,
				startDate,
				endDateExclusive: dates[index + 1] ?? '2025-01-31',
				importantDateIds: index === 1 ? ['important-date-1'] : ([] as string[])
			})),
		boundaryImportantDateIds: ['important-date-2']
	},
	facts: [
		{
			id: 'important-date-1',
			kind: 'reported',
			display: '2024-02-29: Data informada',
			source: 'input.importantDates.entries[0]'
		},
		{
			id: 'important-date-2',
			kind: 'reported',
			display: '2025-01-31: Limite final',
			source: 'input.importantDates.entries[1]'
		}
	]
});

describe('Solar Return released civil calendar', () => {
	it('shows the civil index only when the run is released', () => {
		const { calendar, facts } = fixture();
		const run = {
			id: '00000000-0000-4000-8000-000000000001',
			productId: 'solar-return',
			state: 'READY',
			revision: 1,
			parentId: null,
			createdAt: '2026-09-29T00:00:00Z',
			updatedAt: '2026-09-29T00:00:00Z',
			released: true,
			canReprocess: false,
			libraryItemId: null,
			history: [{ revision: 1, state: 'READY', at: '2026-09-29T00:00:00Z' }],
			calculation: { version: 'atv-solar-return-calculation/1.1.0', facts, limits: [], calendar },
			editorial: {
				version: 'fixture/1',
				promotionId: 'fixture',
				reviewDigest: 'a'.repeat(64),
				title: 'Leitura sintética',
				sections: [{ title: 'Base', text: 'Texto.', evidence: ['important-date-1'] }],
				limits: []
			}
		};
		expect(parseProductRun(run)?.calculation?.calendar?.months).toHaveLength(12);
		expect(parseProductRun({ ...run, released: false })?.calculation).toBeNull();
	});

	it('accepts clamped leap boundaries and places reported dates in exactly one interval', () => {
		const { calendar, facts } = fixture();
		const parsed = parseSolarReturnCalendar(calendar, facts);
		expect(parsed?.months).toHaveLength(12);
		expect(parsed?.months[1].startDate).toBe('2024-02-29');
		expect(parsed?.months[1].importantDateIds).toEqual(['important-date-1']);
		expect(parsed?.boundaryImportantDateIds).toEqual(['important-date-2']);
		const withPrivateData = { ...calendar, privateNote: 'secret' };
		expect(parseSolarReturnCalendar(withPrivateData, facts)).not.toHaveProperty('privateNote');
	});

	it('withholds the grade if a boundary or reported source cannot be verified', () => {
		const { calendar, facts } = fixture();
		const invalid: ((changed: ReturnType<typeof fixture>) => void)[] = [
			({ calendar }) => {
				calendar.months[1].startDate = '2024-02-28';
			},
			({ calendar }) => {
				calendar.months[1].importantDateIds = ['important-date-2'];
			},
			({ calendar }) => {
				calendar.boundaryImportantDateIds = [];
			},
			({ facts }) => {
				facts[0].source = 'input.importantDates.entries[1]';
			},
			({ facts }) => {
				facts[0].display = '2024-02-30: Data informada';
			},
			({ facts }) => {
				facts[0].kind = 'calculated';
			}
		];
		for (const mutate of invalid) {
			const changed = structuredClone({ calendar, facts });
			mutate(changed);
			expect(parseSolarReturnCalendar(changed.calendar, changed.facts)).toBeNull();
		}
	});
});
