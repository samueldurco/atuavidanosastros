export const NATAL_REQUEST_VERSION = 'atv-natal-request/1';
export const natalProducts = ['birth-chart', 'three-pillars', 'ascendant', 'midheaven'] as const;
export type NatalProduct = (typeof natalProducts)[number];
export interface NatalRequestInput {
	version: typeof NATAL_REQUEST_VERSION;
	productId: NatalProduct;
	expectedRevision: number;
	consent: {
		storage: true;
		policyVersion: 'atv-input-consent/1';
		partner: false;
		continuity: false;
	};
}
const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
export function parseNatalRequestInput(v: unknown): NatalRequestInput | null {
	if (
		!object(v) ||
		Object.keys(v).length !== 4 ||
		Object.keys(v).some(
			(key) => !['version', 'productId', 'expectedRevision', 'consent'].includes(key)
		) ||
		v.version !== NATAL_REQUEST_VERSION ||
		!natalProducts.includes(v.productId as NatalProduct) ||
		typeof v.expectedRevision !== 'number' ||
		!Number.isInteger(v.expectedRevision) ||
		v.expectedRevision < 1 ||
		v.expectedRevision >= 2147483647 ||
		!object(v.consent) ||
		Object.keys(v.consent).length !== 4 ||
		v.consent.storage !== true ||
		v.consent.policyVersion !== 'atv-input-consent/1' ||
		v.consent.partner !== false ||
		v.consent.continuity !== false
	)
		return null;
	return structuredClone(v) as unknown as NatalRequestInput;
}
