import { parseLaunchInput, prepareLaunchEvidence } from '@atv/domain';
import type { LaunchFactCalculation } from './launch-calculation';
import type { LaunchReading, LaunchReadingReview } from '../trials/launch-reading';

export type LaunchRuntimeRequest =
	| { operation: 'launch-calculation'; input: unknown; executionId: string }
	| { operation: 'launch-generate'; input: unknown; calculation: LaunchFactCalculation }
	| {
			operation: 'launch-verify';
			input: unknown;
			calculation: LaunchFactCalculation;
			reading: LaunchReading;
	  };
export type LaunchRuntimeResult =
	| {
			version: 'atv-launch-runtime-result/1';
			operation: 'launch-calculation';
			calculation: LaunchFactCalculation;
			calculationDigest: string;
	  }
	| {
			version: 'atv-launch-runtime-result/1';
			operation: 'launch-generate';
			reading: LaunchReading;
			review: LaunchReadingReview;
			calculationDigest: string;
			readingDigest: string;
	  }
	| {
			version: 'atv-launch-runtime-result/1';
			operation: 'launch-verify';
			review: LaunchReadingReview;
			calculationDigest: string;
			readingDigest: string;
	  };

const record = (value: unknown): value is Record<string, unknown> =>
	Boolean(value && typeof value === 'object' && !Array.isArray(value));
const strings = (value: unknown): value is string[] =>
	Array.isArray(value) && value.every((entry) => typeof entry === 'string');
