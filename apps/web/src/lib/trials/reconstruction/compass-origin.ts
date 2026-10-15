import type { EphemerisProvider, NatalChart } from '@atv/astrology';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import {
	CAREER_COMPASS_FULL_BASIS_VERSION,
	validCareerCompassFullBasis
} from '../../../../../worker/src/career-compass-full-basis';
import { createNatalCalculators } from '../../../../../worker/src/natal-calculators';
import { composeReconstructedCompass, reviewReconstructedCompass } from './compass';
import { COMPASS_READING_VERSION, projectCompassReading } from './compass-facts';

/** Private deterministic origin candidate. It is not wired to public issuance or release flags. */
export const CAREER_COMPASS_V6_ORIGIN_VERSION = 'atv-career-compass-v6-origin/1.0.0';

type BlockReason = 'invalid_full_basis' | 'projection_invalid' | 'editorial_review_failed';
type OriginBase = {
	version: typeof CAREER_COMPASS_V6_ORIGIN_VERSION;
	sourceVersion: typeof CAREER_COMPASS_FULL_BASIS_VERSION;
	publication: 'blocked';
};
export type CareerCompassV6OriginResult =
	| (OriginBase & { status: 'blocked'; reason: BlockReason })
	| (OriginBase & {
			status: 'prepared_for_review';
			calculation: CalculationSnapshot;
			reading: ReturnType<typeof composeReconstructedCompass>;
	  });

const base: OriginBase = {
	version: CAREER_COMPASS_V6_ORIGIN_VERSION,
	sourceVersion: CAREER_COMPASS_FULL_BASIS_VERSION,
	publication: 'blocked'
};

/**
 * Reprojects a validated captured chart through the canonical natal calculator,
 * then through the private V6 composer. This is a local candidate, not a public emitter.
 * Full-basis coherence does not authenticate the original ephemeris provider.
 */
export async function prepareCareerCompassV6Origin(
	input: WorkflowInput,
	fullBasis: CalculationSnapshot,
	signal: AbortSignal = new AbortController().signal
): Promise<CareerCompassV6OriginResult> {
	signal.throwIfAborted();
	if (!validCareerCompassFullBasis(input, fullBasis)) {
		return { ...base, status: 'blocked', reason: 'invalid_full_basis' };
	}
	try {
		const chart = structuredClone(fullBasis.data.chart as NatalChart);
		const provider: EphemerisProvider = {
			name: chart.provenance.provider,
			version: chart.provenance.providerVersion,
			async calculate() {
				return structuredClone(chart);
			}
		};
		const natalInput: WorkflowInput = { ...input, productId: 'birth-chart' };
		const natal = (await createNatalCalculators(provider)['birth-chart']!(natalInput, {
			runId: '00000000-0000-4000-8000-000000000150',
			signal
		})) as CalculationSnapshot;
		signal.throwIfAborted();
		const calculation = projectCompassReading(input, natal);
		const reading = composeReconstructedCompass(input, calculation);
		if (
			reading.version !== COMPASS_READING_VERSION ||
			reviewReconstructedCompass(input, calculation, reading).length > 0
		) {
			return { ...base, status: 'blocked', reason: 'editorial_review_failed' };
		}
		return { ...base, status: 'prepared_for_review', calculation, reading };
	} catch (error) {
		if (signal.aborted) signal.throwIfAborted();
		return { ...base, status: 'blocked', reason: 'projection_invalid' };
	}
}
