export interface SolarReturnCalendarView {
	version: 'atv-solar-return-calendar/1.0.0';
	basis: 'declared-civil-anniversary';
	startDate: string;
	endDateExclusive: string;
	months: {
		number: number;
		startDate: string;
		endDateExclusive: string;
		importantDateIds: string[];
	}[];
	boundaryImportantDateIds: string[];
}

type Fact = { id: string; kind: string; display: string; source: string };
const record = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);
const civilDate = (value: unknown): value is string =>
	typeof value === 'string' &&
	/^\d{4}-\d{2}-\d{2}$/.test(value) &&
	!Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
	new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const boundary = (anchor: string, offset: number): string => {
	const year = Number(anchor.slice(0, 4));
	const month = Number(anchor.slice(5, 7));
	const day = Number(anchor.slice(8, 10));
	const first = new Date(Date.UTC(year, month - 1 + offset, 1));
	const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
	return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(day, last.getUTCDate())).padStart(2, '0')}`;
};

/** A civil index for a released owner read, checked against its reported source facts. */
export function parseSolarReturnCalendar(
	value: unknown,
	facts: readonly Fact[]
): SolarReturnCalendarView | null {
	if (
		!record(value) ||
		value.version !== 'atv-solar-return-calendar/1.0.0' ||
		value.basis !== 'declared-civil-anniversary' ||
		!civilDate(value.startDate) ||
		value.startDate < '1900-01-01' ||
		value.startDate > '2099-12-31' ||
		!Array.isArray(value.months) ||
		value.months.length !== 12 ||
		!Array.isArray(value.boundaryImportantDateIds) ||
		value.endDateExclusive !== boundary(value.startDate, 12)
	)
		return null;
	const months: SolarReturnCalendarView['months'] = [];
	const references: { id: string; start: string; end: string; boundary: boolean }[] = [];
	for (const [index, item] of value.months.entries()) {
		if (
			!record(item) ||
			item.number !== index + 1 ||
			item.startDate !== boundary(value.startDate, index) ||
			item.endDateExclusive !== boundary(value.startDate, index + 1) ||
			!Array.isArray(item.importantDateIds) ||
			item.importantDateIds.length > 3 ||
			!item.importantDateIds.every((id) => typeof id === 'string')
		)
			return null;
		for (const id of item.importantDateIds)
			references.push({ id, start: item.startDate, end: item.endDateExclusive, boundary: false });
		months.push({
			number: index + 1,
			startDate: item.startDate,
			endDateExclusive: item.endDateExclusive,
			importantDateIds: [...item.importantDateIds]
		});
	}
	if (
		value.boundaryImportantDateIds.length > 3 ||
		!value.boundaryImportantDateIds.every((id) => typeof id === 'string')
	)
		return null;
	for (const id of value.boundaryImportantDateIds)
		references.push({
			id,
			start: value.endDateExclusive,
			end: value.endDateExclusive,
			boundary: true
		});
	const reported = facts.filter((fact) => /^important-date-\d+$/.test(fact.id));
	if (references.length > 3 || references.length !== reported.length) return null;
	const seenDates = new Set<string>();
	for (const reference of references) {
		if (!/^important-date-[1-3]$/.test(reference.id)) return null;
		const fact = reported.find((candidate) => candidate.id === reference.id);
		if (!fact || fact.kind !== 'reported' || seenDates.has(fact.display.slice(0, 10))) return null;
		const sourceIndex = Number(reference.id.slice('important-date-'.length)) - 1;
		if (fact.source !== `input.importantDates.entries[${sourceIndex}]`) return null;
		const date = fact.display.slice(0, 10);
		if (
			!civilDate(date) ||
			!/^\d{4}-\d{2}-\d{2}: \S/.test(fact.display) ||
			(reference.boundary
				? date !== reference.start
				: date < reference.start || date >= reference.end)
		)
			return null;
		seenDates.add(date);
	}
	if (new Set(references.map((item) => item.id)).size !== references.length) return null;
	return {
		version: value.version,
		basis: value.basis,
		startDate: value.startDate,
		endDateExclusive: value.endDateExclusive,
		months,
		boundaryImportantDateIds: [...value.boundaryImportantDateIds]
	};
}
