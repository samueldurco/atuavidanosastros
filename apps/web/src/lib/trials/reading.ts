import { composeLegacyTrialReading } from './legacy-reading';
import {
	composeTrialReading as composeV2,
	CONTENT_VERSION as V2,
	POLICY_VERSION as POLICY_V2
} from './editorial-reading';
import {
	composeTrialReading as composeV3,
	CONTENT_VERSION as V3,
	POLICY_VERSION as POLICY_V3
} from './experience-reading';
import {
	composeReconstructedCareer,
	reviewReconstructedCareer,
	RECONSTRUCTION_VERSION,
	RECONSTRUCTION_POLICY,
	type EditorialTrace
} from './reconstruction/career';
import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { trialProfiles, TRIAL_CONTENT_VERSION, TRIAL_POLICY_VERSION } from './content';
import { composeReconstructedNatal, reviewReconstructedNatal } from './reconstruction/natal';
import { composeReconstructedTarot, reviewReconstructedTarot } from './reconstruction/tarot';
import { composeReconstructedDate, reviewReconstructedDate } from './reconstruction/date';
import { DATE_VERSION } from './reconstruction/date-facts';
import { PAIR_VERSION } from './reconstruction/pair-facts';
import { composeReconstructedPair, reviewReconstructedPair } from './reconstruction/pair';
import { SYNASTRY_VERSION } from './reconstruction/synastry-facts';
import {
	composeReconstructedSynastry,
	reviewReconstructedSynastry
} from './reconstruction/synastry';

export type TrialReading = {
	version: string;
	productId: string;
	title: string;
	opening: string;
	source: string;
	sections: { title: string; text: string; factIds: string[] }[];
	questions: string[];
	practice: string;
	limits: string[];
	editorial?: EditorialTrace;
};
export type TrialApproval = {
	status: 'approved';
	scope: 'private-free-test';
	policy: string;
	digest: string;
};
export type SavedTrial = {
	id: string;
	product_id: string;
	created_at: string;
	input: WorkflowInput;
	calculation: CalculationSnapshot;
	reading: TrialReading;
	approval: TrialApproval;
};
export type TrialFeedback = {
	product_id: string;
	reading_id: string;
	decision: 'approved' | 'rejected';
	comment: string;
	updated_at: string;
};

export function composeTrialReading(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	if (calculation.version === DATE_VERSION) return composeReconstructedDate(input, calculation);
	if (calculation.version === PAIR_VERSION) return composeReconstructedPair(input, calculation);
	if (calculation.version === SYNASTRY_VERSION)
		return composeReconstructedSynastry(input, calculation);
	if (calculation.version === 'atv-tarot-method-calculation/2.0.0')
		return composeReconstructedTarot(input, calculation);
	if (calculation.version === 'atv-private-natal-synthesis/4.0.0')
		return composeReconstructedNatal(input, calculation);
	return ['career-compass', 'purpose-career'].includes(input.productId) &&
		calculation.version === 'atv-private-career-synthesis/4.0.0'
		? composeReconstructedCareer(input, calculation)
		: composeV3(input, calculation);
}

export function canonical(value: unknown): string {
	if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
	if (value && typeof value === 'object')
		return (
			'{' +
			Object.entries(value)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
				.join(',') +
			'}'
		);
	return JSON.stringify(value);
}

/** Server-owned deterministic review. Neither a client flag nor a hash authenticates a reading. */
export async function approveTrialReading(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	candidate: TrialReading
): Promise<TrialApproval | null> {
	if (
		!parseWorkflowInput(input) ||
		!trialProfiles[input.productId] ||
		!Array.isArray(calculation.facts) ||
		calculation.facts.length === 0 ||
		calculation.facts.length > 1500 ||
		!calculation.version ||
		!calculation.limits.length
	)
		return null;
	const ids = new Set<string>();
	for (const fact of calculation.facts) {
		if (
			!fact.id ||
			ids.has(fact.id) ||
			!['reported', 'drawn', 'calculated'].includes(fact.kind) ||
			!fact.display?.trim() ||
			!fact.source?.trim()
		)
			return null;
		ids.add(fact.id);
	}
	const legacy = candidate.version === TRIAL_CONTENT_VERSION;
	const previous = candidate.version === V2;
	const v3 = candidate.version === V3;
	const reconstructed = candidate.version === RECONSTRUCTION_VERSION;
	if (!legacy && !previous && !v3 && !reconstructed) return null;
	const expected = legacy
		? composeLegacyTrialReading(input, calculation)
		: previous
			? composeV2(input, calculation)
			: v3
				? composeV3(input, calculation)
				: composeTrialReading(input, calculation);
	if (canonical(candidate) !== canonical(expected)) return null;
	if (
		reconstructed &&
		(calculation.version === SYNASTRY_VERSION
			? reviewReconstructedSynastry(input, calculation, candidate)
			: calculation.version === PAIR_VERSION
				? reviewReconstructedPair(input, calculation, candidate)
				: calculation.version === DATE_VERSION
					? reviewReconstructedDate(input, calculation, candidate)
					: calculation.version === 'atv-tarot-method-calculation/2.0.0'
						? reviewReconstructedTarot(input, calculation, candidate)
						: calculation.version === 'atv-private-natal-synthesis/4.0.0'
							? reviewReconstructedNatal(input, calculation, candidate)
							: reviewReconstructedCareer(input, calculation, candidate)
		).length
	)
		return null;
	if (
		!legacy &&
		(candidate.sections.length < 2 ||
			candidate.sections.length > 60 ||
			new Set(candidate.sections.map((s) => s.title)).size !== candidate.sections.length ||
			new Set(candidate.sections.map((s) => s.text)).size !== candidate.sections.length ||
			candidate.sections.some(
				(s) => !s.title.trim() || /nenhum aspecto|fora do orbe nominal/i.test(s.title)
			) ||
			candidate.questions.length < 2 ||
			!candidate.practice.trim() ||
			!candidate.source.trim())
	)
		return null;
	const policy = legacy
		? TRIAL_POLICY_VERSION
		: previous
			? POLICY_V2
			: v3
				? POLICY_V3
				: RECONSTRUCTION_POLICY;
	if (candidate.sections.some((s) => !s.text.trim() || s.factIds.some((id) => !ids.has(id))))
		return null;
	const covered = new Set(candidate.sections.flatMap((s) => s.factIds));
	if ([...ids].some((id) => !covered.has(id))) return null;
	const payload = canonical({
		policy,
		input,
		calculation,
		reading: candidate
	});
	if (payload.length > 750000) return null;
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
	const digest = [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, '0')).join('');
	return { status: 'approved', scope: 'private-free-test', policy, digest };
}
