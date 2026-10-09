import { signs, type SignSlug } from '$lib/data/site';

export const horoscopePeriods = ['daily', 'weekly', 'monthly'] as const;
export type PublicPeriod = (typeof horoscopePeriods)[number];
export const periodNames: Record<PublicPeriod, string> = {
	daily: 'Dia',
	weekly: 'Semana',
	monthly: 'Mês'
};
export type HoroscopeEntry = {
	id: string;
	revision: number;
	path: string;
	title: string;
	description: string;
	sign: SignSlug;
	period: PublicPeriod;
	startDate: string;
	endDateExclusive: string;
	publishedAt: string;
	modifiedAt: string;
};
export function parseHoroscopeArchivePath(path: string) {
	const match = /^\/horoscopo\/([a-z]+)\/(daily|weekly|monthly)\/(\d{4}-\d{2}-\d{2})$/.exec(path);
	if (!match) return null;
	const sign = signs.find((item) => item === match[1]);
	const startDate = match[3];
	const date = new Date(`${startDate}T00:00:00.000Z`);
	if (
		!sign ||
		!Number.isFinite(date.getTime()) ||
		date.toISOString().slice(0, 10) !== startDate ||
		startDate < '1900-01-01' ||
		startDate > '2099-12-31'
	)
		return null;
	return { sign, period: match[2] as PublicPeriod, startDate };
}

export const HOROSCOPE_FOLLOW_KEY = 'atv.public-horoscope.follow.v1';
export type HoroscopeFollow = {
	version: 1;
	sign: SignSlug;
	period: PublicPeriod;
	consentedAt: string;
	seenThrough: string;
};
const validInstant = (value: unknown): value is string =>
	typeof value === 'string' &&
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
	Number.isFinite(Date.parse(value)) &&
	new Date(value).toISOString() === value;
export function parseHoroscopeFollow(raw: string | null): HoroscopeFollow | null {
	try {
		if (!raw || raw.length > 500) return null;
		const value = JSON.parse(raw);
		if (
			!value ||
			value.version !== 1 ||
			!signs.includes(value.sign) ||
			!horoscopePeriods.includes(value.period) ||
			!validInstant(value.consentedAt) ||
			!validInstant(value.seenThrough) ||
			value.seenThrough < value.consentedAt ||
			Object.keys(value).sort().join('|') !== 'consentedAt|period|seenThrough|sign|version'
		)
			return null;
		return value;
	} catch {
		return null;
	}
}
export function unreadHoroscopeEntries(
	entries: readonly HoroscopeEntry[],
	follow: HoroscopeFollow | null
) {
	return follow
		? entries.filter(
				(entry) =>
					entry.sign === follow.sign &&
					entry.period === follow.period &&
					entry.modifiedAt > follow.seenThrough
			)
		: [];
}
export function horoscopeRange(entry: Pick<HoroscopeEntry, 'startDate' | 'endDateExclusive'>) {
	const format = (value: string) =>
		new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(`${value}T00:00:00.000Z`));
	const last = new Date(Date.parse(`${entry.endDateExclusive}T00:00:00.000Z`) - 86_400_000)
		.toISOString()
		.slice(0, 10);
	return entry.startDate === last
		? format(entry.startDate)
		: `${format(entry.startDate)} a ${format(last)}`;
}
