import type { BirthInput } from '@atv/domain';
import { validReportedContext } from './reported-context';

export const PAIR_REQUEST_VERSION = 'atv-pair-request/1';
export const SYNASTRY_REQUEST_VERSION = 'atv-pair-request/2';
export const COUPLE_DOSSIER_REQUEST_VERSION = 'atv-pair-request/3';
export interface PairRequestInput {
	version:
		| typeof PAIR_REQUEST_VERSION
		| typeof SYNASTRY_REQUEST_VERSION
		| typeof COUPLE_DOSSIER_REQUEST_VERSION;
	productId: 'pair-preview' | 'synastry' | 'couple-dossier';
	context?: string;
	expectedRevision: number;
	partner: BirthInput & { timePrecision: 'EXACT' };
	consent: {
		storage: true;
		policyVersion: 'atv-input-consent/1';
		partner: true;
		continuity: false;
	};
	partnerConsent: {
		storage: true;
		policyVersion: 'atv-partner-storage/1';
		permissionDeclared: true;
		sharing: false;
	};
}
const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, expected: string[]) =>
	Object.keys(v).length === expected.length &&
	Object.keys(v).every((key) => expected.includes(key));
const text = (v: unknown, max: number): v is string =>
	typeof v === 'string' &&
	v.trim().length > 0 &&
	v.length <= max &&
	![...v].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/;
const utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
export function parsePairRequestInput(v: unknown): PairRequestInput | null {
	const contextualPair =
		object(v) &&
		((v.version === SYNASTRY_REQUEST_VERSION && v.productId === 'synastry') ||
			(v.version === COUPLE_DOSSIER_REQUEST_VERSION && v.productId === 'couple-dossier'));
	if (
		!object(v) ||
		!keys(v, [
			'version',
			'productId',
			'expectedRevision',
			'partner',
			'consent',
			'partnerConsent',
			...(contextualPair && Object.hasOwn(v, 'context') ? ['context'] : [])
		]) ||
		(!contextualPair && (v.version !== PAIR_REQUEST_VERSION || v.productId !== 'pair-preview')) ||
		(Object.hasOwn(v, 'context') && (!contextualPair || !validReportedContext(v.context))) ||
		typeof v.expectedRevision !== 'number' ||
		!Number.isInteger(v.expectedRevision) ||
		v.expectedRevision < 1 ||
		v.expectedRevision >= 2147483647 ||
		!object(v.partner) ||
		!keys(v.partner, [
			'localDateTime',
			'utcInstant',
			'timezone',
			'latitude',
			'longitude',
			'locationSource',
			'timePrecision'
		])
	)
		return null;
	const p = v.partner;
	if (
		p.timePrecision !== 'EXACT' ||
		!text(p.localDateTime, 23) ||
		!local.test(p.localDateTime) ||
		!text(p.utcInstant, 24) ||
		!utc.test(p.utcInstant) ||
		!text(p.timezone, 80) ||
		(p.timezone !== 'UTC' && !/^[A-Za-z_]+\/[A-Za-z0-9_+/-]+$/.test(p.timezone)) ||
		!text(p.locationSource, 80) ||
		typeof p.latitude !== 'number' ||
		!Number.isFinite(p.latitude) ||
		Math.abs(p.latitude) > 90 ||
		typeof p.longitude !== 'number' ||
		!Number.isFinite(p.longitude) ||
		Math.abs(p.longitude) > 180 ||
		!object(v.consent) ||
		!keys(v.consent, ['storage', 'policyVersion', 'partner', 'continuity']) ||
		v.consent.storage !== true ||
		v.consent.policyVersion !== 'atv-input-consent/1' ||
		v.consent.partner !== true ||
		v.consent.continuity !== false ||
		!object(v.partnerConsent) ||
		!keys(v.partnerConsent, ['storage', 'policyVersion', 'permissionDeclared', 'sharing']) ||
		v.partnerConsent.storage !== true ||
		v.partnerConsent.policyVersion !== 'atv-partner-storage/1' ||
		v.partnerConsent.permissionDeclared !== true ||
		v.partnerConsent.sharing !== false
	)
		return null;
	// Calendar and civil/UTC consistency are also enforced by SQL before persistence.
	return structuredClone(v) as unknown as PairRequestInput;
}
