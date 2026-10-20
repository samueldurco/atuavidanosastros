import {
	DREAM_ATLAS_CALCULATION,
	DREAM_ATLAS_READING,
	composeDreamAtlas,
	reviewDreamAtlas
} from './dream-atlas-reading';
import {
	DREAM_DOSSIER_CALCULATION,
	DREAM_INTERPRETATION_READING,
	composeDreamInterpretation,
	reviewDreamInterpretation
} from './dream-interpretation';
import { MIDHEAVEN_VERSION, MIDHEAVEN_READING_VERSION } from './reconstruction/midheaven-facts';
import { canonical } from './reconstruction/canonical';
export { canonical } from './reconstruction/canonical';
import {
	composeReconstructedMidheaven,
	reviewReconstructedMidheaven
} from './reconstruction/midheaven';
import { composeLegacyTrialReading } from './legacy-reading';
import {
	PILLARS_VERSION,
	PILLARS_READING_VERSION,
	PILLARS_READING_V5_VERSION
} from './reconstruction/pillars-facts';
import { verifyPillarsOrigin } from './reconstruction/pillars-origin';
import { ASCENDANT_VERSION, ASCENDANT_READING_VERSION } from './reconstruction/ascendant-facts';
import {
	composeReconstructedAscendant,
	reviewReconstructedAscendant
} from './reconstruction/ascendant';
import { BIRTH_VERSION, BIRTH_READING_VERSION } from './reconstruction/birth-facts';
import { composeReconstructedBirth, reviewReconstructedBirth } from './reconstruction/birth';
import { composeReconstructedPillars, reviewReconstructedPillars } from './reconstruction/pillars';
import {
	COMPASS_VERSION,
	COMPASS_READING_VERSION,
	COMPASS_READING_VERSION_V5
} from './reconstruction/compass-facts';
import {
	composeReconstructedPillarsV51,
	reviewReconstructedPillarsV51
} from './reconstruction/pillars-v51';
import { composeReconstructedCompass, reviewReconstructedCompass } from './reconstruction/compass';
import { ATLAS_VERSION } from './reconstruction/atlas-facts';
import { composeReconstructedAtlas, reviewReconstructedAtlas } from './reconstruction/atlas';
import { DIRECTION_VERSION } from './reconstruction/direction-facts';
import {
	composeReconstructedDirection,
	reviewReconstructedDirection
} from './reconstruction/direction';
import { PURPOSE_VERSION } from './reconstruction/purpose-facts';
import { composeReconstructedPurpose, reviewReconstructedPurpose } from './reconstruction/purpose';
import { CALENDAR_VERSION, PERIOD_VERSION } from './reconstruction/calendar-facts';
import { composeThirtyDayReading, reviewThirtyDayReading } from './reconstruction/thirty-day';
import {
	composeReconstructedCalendar,
	reviewReconstructedCalendar
} from './reconstruction/calendar';
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
import { HOROSCOPE_VERSION } from './reconstruction/horoscope-facts';
import { WEEK_VERSION } from './reconstruction/week-facts';
import { SOLAR_VERSION } from './reconstruction/solar-facts';
import { composeReconstructedSolar, reviewReconstructedSolar } from './reconstruction/solar';
import { composeReconstructedWeek, reviewReconstructedWeek } from './reconstruction/week';
import {
	composeReconstructedHoroscope,
	reviewReconstructedHoroscope
} from './reconstruction/horoscope';
import { PAIR_VERSION } from './reconstruction/pair-facts';
import { composeReconstructedPair, reviewReconstructedPair } from './reconstruction/pair';
import { SYNASTRY_VERSION } from './reconstruction/synastry-facts';
import { DOSSIER_VERSION } from './reconstruction/dossier-facts';
import { composeReconstructedDossier, reviewReconstructedDossier } from './reconstruction/dossier';
import {
	composeReconstructedSynastry,
	reviewReconstructedSynastry
} from './reconstruction/synastry';
import { nameCurrentOffer, OFFER_NAME_REVISION } from './offer-names';
import {
	composeCurrentReading,
	isCurrentReadingProduct,
	reviewCurrentReading,
	CURRENT_READING_VERSION,
	CURRENT_REVIEW_POLICY
} from './current';

