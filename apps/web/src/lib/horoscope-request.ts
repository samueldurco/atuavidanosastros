import { validDate } from '@atv/domain';
import { validReportedContext } from './reported-context';
export const HOROSCOPE_REQUEST_VERSION = 'atv-horoscope-request/1';
export interface HoroscopeRequestInput {
	version: typeof HOROSCOPE_REQUEST_VERSION;
	productId: 'horoscope';
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
const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
export function parseHoroscopeRequestInput(v: unknown): HoroscopeRequestInput | null {
	if (!object(v)) return null;
	const hasContext = Object.hasOwn(v, 'context');
	if (
		Object.keys(v).length !== (hasContext ? 6 : 5) ||
		Object.keys(v).some(
			(key) =>
				!['version', 'productId', 'expectedRevision', 'targetDate', 'consent', 'context'].includes(
					key
				)
		) ||
		v.version !== HOROSCOPE_REQUEST_VERSION ||
		v.productId !== 'horoscope' ||
		(hasContext && !validReportedContext(v.context)) ||
		typeof v.expectedRevision !== 'number' ||
		!Number.isInteger(v.expectedRevision) ||
		v.expectedRevision < 1 ||
		v.expectedRevision >= 2147483647 ||
		!validDate(v.targetDate) ||
		!object(v.consent) ||
		Object.keys(v.consent).length !== 4 ||
		v.consent.storage !== true ||
		v.consent.policyVersion !== 'atv-input-consent/1' ||
		v.consent.partner !== false ||
		v.consent.continuity !== false
	)
		return null;
	return structuredClone(v) as unknown as HoroscopeRequestInput;
}
