export const NATAL_REQUEST_VERSION = 'atv-natal-request/1';
export const CAREER_REQUEST_VERSION = 'atv-natal-request/2';
export const CAREER_CONTEXT_LIMIT = 1200;
/** Preserve the exact reported text; reject controls and invalid Unicode before allocation. */
export const validCareerContext = (v: unknown): v is string =>
	typeof v === 'string' &&
	v.trim().length > 0 &&
	v.length <= CAREER_CONTEXT_LIMIT &&
	![...v].some((c) => {
		const code = c.codePointAt(0)!;
		return (
			(code < 32 && ![9, 10, 13].includes(code)) ||
			(code >= 127 && code <= 159) ||
			(code >= 0xd800 && code <= 0xdfff)
		);
	});
export const natalProducts = [
	'birth-chart',
	'three-pillars',
	'ascendant',
	'midheaven',
	'career-compass'
] as const;
export type NatalProduct = (typeof natalProducts)[number];
export interface NatalRequestInput {
	version: typeof NATAL_REQUEST_VERSION | typeof CAREER_REQUEST_VERSION;
	productId: NatalProduct;
	context?: string;
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
	if (!object(v)) return null;
	const career = v.version === CAREER_REQUEST_VERSION && v.productId === 'career-compass';
	const hasContext = Object.hasOwn(v, 'context');
	if (
		Object.keys(v).length !== (career && hasContext ? 5 : 4) ||
		Object.keys(v).some(
			(key) =>
				![
					'version',
					'productId',
					'expectedRevision',
					'consent',
					...(career ? ['context'] : [])
				].includes(key)
		) ||
		(v.version !== NATAL_REQUEST_VERSION && !career) ||
		(hasContext && (!career || !validCareerContext(v.context))) ||
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