const canonical = (value: unknown): string => {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (record(value))
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
			.join(',')}}`;
	return JSON.stringify(value) ?? 'null';
};
/** Lightweight integrity binding; semantic review runs only in the CPU runtime. */
export async function launchRuntimeDigest(value: unknown): Promise<string> {
	const bytes = new TextEncoder().encode(canonical(value));
	return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

export function isLaunchRuntimeOperation(value: unknown): value is LaunchRuntimeRequest {
	return (
		record(value) &&
		['launch-calculation', 'launch-generate', 'launch-verify'].includes(String(value.operation))
	);
}

/** Reject extra fields before privileged computation; identity and persistence remain on Pages. */
export async function parseLaunchRuntimeRequest(value: unknown): Promise<LaunchRuntimeRequest> {
	if (!isLaunchRuntimeOperation(value)) throw new Error('Confira a solicitação de lançamento.');
	const allowed =
		value.operation === 'launch-calculation'
			? ['operation', 'input', 'executionId']
			: value.operation === 'launch-generate'
				? ['operation', 'input', 'calculation']
				: ['operation', 'input', 'calculation', 'reading'];
	if (Object.keys(value).some((key) => !allowed.includes(key)))
		throw new Error('Confira a solicitação de lançamento.');
	const input = parseLaunchInput(value.input);
	if (!input) throw new Error('Confira os dados e consentimentos do lançamento.');
	const executionId =
		value.operation === 'launch-calculation' ? value.executionId : value.calculation?.executionId;
	const prepared = await prepareLaunchEvidence(input, executionId);
	if (value.operation !== 'launch-calculation' && !validCalculation(value.calculation, prepared))
		throw new Error('Salve os fatos válidos antes de compor a leitura.');
	if (value.operation === 'launch-verify' && !validReading(value.reading, value.calculation))
		throw new Error('Confira a edição salva para revisão.');
	return { ...value, input };
}

function validCalculation(
	value: unknown,
	expected: { executionId: string; productId: string; inputDigest: string }
): value is LaunchFactCalculation {
	if (!record(value) || !record(value.provenance) || !record(value.data)) return false;
	const facts = value.facts;
	const provenance = value.provenance;
	return (
		value.version === 'atv-launch-calculation/1' &&
		value.state === 'FACTS_READY_AWAITING_REVIEW' &&
		value.executionId === expected.executionId &&
		value.productId === expected.productId &&
		value.inputDigest === expected.inputDigest &&
		strings(value.limits) &&
		Array.isArray(facts) &&
		facts.length > 0 &&
		facts.length <= 5000 &&
		facts.every(
			(fact) =>
				record(fact) &&
				typeof fact.id === 'string' &&
				['reported', 'calculated', 'drawn'].includes(String(fact.kind)) &&
				typeof fact.display === 'string' &&
				typeof fact.source === 'string'
		) &&
		new Set(facts.map((fact) => fact.id)).size === facts.length &&
		provenance.calculation ===
			(['ex-tarot', 'financial-blocks-tarot'].includes(expected.productId)
				? 'deterministic-tarot'
				: 'experimental-astrology') &&
		provenance.persistence === 'required-before-reading' &&
		provenance.editorial === 'not-reviewed'
	);
}

function validReading(value: unknown, calculation: LaunchFactCalculation): value is LaunchReading {
	if (!record(value) || !record(value.provenance)) return false;
	const provenance = value.provenance;
	return (
		value.version === 'atv-launch-reading/1' &&
		value.executionId === calculation.executionId &&
		value.productId === calculation.productId &&
		value.inputDigest === calculation.inputDigest &&
		['title', 'summary', 'practicalAction', 'reflection'].every(
			(key) => typeof value[key] === 'string'
		) &&
		strings(value.limits) &&
		Array.isArray(value.sections) &&
		value.sections.length > 0 &&
		value.sections.every(
			(section) =>
				record(section) &&
				typeof section.id === 'string' &&
				typeof section.title === 'string' &&
				strings(section.paragraphs) &&
				strings(section.evidenceIds) &&
				strings(section.sourceIds)
		) &&
		Array.isArray(value.claims) &&
		value.claims.every(
			(claim) =>
				record(claim) &&
				['id', 'sectionId', 'rule', 'interpretation'].every(
					(key) => typeof claim[key] === 'string'
				) &&
				strings(claim.evidenceIds) &&
				record(claim.factors)
		) &&
		provenance.policyVersion === 'atv-launch-private-editorial-policy/1' &&
		provenance.calculationVersion === calculation.version &&
		provenance.calculation === calculation.provenance.calculation &&
		provenance.composition === 'local-versioned-editorial-corpus' &&
		provenance.externalModelCalled === false &&
		provenance.persistence === 'server-must-load-persisted-facts-before-composition' &&
		Array.isArray(provenance.sources) &&
		provenance.sources.every(
			(source) =>
				record(source) &&
				['id', 'version', 'origin'].every((key) => typeof source[key] === 'string')
		)
	);
}

function validReview(
	value: unknown,
	calculation: LaunchFactCalculation,
	readingDigest: string
): value is LaunchReadingReview {
	if (!record(value) || !record(value.provenance)) return false;
	return (
		value.version === 'atv-launch-reading-review/1' &&
		['APPROVED_FOR_PRIVATE_TEST', 'REJECTED'].includes(String(value.status)) &&
		value.policyVersion === 'atv-launch-private-editorial-policy/1' &&
		value.digest === readingDigest &&
		strings(value.reasons) &&
		Array.isArray(value.checks) &&
		value.checks.length > 0 &&
		value.checks.every(
			(item) =>
				record(item) &&
				typeof item.id === 'string' &&
				typeof item.passed === 'boolean' &&
				typeof item.detail === 'string'
		) &&
		(value.status !== 'APPROVED_FOR_PRIVATE_TEST' ||
			(value.reasons.length === 0 && value.checks.every((item) => item.passed))) &&
		value.provenance.scope === 'private-editorial-consistency' &&
		value.provenance.calculation === calculation.provenance.calculation &&
		value.provenance.commercialPrecisionApproved === false &&
		value.provenance.commercialReleaseApproved === false &&
		value.provenance.storageAndAccessVerifiedBy === 'separate-server-and-database-gates'
	);
}

/** Authenticate transport separately, then bind every returned edition to this persisted request. */
export async function validateLaunchRuntimeResult(
	request: LaunchRuntimeRequest,
	value: unknown
): Promise<LaunchRuntimeResult> {
	const parsed = await parseLaunchRuntimeRequest(request);
	if (
		!record(value) ||
		value.version !== 'atv-launch-runtime-result/1' ||
		value.operation !== parsed.operation
	)
		throw new Error('invalid_launch_runtime_response');
	if (parsed.operation === 'launch-calculation') {
		const input = parseLaunchInput(parsed.input)!;
		const prepared = await prepareLaunchEvidence(input, parsed.executionId);
		if (
			!validCalculation(value.calculation, prepared) ||
			value.calculationDigest !== (await launchRuntimeDigest(value.calculation))
		)
			throw new Error('invalid_launch_runtime_calculation');
	} else {
		if (value.calculationDigest !== (await launchRuntimeDigest(parsed.calculation)))
			throw new Error('invalid_launch_runtime_calculation_binding');
		const reading = parsed.operation === 'launch-verify' ? parsed.reading : value.reading;
		if (!validReading(reading, parsed.calculation))
			throw new Error('invalid_launch_runtime_reading');
		const digest = await launchRuntimeDigest(reading);
		if (value.readingDigest !== digest || !validReview(value.review, parsed.calculation, digest))
			throw new Error('invalid_launch_runtime_review');
	}
	return value as LaunchRuntimeResult;
}
