import { validDate } from '@atv/domain';
import { validReportedContext } from './reported-context';

export const PERSONAL_CALENDAR_REQUEST_VERSION = 'atv-personal-calendar-request/1';
export const PERSONAL_CALENDAR_MARKS_AUTHORIZATION = 'atv-personal-calendar-marks/1';
export const PERSONAL_CALENDAR_MARKS_LIMIT = 5;

export interface CalendarMark {
	date: string;
	label: string;
}

const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
const keysOnly = (v: Record<string, unknown>, fields: string[]) =>
	Object.keys(v).every((key) => fields.includes(key));

export function validCalendarMarks(v: unknown, targetDate: string): v is CalendarMark[] {
	if (
		!Array.isArray(v) ||
		v.length < 1 ||
		v.length > PERSONAL_CALENDAR_MARKS_LIMIT ||
		!validDate(targetDate) ||
		targetDate.slice(8) !== '01'
	)
		return false;
	const nextMonth = new Date(
		Date.UTC(Number(targetDate.slice(0, 4)), Number(targetDate.slice(5, 7)), 1)
	)
		.toISOString()
		.slice(0, 10);
	const seen = new Set<string>();
	return v.every((entry) => {
		if (
			!object(entry) ||
			Object.keys(entry).length !== 2 ||
			!keysOnly(entry, ['date', 'label']) ||
			!validDate(entry.date) ||
			entry.date < targetDate ||
			entry.date >= nextMonth ||
			typeof entry.label !== 'string' ||
			entry.label.trim().length === 0 ||
			entry.label.length > 80 ||
			[...entry.label].some((c) => {
				const code = c.codePointAt(0)!;
				return code < 32 || (code >= 127 && code <= 159) || (code >= 0xd800 && code <= 0xdfff);
			}) ||
			seen.has(entry.date)
		)
			return false;
		seen.add(entry.date);
		return true;
	});
}

export interface PersonalCalendarRequestInput {
	version: typeof PERSONAL_CALENDAR_REQUEST_VERSION;
	productId: 'personal-calendar';
	expectedRevision: number;
	targetDate: string;
	context?: string;
	calendarMarks?: {
		authorization: typeof PERSONAL_CALENDAR_MARKS_AUTHORIZATION;
		entries: CalendarMark[];
	};
	consent: {
		storage: true;
		policyVersion: 'atv-input-consent/1';
		partner: false;
		continuity: false;
	};
}

export function parsePersonalCalendarRequestInput(v: unknown): PersonalCalendarRequestInput | null {
	if (
		!object(v) ||
		!keysOnly(v, [
			'version',
			'productId',
			'expectedRevision',
			'targetDate',
			'context',
			'calendarMarks',
			'consent'
		])
	)
		return null;
	const hasContext = Object.hasOwn(v, 'context');
	const hasMarks = Object.hasOwn(v, 'calendarMarks');
	if (
		Object.keys(v).length !== 5 + Number(hasContext) + Number(hasMarks) ||
		v.version !== PERSONAL_CALENDAR_REQUEST_VERSION ||
		v.productId !== 'personal-calendar' ||
		!Number.isInteger(v.expectedRevision) ||
		Number(v.expectedRevision) < 1 ||
		Number(v.expectedRevision) >= 2147483647 ||
		!validDate(v.targetDate) ||
		v.targetDate.slice(8) !== '01' ||
		(hasContext && !validReportedContext(v.context)) ||
		(hasMarks &&
			(!object(v.calendarMarks) ||
				Object.keys(v.calendarMarks).length !== 2 ||
				!keysOnly(v.calendarMarks, ['authorization', 'entries']) ||
				v.calendarMarks.authorization !== PERSONAL_CALENDAR_MARKS_AUTHORIZATION ||
				!validCalendarMarks(v.calendarMarks.entries, v.targetDate))) ||
		!object(v.consent) ||
		Object.keys(v.consent).length !== 4 ||
		v.consent.storage !== true ||
		v.consent.policyVersion !== 'atv-input-consent/1' ||
		v.consent.partner !== false ||
		v.consent.continuity !== false
	)
		return null;
	return structuredClone(v) as unknown as PersonalCalendarRequestInput;
}
