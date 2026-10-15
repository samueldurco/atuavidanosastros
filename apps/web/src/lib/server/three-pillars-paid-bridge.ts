import { CaelusEphemerisProvider, type EphemerisProvider } from '@atv/astrology';
import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { canonical } from '../trials/reconstruction/canonical';
import { PILLARS_VERSION, projectPillarsReading } from '../trials/reconstruction/pillars-facts';
import {
	PILLARS_ORIGIN_POLICY,
	verifyPillarsOrigin
} from '../trials/reconstruction/pillars-origin';
import {
	composeReconstructedPillarsV51,
	reviewReconstructedPillarsV51
} from '../trials/reconstruction/pillars-v51';
import {
	createThreePillarsFullCalculator,
	threePillarsFullContract
} from '../../../../worker/src/natal-calculators.ts';
import { validateCalculation } from '../../../../worker/src/product-processing.ts';
import {
	stageThreePillarsPaidCandidate,
	threePillarsPaidCandidateContract,
	type ThreePillarsPaidCandidate
} from '../../../../worker/src/three-pillars-paid-candidate.ts';

/** Draft transport only; never registered with paid processing, promotion or publication. */
export const threePillarsPaidBridgeContract = Object.freeze({
	version: 'atv-three-pillars-paid-bridge/1.0.0',
	calculationVersion: 'atv-three-pillars-paid-calculation/2.1.0',
	projectionVersion: PILLARS_VERSION,
	fullVersion: threePillarsFullContract.version,
	candidateVersion: threePillarsPaidCandidateContract.version,
	readingVersion: threePillarsPaidCandidateContract.readingVersion,
	originPolicy: PILLARS_ORIGIN_POLICY,
	publication: 'blocked'
});

export type ThreePillarsPaidDraft = ThreePillarsPaidCandidate & {
	calculation: CalculationSnapshot;
	basis: typeof threePillarsPaidBridgeContract;
};

/** The paid snapshot persists the same complete facts that support the v5.1 chapters. */
function paidCalculation(projected: CalculationSnapshot): CalculationSnapshot {
	return {
		...structuredClone(projected),
		version: threePillarsPaidBridgeContract.calculationVersion,
		data: {
			...structuredClone(projected.data),
			paidContract: threePillarsPaidBridgeContract.version
		}
	};
}

function fullCalculation(natal: CalculationSnapshot): CalculationSnapshot {
	return {
		version: threePillarsFullContract.version,
		kind: 'natal',
		status: 'experimental',
		facts: structuredClone(natal.facts),
		data: {
			productId: 'three-pillars',
			natal: structuredClone(natal),
			projection: threePillarsFullContract
		},
		limits: [...natal.limits]
	};
}

/** Prepare an unpublished paid draft from the trusted natal provider and the v5.1 compositor. */
export async function createThreePillarsPaidDraft(
	input: WorkflowInput,
	context: { runId: string; signal: AbortSignal },
	provider: EphemerisProvider = new CaelusEphemerisProvider()
): Promise<ThreePillarsPaidDraft | null> {
	if (!parseWorkflowInput(input) || input.productId !== 'three-pillars' || !input.birth)
		return null;
	try {
		const full = (await createThreePillarsFullCalculator(provider)(
			input,
			context
		)) as CalculationSnapshot;
		const projected = projectPillarsReading(input, full.data.natal as CalculationSnapshot);
		const origin = await verifyPillarsOrigin(input, projected, provider);
		if (!origin.ok) return null;
		const reading = composeReconstructedPillarsV51(input, projected);
		if (reviewReconstructedPillarsV51(input, projected, reading).length) return null;
		const candidate = stageThreePillarsPaidCandidate(full, projected, reading);
		if (!candidate) return null;
		const calculation = paidCalculation(projected);
		if (!validateCalculation(calculation, 'three-pillars')) return null;
		return { ...candidate, calculation, basis: threePillarsPaidBridgeContract };
	} catch {
		return null;
	}
}

/** Independent replay of the provider, derivation and chapter composition. No approval authority. */
export async function reviewThreePillarsPaidDraft(
	input: WorkflowInput,
	draft: unknown,
	provider: EphemerisProvider = new CaelusEphemerisProvider()
): Promise<string[]> {
	if (
		!draft ||
		typeof draft !== 'object' ||
		Array.isArray(draft) ||
		!parseWorkflowInput(input) ||
		input.productId !== 'three-pillars' ||
		!input.birth
	)
		return ['paid-draft-input'];
	const observed = draft as Partial<ThreePillarsPaidDraft>;
	const calculation = validateCalculation(observed.calculation, 'three-pillars');
	if (!calculation || calculation.version !== threePillarsPaidBridgeContract.calculationVersion)
		return ['paid-draft-calculation'];
	const natal = validateCalculation(calculation.data.natal, 'birth-chart');
	if (!natal) return ['paid-draft-natal'];
	try {
		const projected = projectPillarsReading(input, natal);
		if (canonical(calculation) !== canonical(paidCalculation(projected)))
			return ['paid-draft-projection'];
		const origin = await verifyPillarsOrigin(input, projected, provider);
		if (!origin.ok) return [`paid-draft-origin:${origin.code}`];
		const reading = composeReconstructedPillarsV51(input, projected);
		const editorialErrors = reviewReconstructedPillarsV51(input, projected, reading);
		if (editorialErrors.length)
			return editorialErrors.map((error) => `paid-draft-editorial:${error}`);
		const candidate = stageThreePillarsPaidCandidate(fullCalculation(natal), projected, reading);
		if (!candidate) return ['paid-draft-content'];
		const expected: ThreePillarsPaidDraft = {
			...candidate,
			calculation: paidCalculation(projected),
			basis: threePillarsPaidBridgeContract
		};
		if (canonical(draft) !== canonical(expected)) return ['paid-draft-mismatch'];
		return [];
	} catch {
		return ['paid-draft-reconstruction'];
	}
}
