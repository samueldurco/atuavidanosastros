import { validDate } from '@atv/domain';
import { validReportedContext } from './reported-context';
export const WEEK_REQUEST_VERSION = 'atv-week-reading-request/1';
export const WEEK_PREFERENCES_REQUEST_VERSION = 'atv-week-reading-request/2';
export const WEEK_CONTEXT_LIMIT = 900;
export const WEEK_THEMES = {
	general: 'Visão geral',
	relationships: 'Conversas e vínculos',
	priorities: 'Organização e prioridades',
	care: 'Ritmo e cuidado cotidiano'
} as const;
export type WeekTheme = keyof typeof WEEK_THEMES;
export const validWeekTheme = (v: unknown): v is WeekTheme =>
	typeof v === 'string' && Object.hasOwn(WEEK_THEMES, v);
export function validWeekTimezone(v: unknown): v is string {
	if (
		typeof v !== 'string' ||
		v.length > 64 ||
		!(v === 'UTC' || /^[A-Z][A-Za-z_]*(?:\/[A-Z][A-Za-z0-9_+-]*)+$/.test(v))
	)
		return false;
	try {
		new Intl.DateTimeFormat('en', { timeZone: v }).format(0);
		return true;
	} catch {
		return false;
	}
}
interface WeekRequestCommon {
	productId: 'week-reading';
	expectedRevision: number;
	targetDate: string;
	context?: string;
	consent: {
		storage: true;
		policyVersion: 'atv-input-consent/1';
		partner: false;
		continuity: false;
	};
}
export type WeekRequestInput = WeekRequestCommon &
	(
		| { version: typeof WEEK_REQUEST_VERSION }
		| {
				version: typeof WEEK_PREFERENCES_REQUEST_VERSION;
				timezone: string;
				theme: WeekTheme;
		  }
	);
const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
export function parseWeekRequestInput(v: unknown): WeekRequestInput | null {
	if (!object(v)) return null;
	const hasContext = Object.hasOwn(v, 'context');
	const preferences = v.version === WEEK_PREFERENCES_REQUEST_VERSION;
	const fields = ['version', 'productId', 'expectedRevision', 'targetDate', 'consent', 'context'];
	if (preferences) fields.push('timezone', 'theme');
	if (
		Object.keys(v).length !== (hasContext ? 6 : 5) + (preferences ? 2 : 0) ||
		Object.keys(v).some((key) => !fields.includes(key)) ||
		(!preferences && v.version !== WEEK_REQUEST_VERSION) ||
		(preferences && (!validWeekTimezone(v.timezone) || !validWeekTheme(v.theme))) ||
		v.productId !== 'week-reading' ||
		(hasContext &&
			(!validReportedContext(v.context) ||
				(preferences && v.context.length > WEEK_CONTEXT_LIMIT))) ||
		typeof v.expectedRevision !== 'number' ||
		!Number.isInteger(v.expectedRevision) ||
		v.expectedRevision < 1 ||
		v.expectedRevision >= 2147483647 ||
		!validDate(v.targetDate) ||
		v.targetDate > '2099-12-25' ||
		!object(v.consent) ||
		Object.keys(v.consent).length !== 4 ||
		v.consent.storage !== true ||
		v.consent.policyVersion !== 'atv-input-consent/1' ||
		v.consent.partner !== false ||
		v.consent.continuity !== false
	)
		return null;
	return structuredClone(v) as unknown as WeekRequestInput;
}
