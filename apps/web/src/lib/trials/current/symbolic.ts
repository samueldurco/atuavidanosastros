import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { composeCurrentTarot } from './symbolic-tarot';
import { composeCurrentDream } from './symbolic-dreams';
export { composeCurrentSingleCard } from './symbolic-tarot';

export const SYMBOLIC_CURRENT_VERSION = 'atv-current-reading/1.0.0';
export type SymbolicEvidence = {
	version: 'atv-interpretation-evidence/1';
	family: string;
	conclusions: { section: number; claim: string; factIds: string[]; relation: string }[];
};
export type CurrentSymbolicReading = TrialReading & { interpretation: SymbolicEvidence };

/** New requests only. Saved editions continue to use their recorded compositor. */
export function composeCurrentSymbolic(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading | null {
	return composeCurrentTarot(input, calculation) ?? composeCurrentDream(input, calculation);
}
