import type { BirthInput } from '@atv/domain';

export const ONBOARDING_VERSION = 'atv-onboarding/1';
export const NATAL_CONSENT_VERSION = 'atv-natal-storage/1';
export interface NatalProfileInput extends BirthInput {
	timePrecision: 'EXACT' | 'APPROXIMATE';
	locationLabel: string;
	countryCode: string;
}
export type OnboardingCommand = {
	version: typeof ONBOARDING_VERSION;
	expectedRevision: number;
} & (
	| { action: 'begin' | 'forget-natal' }
	| {
			action: 'save-natal';
			natal: NatalProfileInput;
			consent: { storage: true; policyVersion: typeof NATAL_CONSENT_VERSION };
	  }
);
export interface OnboardingSnapshot {
	version: typeof ONBOARDING_VERSION;
	revision: number;
	state: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
	natal: (NatalProfileInput & { version: number }) | null;
}
const object = (v: unknown): v is Record<string, unknown> =>
	!!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) =>
	Object.keys(v).length === allowed.length && Object.keys(v).every((key) => allowed.includes(key));
const text = (v: unknown, max: number): v is string =>
	typeof v === 'string' &&
	v.trim().length > 0 &&
	v.length <= max &&
	[...v].every((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127);
const revision = (v: unknown): v is number =>
	typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 2147483647;
const natalKeys = [
	'localDateTime',
	'utcInstant',
	'timezone',
	'latitude',
	'longitude',
	'locationSource',
	'timePrecision',
	'locationLabel',
	'countryCode'
];
/** Structure only; the database independently validates calendar and civil/UTC correspondence. */
function natal(v: unknown, saved = false): boolean {
	return (
		object(v) &&
		keys(v, saved ? [...natalKeys, 'version'] : natalKeys) &&
		(!saved || (revision(v.version) && v.version > 0)) &&
		typeof v.localDateTime === 'string' &&
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/.test(v.localDateTime) &&
		typeof v.utcInstant === 'string' &&
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v.utcInstant) &&
		text(v.timezone, 80) &&
		(v.timezone === 'UTC' || /^[A-Za-z_]+\/[A-Za-z0-9_+\-/]+$/.test(v.timezone)) &&
		typeof v.latitude === 'number' &&
		Number.isFinite(v.latitude) &&
		Math.abs(v.latitude) <= 90 &&
		typeof v.longitude === 'number' &&
		Number.isFinite(v.longitude) &&
		Math.abs(v.longitude) <= 180 &&
		text(v.locationSource, 80) &&
		text(v.locationLabel, 200) &&
		typeof v.countryCode === 'string' &&
		/^[A-Z]{2}$/.test(v.countryCode) &&
		typeof v.timePrecision === 'string' &&
		['EXACT', 'APPROXIMATE'].includes(v.timePrecision)
	);
}
export function parseOnboardingCommand(v: unknown): OnboardingCommand | null {
	if (
		!object(v) ||
		v.version !== ONBOARDING_VERSION ||
		!revision(v.expectedRevision) ||
		v.expectedRevision >= 2147483646
	)
		return null;
	const base = ['version', 'expectedRevision', 'action'];
	if (v.action === 'begin' || v.action === 'forget-natal')
		return keys(v, base) ? (structuredClone(v) as OnboardingCommand) : null;
	if (
		v.action !== 'save-natal' ||
		!keys(v, [...base, 'natal', 'consent']) ||
		!natal(v.natal) ||
		!object(v.consent) ||
		!keys(v.consent, ['storage', 'policyVersion']) ||
		v.consent.storage !== true ||
		v.consent.policyVersion !== NATAL_CONSENT_VERSION
	)
		return null;
	return structuredClone(v) as OnboardingCommand;
}
export function parseOnboardingSnapshot(v: unknown): OnboardingSnapshot | null {
	if (
		!object(v) ||
		!keys(v, ['version', 'revision', 'state', 'natal']) ||
		v.version !== ONBOARDING_VERSION ||
		!revision(v.revision) ||
		typeof v.state !== 'string' ||
		!['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'].includes(v.state) ||
		(v.natal !== null && !natal(v.natal, true)) ||
		(v.state === 'COMPLETE') !== (v.natal !== null) ||
		(object(v.natal) && Number(v.natal.version) > v.revision)
	)
		return null;
	return structuredClone(v) as unknown as OnboardingSnapshot;
}
