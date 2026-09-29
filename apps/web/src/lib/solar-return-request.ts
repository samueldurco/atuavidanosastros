import { validDate } from '@atv/domain';
import { validReportedContext } from './reported-context';
import { validWeekTimezone } from './week-request';

export const SOLAR_RETURN_REQUEST_VERSION = 'atv-solar-return-request/1';
export const SOLAR_IMPORTANT_DATES_AUTHORIZATION = 'atv-solar-important-dates/1';
export const SOLAR_IMPORTANT_DATES_LIMIT = 3;

export interface SolarImportantDate {
	date: string;
	label: string;
}

export function validSolarImportantDates(
	v: unknown,
	targetDate: string
): v is SolarImportantDate[] {
	if (
		!Array.isArray(v) ||
		v.length < 1 ||
		v.length > SOLAR_IMPORTANT_DATES_LIMIT ||
		!validDate(targetDate)
	)
		return false;
	const nextYear = Number(targetDate.slice(0, 4)) + 1;
	const nextAnchor = `${nextYear}-${targetDate.slice(5)}`;
	const seen = new Set<string>();
	return v.every((entry) => {
		if (
			!object(entry) ||
			Object.keys(entry).length !== 2 ||
			!keysOnly(entry, ['date', 'label']) ||
			!validDate(entry.date) ||
			entry.date < targetDate ||
			entry.date > nextAnchor ||
			!validSolarDateLabel(entry.label) ||
			seen.has(entry.date)
		)
			return false;
		seen.add(entry.date);
		return true;
	});
}

export const validSolarDateLabel = (v: unknown): v is string =>
	typeof v === 'string' &&
	v.trim().length > 0 &&
	v.length <= 80 &&
	![...v].some((c) => {
		const code = c.codePointAt(0)!;
		return code < 32 || (code >= 127 && code <= 159) || (code >= 0xd800 && code <= 0xdfff);
	});

export interface SolarReturnRequestInput {
	version: typeof SOLAR_RETURN_REQUEST_VERSION;
	productId: 'solar-return';
	expectedRevision: number;
	returnYear: number;
	targetDate: string;
	returnLocation: {
		city: string;
		timezone: string;
		latitude: number;
		longitude: number;
	};
	context?: string;
	importantDates?: {
		authorization: typeof SOLAR_IMPORTANT_DATES_AUTHORIZATION;
		entries: SolarImportantDate[];
	};
	consent: {
		storage: true;
		policyVersion: 'atv-input-consent/1';
		partner: false;
		continuity: false;
	};
}

const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
const keysOnly = (v: Record<string, unknown>, fields: string[]) =>
	Object.keys(v).every((key) => fields.includes(key));
const coordinate = (v: unknown, limit: number): v is number =>
	typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;

export const validSolarCity = (v: unknown): v is string =>
	typeof v === 'string' &&
	v.trim().length > 0 &&
	v.length <= 120 &&
	![...v].some((c) => {
		const code = c.codePointAt(0)!;
		return code < 32 || (code >= 127 && code <= 159) || (code >= 0xd800 && code <= 0xdfff);
	});

export const validSolarCoordinateText = (v: string, limit: number): boolean =>
	/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(v.trim()) && Math.abs(Number(v)) <= limit;

export function solarTargetDate(localDateTime: string, year: number): string | null {
	if (!/^\d{4}-\d{2}-\d{2}T/.test(localDateTime) || !Number.isInteger(year)) return null;
	const monthDay = localDateTime.slice(5, 10);
	const candidate = `${year}-${monthDay}`;
	if (validDate(candidate)) return candidate;
	const leapFallback = `${year}-02-28`;
	return monthDay === '02-29' && validDate(leapFallback) ? leapFallback : null;
}

export function parseSolarReturnRequestInput(v: unknown): SolarReturnRequestInput | null {
	if (
		!object(v) ||
		!keysOnly(v, [
			'version',
			'productId',
			'expectedRevision',
			'returnYear',
			'targetDate',
			'returnLocation',
			'context',
			'importantDates',
			'consent'
		])
	)
		return null;
	const hasContext = Object.hasOwn(v, 'context');
	const hasDates = Object.hasOwn(v, 'importantDates');
	if (
		Object.keys(v).length !== 7 + Number(hasContext) + Number(hasDates) ||
		v.version !== SOLAR_RETURN_REQUEST_VERSION ||
		v.productId !== 'solar-return' ||
		!Number.isInteger(v.expectedRevision) ||
		Number(v.expectedRevision) < 1 ||
		Number(v.expectedRevision) >= 2147483647 ||
		!Number.isInteger(v.returnYear) ||
		Number(v.returnYear) < 1901 ||
		Number(v.returnYear) > 2099 ||
		!validDate(v.targetDate) ||
		v.targetDate.slice(0, 4) !== String(v.returnYear) ||
		!object(v.returnLocation) ||
		Object.keys(v.returnLocation).length !== 4 ||
		!keysOnly(v.returnLocation, ['city', 'timezone', 'latitude', 'longitude']) ||
		!validSolarCity(v.returnLocation.city) ||
		!validWeekTimezone(v.returnLocation.timezone) ||
		!coordinate(v.returnLocation.latitude, 90) ||
		!coordinate(v.returnLocation.longitude, 180) ||
		(hasContext && !validReportedContext(v.context)) ||
		(hasDates &&
			(!object(v.importantDates) ||
				Object.keys(v.importantDates).length !== 2 ||
				!keysOnly(v.importantDates, ['authorization', 'entries']) ||
				v.importantDates.authorization !== SOLAR_IMPORTANT_DATES_AUTHORIZATION ||
				!validSolarImportantDates(v.importantDates.entries, v.targetDate))) ||
		!object(v.consent) ||
		Object.keys(v.consent).length !== 4 ||
		v.consent.storage !== true ||
		v.consent.policyVersion !== 'atv-input-consent/1' ||
		v.consent.partner !== false ||
		v.consent.continuity !== false
	)
		return null;
	return structuredClone(v) as unknown as SolarReturnRequestInput;
}
