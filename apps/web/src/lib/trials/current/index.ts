import { offeredProductIds, type WorkflowInput, type CalculationSnapshot } from '@atv/domain';
import type { TrialReading } from '../reading';
import { composeCurrentNatal } from './natal';
import { composeCurrentTemporal } from './temporal';
import { composeCurrentSymbolic } from './symbolic';

export const CURRENT_READING_VERSION = 'atv-current-reading/1.0.0';
export const CURRENT_REVIEW_POLICY = 'atv-current-interpretation-review/1.0.0';

export function isCurrentReadingProduct(id: string): boolean {
	return offeredProductIds.some((product) => product === id);
}

export function composeCurrentReading(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	if (!isCurrentReadingProduct(input.productId)) throw new Error('not_current_offer');
	const result =
		composeCurrentNatal(input, calculation) ??
		composeCurrentTemporal(input, calculation) ??
		composeCurrentSymbolic(input, calculation);
	if (!result || result.version !== CURRENT_READING_VERSION)
		throw new Error('current_interpretation_unavailable');
	return result;
}

/** Runtime integrity of authored conclusions. Semantic acceptance additionally requires
 * the independent contrast/ablation fixtures and complete-output editorial review.
 * Evidence metadata is never presented as an automatic semantic score. */
export function reviewCurrentReading(
	calculation: CalculationSnapshot,
	reading: TrialReading
): string[] {
	const failures: string[] = [];
	const evidence = reading.interpretation;
	if (
		!evidence ||
		evidence.version !== 'atv-interpretation-evidence/1' ||
		!evidence.family ||
		!evidence.conclusions.length
	)
		return ['missing_interpretive_evidence'];
	const known = new Set(calculation.facts.map((fact) => fact.id));
	for (const conclusion of evidence.conclusions) {
		const section = reading.sections[conclusion.section];
		if (
			!section ||
			!conclusion.claim.trim() ||
			!section.text.includes(conclusion.claim) ||
			!conclusion.relation.trim() ||
			!conclusion.factIds.length ||
			conclusion.factIds.some((id) => !known.has(id) || !section.factIds.includes(id))
		)
			failures.push('unsupported_conclusion');
	}
	if (
		reading.sections.some(
			(section) =>
				!section.title.trim() ||
				!section.text.trim() ||
				!section.factIds.length ||
				section.factIds.some((id) => !known.has(id))
		)
	)
		failures.push('unsupported_section');
	const text = [reading.opening, ...reading.sections.map((section) => section.text)].join('\n');
	if (
		/a síntese se completa quando|segurança e pertencimento de [AB]|função de iniciativa e defesa de limites/i.test(
			text
		)
	)
		failures.push('unfinished_interpretation');
	return failures;
}
