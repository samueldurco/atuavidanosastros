import { CaelusEphemerisProvider, type EphemerisProvider } from '@atv/astrology';
import { parseWorkflowInput, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { createNatalCalculators } from '../../../../../worker/src/natal-calculators';
import { PILLARS_VERSION, projectPillarsReading, type PillarsData } from './pillars-facts';

/** Recalculation with the installed provider authenticates origin, not astronomical precision. */
export const PILLARS_ORIGIN_POLICY = 'atv-three-pillars-origin/1.0.0';
export type PillarsOriginResult =
	| { ok: true; policy: typeof PILLARS_ORIGIN_POLICY }
	| {
			ok: false;
			code:
				| 'invalid-input'
				| 'unsupported-version'
				| 'recalculation-failed'
				| 'natal-mismatch'
				| 'projection-mismatch';
			path?: string;
			message: string;
	  };

const rejected = (
	code: Extract<PillarsOriginResult, { ok: false }>['code'],
	message: string,
	path?: string
): PillarsOriginResult => ({ ok: false, code, ...(path ? { path } : {}), message });

/** Only the calculation timestamp is volatile. All geometry, facts and source metadata must match. */
function firstDifference(actual: unknown, expected: unknown, path: string): string | null {
	if (path.endsWith('data.provenance.calculatedAt')) {
		if (
			typeof actual !== 'string' ||
			!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(actual) ||
			Number.isNaN(Date.parse(actual)) ||
			new Date(actual).toISOString() !== actual
		)
			return path;
		return null;
	}
	if (Array.isArray(expected)) {
		if (!Array.isArray(actual) || actual.length !== expected.length) return path;
		for (let index = 0; index < expected.length; index++) {
			const mismatch = firstDifference(actual[index], expected[index], `${path}[${index}]`);
			if (mismatch) return mismatch;
		}
		return null;
	}
	if (expected && typeof expected === 'object') {
		if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return path;
		const observed = actual as Record<string, unknown>;
		const required = expected as Record<string, unknown>;
		for (const key of Object.keys(required).sort()) {
			if (!Object.hasOwn(observed, key)) return `${path}.${key}`;
			const mismatch = firstDifference(observed[key], required[key], `${path}.${key}`);
			if (mismatch) return mismatch;
		}
		if (Object.keys(observed).length !== Object.keys(required).length)
			return `${path}.[campo-extra]`;
		return null;
	}
	return actual === expected ? null : path;
}

/** Private approval gate. A persisted, internally coherent chart is never treated as proof of origin. */
export async function verifyPillarsOrigin(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	provider: EphemerisProvider = new CaelusEphemerisProvider()
): Promise<PillarsOriginResult> {
	if (!parseWorkflowInput(input) || input.productId !== 'three-pillars' || !input.birth)
		return rejected(
			'invalid-input',
			'Origem dos Três Pilares: nascimento ou consentimento inválido.'
		);
	if (calculation.version !== PILLARS_VERSION)
		return rejected(
			'unsupported-version',
			'Origem dos Três Pilares: edição de cálculo incompatível.'
		);
	let expectedNatal: CalculationSnapshot;
	try {
		const calculate = createNatalCalculators(provider)['birth-chart'];
		expectedNatal = (await calculate(
			{ ...input, productId: 'birth-chart' },
			{ runId: crypto.randomUUID(), signal: AbortSignal.timeout(10000) }
		)) as CalculationSnapshot;
	} catch {
		return rejected(
			'recalculation-failed',
			'Origem dos Três Pilares: recálculo natal indisponível.'
		);
	}
	const natal = (calculation.data as Partial<PillarsData>)?.natal;
	const natalMismatch = firstDifference(natal, expectedNatal, 'data.natal');
	if (natalMismatch)
		return rejected(
			'natal-mismatch',
			`Origem dos Três Pilares: base natal divergente em ${natalMismatch}.`,
			natalMismatch
		);
	const observedTimestamp = (calculation.data?.provenance as { calculatedAt?: unknown } | undefined)
		?.calculatedAt;
	const natalTimestamp = (natal?.data?.provenance as { calculatedAt?: unknown } | undefined)
		?.calculatedAt;
	if (observedTimestamp !== natalTimestamp)
		return rejected(
			'projection-mismatch',
			'Origem dos Três Pilares: horários de cálculo divergentes em data.provenance.calculatedAt.',
			'data.provenance.calculatedAt'
		);
	let expected: CalculationSnapshot;
	try {
		expected = projectPillarsReading(input, expectedNatal);
	} catch {
		return rejected(
			'recalculation-failed',
			'Origem dos Três Pilares: Ascendente ou projeção natal indisponível.'
		);
	}
	const projectionMismatch = firstDifference(calculation, expected, 'calculation');
	if (projectionMismatch)
		return rejected(
			'projection-mismatch',
			`Origem dos Três Pilares: projeção divergente em ${projectionMismatch}.`,
			projectionMismatch
		);
	return { ok: true, policy: PILLARS_ORIGIN_POLICY };
}