export type TrialReading = {
	version: string;
	productId: string;
	title: string;
	nameRevision?: typeof OFFER_NAME_REVISION;
	opening: string;
	source: string;
	sections: { title: string; text: string; factIds: string[] }[];
	questions: string[];
	practice: string;
	limits: string[];
	interpretation?: {
		version: 'atv-interpretation-evidence/1';
		family: string;
		conclusions: Array<{ section: number; claim: string; factIds: string[]; relation: string }>;
	};
	editorial?: EditorialTrace | EditorialTrace<import('./reconstruction/career').PeriodContextKey>;
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
	return nameCurrentOffer(
		input,
		isCurrentReadingProduct(input.productId)
			? composeCurrentReading(input, calculation)
			: composeOriginalTrialReading(input, calculation)
	);
}

/** Versioned content before offer naming, retained to verify historical saved payloads. */
export function composeOriginalTrialReading(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	if (calculation.version === DREAM_ATLAS_CALCULATION) return composeDreamAtlas(input, calculation);
	if (input.productId === 'dream-reading' || calculation.version === DREAM_DOSSIER_CALCULATION)
		return composeDreamInterpretation(input, calculation);
	if (calculation.version === PERIOD_VERSION) return composeThirtyDayReading(input, calculation);
	if (calculation.version === MIDHEAVEN_VERSION)
		return composeReconstructedMidheaven(input, calculation);
	if (calculation.version === ASCENDANT_VERSION)
		return composeReconstructedAscendant(input, calculation);
	if (calculation.version === BIRTH_VERSION) return composeReconstructedBirth(input, calculation);
	if (calculation.version === PILLARS_VERSION)
		return composeReconstructedPillarsV51(input, calculation);
	if (calculation.version === COMPASS_VERSION)
		return composeReconstructedCompass(input, calculation);
	if (calculation.version === ATLAS_VERSION) return composeReconstructedAtlas(input, calculation);
	if (calculation.version === DIRECTION_VERSION)
		return composeReconstructedDirection(input, calculation);
	if (calculation.version === PURPOSE_VERSION)
		return composeReconstructedPurpose(input, calculation);
	if (calculation.version === CALENDAR_VERSION)
		return composeReconstructedCalendar(input, calculation);
	if (calculation.version === SOLAR_VERSION) return composeReconstructedSolar(input, calculation);
	if (calculation.version === WEEK_VERSION) return composeReconstructedWeek(input, calculation);
	if (calculation.version === HOROSCOPE_VERSION)
		return composeReconstructedHoroscope(input, calculation);
	if (calculation.version === DOSSIER_VERSION)
		return composeReconstructedDossier(input, calculation);
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

/** Server-owned deterministic review. Neither a client flag nor a hash authenticates a reading. */
export async function approveTrialReading(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	candidate: TrialReading
): Promise<TrialApproval | null> {
	if (
		!parseWorkflowInput(input) ||
		candidate.productId !== input.productId ||
		!trialProfiles[input.productId] ||
		!Array.isArray(calculation.facts) ||
		calculation.facts.length === 0 ||
		calculation.facts.length > 1500 ||
		!calculation.version ||
		!calculation.limits.length
	)
		return null;
	if (
		calculation.version === PILLARS_VERSION &&
		!(await verifyPillarsOrigin(input, calculation)).ok
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
	const current = candidate.version === CURRENT_READING_VERSION;
	const previous = candidate.version === V2;
	const v3 = candidate.version === V3;
	const reconstructed =
		candidate.version === DREAM_INTERPRETATION_READING ||
		candidate.version === DREAM_ATLAS_READING ||
		candidate.version === RECONSTRUCTION_VERSION ||
		candidate.version === COMPASS_READING_VERSION ||
		candidate.version === COMPASS_READING_VERSION_V5 ||
		candidate.version === PILLARS_READING_VERSION ||
		candidate.version === PILLARS_READING_V5_VERSION ||
		candidate.version === BIRTH_READING_VERSION ||
		candidate.version === ASCENDANT_READING_VERSION ||
		candidate.version === MIDHEAVEN_READING_VERSION;
	if (!legacy && !previous && !v3 && !reconstructed && !current) return null;
	const named = Object.hasOwn(candidate, 'nameRevision');
	if (named && candidate.nameRevision !== OFFER_NAME_REVISION) return null;
	let original: TrialReading;
	try {
		original = current
			? composeCurrentReading(input, calculation)
			: legacy
				? composeLegacyTrialReading(input, calculation)
				: previous
					? composeV2(input, calculation)
					: v3
						? composeV3(input, calculation)
						: candidate.version === COMPASS_READING_VERSION_V5 &&
							  calculation.version === COMPASS_VERSION
							? composeReconstructedCompass(input, calculation, 'v5')
							: candidate.version === PILLARS_READING_V5_VERSION &&
								  calculation.version === PILLARS_VERSION
								? composeReconstructedPillars(input, calculation)
								: composeOriginalTrialReading(input, calculation);
	} catch {
		// Invalid factual projections are rejected by the gate, never promoted to a server error.
		return null;
	}
	const expected = named ? nameCurrentOffer(input, original) : original;
	if (canonical(candidate) !== canonical(expected)) return null;
	// Only after the full named payload matches, verify its original content with the
	// historical method reviewers. The final digest below still covers the new title/revision.
	const reviewedContent = original;
	if (current && reviewCurrentReading(calculation, reviewedContent).length) return null;
	if (
		reconstructed &&
		(candidate.version === DREAM_INTERPRETATION_READING
			? reviewDreamInterpretation(input, calculation, reviewedContent)
			: calculation.version === DREAM_ATLAS_CALCULATION
				? reviewDreamAtlas(input, calculation, reviewedContent)
				: calculation.version === PERIOD_VERSION
					? reviewThirtyDayReading(input, calculation, reviewedContent)
					: calculation.version === MIDHEAVEN_VERSION
						? reviewReconstructedMidheaven(input, calculation, reviewedContent)
						: calculation.version === ASCENDANT_VERSION
							? reviewReconstructedAscendant(input, calculation, reviewedContent)
							: calculation.version === BIRTH_VERSION
								? reviewReconstructedBirth(input, calculation, reviewedContent)
								: calculation.version === PILLARS_VERSION
									? candidate.version === PILLARS_READING_V5_VERSION
										? reviewReconstructedPillars(input, calculation, reviewedContent)
										: reviewReconstructedPillarsV51(input, calculation, reviewedContent)
									: calculation.version === COMPASS_VERSION
										? reviewReconstructedCompass(input, calculation, reviewedContent)
										: calculation.version === ATLAS_VERSION
											? reviewReconstructedAtlas(input, calculation, reviewedContent)
											: calculation.version === DIRECTION_VERSION
												? reviewReconstructedDirection(input, calculation, reviewedContent)
												: calculation.version === PURPOSE_VERSION
													? reviewReconstructedPurpose(input, calculation, reviewedContent)
													: calculation.version === CALENDAR_VERSION
														? reviewReconstructedCalendar(input, calculation, reviewedContent)
														: calculation.version === SOLAR_VERSION
															? reviewReconstructedSolar(input, calculation, reviewedContent)
															: calculation.version === WEEK_VERSION
																? reviewReconstructedWeek(input, calculation, reviewedContent)
																: calculation.version === HOROSCOPE_VERSION
																	? reviewReconstructedHoroscope(
																			input,
																			calculation,
																			reviewedContent
																		)
																	: calculation.version === DOSSIER_VERSION
																		? reviewReconstructedDossier(
																				input,
																				calculation,
																				reviewedContent
																			)
																		: calculation.version === SYNASTRY_VERSION
																			? reviewReconstructedSynastry(
																					input,
																					calculation,
																					reviewedContent
																				)
																			: calculation.version === PAIR_VERSION
																				? reviewReconstructedPair(
																						input,
																						calculation,
																						reviewedContent
																					)
																				: calculation.version === DATE_VERSION
																					? reviewReconstructedDate(
																							input,
																							calculation,
																							reviewedContent
																						)
																					: calculation.version ===
																						  'atv-tarot-method-calculation/2.0.0'
																						? reviewReconstructedTarot(
																								input,
																								calculation,
																								reviewedContent
																							)
																						: calculation.version ===
																							  'atv-private-natal-synthesis/4.0.0'
																							? reviewReconstructedNatal(
																									input,
																									calculation,
																									reviewedContent
																								)
																							: reviewReconstructedCareer(
																									input,
																									calculation,
																									reviewedContent
																								)
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
			(!current && (candidate.questions.length < 2 || !candidate.practice.trim())) ||
			!candidate.source.trim())
	)
		return null;
	const policy = current
		? CURRENT_REVIEW_POLICY
		: legacy
			? TRIAL_POLICY_VERSION
			: previous
				? POLICY_V2
				: v3
					? POLICY_V3
					: RECONSTRUCTION_POLICY;
	if (candidate.sections.some((s) => !s.text.trim() || s.factIds.some((id) => !ids.has(id))))
		return null;
	const covered = new Set(candidate.sections.flatMap((s) => s.factIds));
	// New editions select relevant facts; the full calculation remains available as reference.
	// Historical versions retain their original total-coverage contract.
	if (!current && [...ids].some((id) => !covered.has(id))) return null;
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
