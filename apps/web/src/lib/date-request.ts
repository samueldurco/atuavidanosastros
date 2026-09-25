import { validDate } from '@atv/domain';

export const DATE_REQUEST_VERSION = 'atv-date-request/1';
export interface DateRequestInput {
	version: typeof DATE_REQUEST_VERSION;
	productId: 'date-reading';
	expectedRevision: number;
	targetDate: string;
	consent: {
		storage: true;
		policyVersion: 'atv-input-consent/1';
		partner: false;
		continuity: false;
	};
}
const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
export function parseDateRequestInput(v: unknown): DateRequestInput | null {
	if (
		!object(v) ||
		Object.keys(v).length !== 5 ||
		Object.keys(v).some(
			(key) => !['version', 'productId', 'expectedRevision', 'targetDate', 'consent'].includes(key)
		) ||
		v.version !== DATE_REQUEST_VERSION ||
		v.productId !== 'date-reading' ||
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
	return structuredClone(v) as unknown as DateRequestInput;
}
