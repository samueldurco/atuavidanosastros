/** Display only: calculations and claim factors retain their original date/time values. */
export function formatLaunchDate(value: string): string {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('launch_display_date_invalid');
	const date = new Date(`${value}T00:00:00Z`);
	if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== value)
		throw new Error('launch_display_date_invalid');
	return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

function formatClock(value: string): string {
	const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?$/.exec(value);
	if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3]) > 59)
		throw new Error('launch_display_time_invalid');
	const seconds = Number(match[3] ?? '0') || Number(match[4] ?? '0');
	return `${match[1]}h${match[2]}${seconds ? `min${match[3]}${Number(match[4] ?? '0') ? `,${match[4]}` : ''}s` : ''}`;
}

/** A reported local ceremony time is displayed as supplied, without UTC conversion. */
export function formatLaunchLocalDateTime(value: string, city: string): string {
	const match = /^(\d{4}-\d{2}-\d{2})T(.+)$/.exec(value);
	if (!match) throw new Error('launch_display_local_datetime_invalid');
	return `${formatLaunchDate(match[1]!)} às ${formatClock(match[2]!)} (horário de ${city})`;
}

/** UTC is explicit even when a UTC instant falls on another local calendar day. */
export function formatLaunchUtcInstant(value: string): string {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value))
		throw new Error('launch_display_utc_instant_invalid');
	return `${formatLaunchDate(value.slice(0, 10))} às ${formatClock(value.slice(11, -1))} (UTC)`;
}

export function formatLaunchUtcPeriod(startDate: string, endDateExclusive: string): string {
	return `De ${formatLaunchDate(startDate)} às 00h00 até ${formatLaunchDate(endDateExclusive)} às 00h00 (UTC; o horário final não está incluído)`;
}
