import { validAtlasPriorities } from '@atv/domain';
import { REPORTED_CONTEXT_LIMIT, validReportedContext } from './reported-context';

export const NATAL_REQUEST_VERSION = 'atv-natal-request/1';
export const CAREER_REQUEST_VERSION = 'atv-natal-request/2';
export const PURPOSE_CAREER_REQUEST_VERSION = 'atv-natal-request/3';
export const LIFE_ATLAS_REQUEST_VERSION = 'atv-natal-request/4';
export const CAREER_CONTEXT_LIMIT = REPORTED_CONTEXT_LIMIT;
export const validCareerContext = validReportedContext;
export const natalProducts = [
	'birth-chart',
	'three-pillars',
	'ascendant',
	'midheaven',
	'career-compass',
	'purpose-career',
	'life-atlas'
] as const;
export type NatalProduct = (typeof natalProducts)[number];
export interface NatalRequestInput {
	version:
		| typeof NATAL_REQUEST_VERSION
		| typeof CAREER_REQUEST_VERSION
		| typeof PURPOSE_CAREER_REQUEST_VERSION
		| typeof LIFE_ATLAS_REQUEST_VERSION;
	productId: NatalProduct;
	context?: string;
	atlas?: { priorities: [string, string, string, string] };
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
	const career =
		(v.version === CAREER_REQUEST_VERSION && v.productId === 'career-compass') ||
		(v.version === PURPOSE_CAREER_REQUEST_VERSION && v.productId === 'purpose-career');
	const atlas = v.version === LIFE_ATLAS_REQUEST_VERSION && v.productId === 'life-atlas';
	const contextual = career || atlas;
	const hasContext = Object.hasOwn(v, 'context');
	if (
		Object.keys(v).length !== 4 + (atlas ? 1 : 0) + (contextual && hasContext ? 1 : 0) ||
		Object.keys(v).some(
			(key) =>
				![
					'version',
					'productId',
					'expectedRevision',
					'consent',
					...(contextual ? ['context'] : []),
					...(atlas ? ['atlas'] : [])
				].includes(key)
		) ||
		(v.version !== NATAL_REQUEST_VERSION && !contextual) ||
		(v.version === NATAL_REQUEST_VERSION &&
			['purpose-career', 'life-atlas'].includes(String(v.productId))) ||
		(hasContext && (!contextual || !validCareerContext(v.context))) ||
		(atlas &&
			(!object(v.atlas) ||
				Object.keys(v.atlas).length !== 1 ||
				!validAtlasPriorities(v.atlas.priorities))) ||
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
