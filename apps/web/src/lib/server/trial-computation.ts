import {
	parseDreamAtlasEntryInput,
	parseWorkflowInput,
	type DreamAtlasFactSource
} from '@atv/domain';
import { calculateTrial } from './trial-calculation';
import {
	approveTrialReading,
	composeTrialReading,
	type SavedTrial,
	type TrialApproval,
	type TrialReading
} from '../trials/reading';
import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';

export type TrialEdition = {
	calculation: CalculationSnapshot;
	reading: TrialReading;
	approval: TrialApproval;
};
export type TrialReview = Pick<SavedTrial, 'input' | 'calculation' | 'reading' | 'approval'>;
export type TrialRuntimeRequest =
	| { operation: 'generate'; input: WorkflowInput; runId: string; sources: DreamAtlasFactSource[] }
	| { operation: 'verify' | 'revise'; saved: TrialReview };
export type TrialRuntimeResult = TrialEdition | boolean | null;

/** CPU-only service. No database credentials, persistence, grants or external model calls. */
export async function executeTrialRuntime(value: unknown): Promise<TrialRuntimeResult> {
	const request = value as TrialRuntimeRequest;
	if (!request || typeof request !== 'object') throw new Error('Solicitação inválida.');
	if (request.operation === 'generate') {
		const input = parseWorkflowInput(request.input);
		if (
			!input ||
			!/^[0-9a-f-]{36}$/i.test(request.runId) ||
			!Array.isArray(request.sources) ||
			request.sources.length > 150
		)
			throw new Error('Confira os dados e consentimentos antes de gerar.');
		const seen = new Set<string>();
		const sources = request.sources.map((source) => {
			const parsed = parseDreamAtlasEntryInput({
				version: source?.version,
				dreamDate: source?.dreamDate,
				narrative: source?.narrative,
				emotions: source?.emotions,
				associations: source?.associations,
				includeInSynthesis: source?.includeInSynthesis
			});
			if (
				!parsed ||
				!/^[0-9a-f-]{36}$/i.test(source.id) ||
				seen.has(source.id) ||
				!Number.isInteger(source.revision) ||
				source.revision < 1
			)
				throw new Error('Confira os registros selecionados.');
			seen.add(source.id);
			return { ...parsed, id: source.id, revision: source.revision };
		});
		if (sources.length && !['dream-atlas', 'dream-dossier'].includes(input.productId))
			throw new Error('Confira os registros selecionados.');
		const calculation = await calculateTrial(input, request.runId, sources);
		const reading = composeTrialReading(input, calculation);
		const approval = await approveTrialReading(input, calculation, reading);
		return approval ? { calculation, reading, approval } : null;
	}
	if (!['verify', 'revise'].includes(request.operation) || !request.saved)
		throw new Error('Solicitação inválida.');
	const saved = request.saved;
	const original = await approveTrialReading(saved.input, saved.calculation, saved.reading);
	const valid = !!original && original.digest === saved.approval?.digest;
	if (request.operation === 'verify') return valid;
	if (!valid) return null;
	const reading = composeTrialReading(saved.input, saved.calculation);
	const approval = await approveTrialReading(saved.input, saved.calculation, reading);
	return approval ? { calculation: saved.calculation, reading, approval } : null;
}
