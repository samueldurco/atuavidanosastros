export interface PersonalCalendarGrid {
	version: 'atv-personal-calendar-grid/1.0.0';
	basis: 'utc-civil-month';
	startDate: string;
	endDateExclusive: string;
	dates: string[];
	marks: { id: string; date: string; display: string; source: string }[];
}

type Fact = { id: string; kind: string; display: string; source: string };
const record = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
const civilDate = (value: unknown): value is string =>
	typeof value === 'string' &&
	/^\d{4}-\d{2}-\d{2}$/.test(value) &&
	!Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
	new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/** Validates the released civil grid and pairs only specifically reported mark facts. */
export function parsePersonalCalendarGrid(
	value: unknown,
	facts: readonly Fact[]
): PersonalCalendarGrid | null {
	if (
		!record(value) ||
		value.version !== 'atv-personal-calendar-grid/1.0.0' ||
		value.basis !== 'utc-civil-month' ||
		!civilDate(value.startDate) ||
		value.startDate < '1900-01-01' ||
		value.startDate > '2099-12-01' ||
		!value.startDate.endsWith('-01') ||
		!Array.isArray(value.dates) ||
		value.dates.length < 28 ||
		value.dates.length > 31
	)
		return null;
	const start = Date.parse(`${value.startDate}T00:00:00Z`);
	const end = new Date(
		Date.UTC(Number(value.startDate.slice(0, 4)), Number(value.startDate.slice(5, 7)), 1)
	)
		.toISOString()
		.slice(0, 10);
	if (
		value.endDateExclusive !== end ||
		value.dates.length !== (Date.parse(`${end}T00:00:00Z`) - start) / 86_400_000
	)
		return null;
	const dates: string[] = [];
	for (const [index, date] of value.dates.entries()) {
		const expected = new Date(start + index * 86_400_000).toISOString().slice(0, 10);
		if (!civilDate(date) || date !== expected) return null;
		const fact = facts.find((item) => item.id === `civil-day-${date}`);
		if (
			!fact ||
			fact.kind !== 'calculated' ||
			fact.display !== `Dia civil: ${date}` ||
			fact.source !== 'atv-personal-calendar-calculation/1.1.0'
		)
			return null;
		dates.push(date);
	}
	if (
		facts.filter((fact) => fact.id.startsWith('civil-day-')).length !== dates.length ||
		!facts.some(
			(fact) =>
				fact.id === 'natal-sun' &&
				fact.kind === 'calculated' &&
				fact.display.startsWith('Sol natal: ')
		)
	)
		return null;
	const marks: PersonalCalendarGrid['marks'] = [];
	for (const fact of facts.filter((item) => item.id.startsWith('reported-mark-'))) {
		if (
			fact.id !== `reported-mark-${marks.length + 1}` ||
			fact.kind !== 'reported' ||
			fact.source !== `input.calendarMarks.entries[${marks.length}]` ||
			!/^\d{4}-\d{2}-\d{2}: \S/.test(fact.display) ||
			!dates.includes(fact.display.slice(0, 10)) ||
			marks.some((mark) => mark.date === fact.display.slice(0, 10)) ||
			marks.length >= 5
		)
			return null;
		marks.push({
			id: fact.id,
			date: fact.display.slice(0, 10),
			display: fact.display,
			source: fact.source
		});
	}
	return {
		version: value.version,
		basis: value.basis,
		startDate: value.startDate,
		endDateExclusive: end,
		dates,
		marks
	};
}
