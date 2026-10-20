import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import { composeOriginalTrialReading } from '../reading';
import { nameCurrentOffer } from '../offer-names';

/** These suites protect the saved historical editions. Current delivery and
 * semantic contrasts are exercised in current/*.spec.ts. */
export function composeHistoricalReading(input: WorkflowInput, calculation: CalculationSnapshot) {
	return nameCurrentOffer(input, composeOriginalTrialReading(input, calculation));
}
