import { error } from '@sveltejs/kit';
import type { LaunchInput, LaunchPreparedEvidence } from '@atv/domain';
import { trialIdentity, validTrialId } from './private-trials';
import type { LaunchFactCalculation } from './launch-calculation';

export type LaunchPreparation = {
	id: string;
	owner_id: string;
	request_key: string;
	product_id: string;
	input: LaunchInput;
	input_digest: string;
	evidence: LaunchPreparedEvidence | LaunchFactCalculation;
	status: 'AWAITING_CALCULATION' | 'FACTS_READY_AWAITING_REVIEW';
	created_at: string;
};

/** Private preparations are deliberately separate from approved readings and paid access. */
export async function launchPreparation(
	locals: App.Locals,
	id: string
): Promise<LaunchPreparation> {
	if (!validTrialId(id)) error(404, 'Preparação não encontrada.');
	const identity = (await trialIdentity(locals))!;
	const result = await identity.supabase
		.from('atv_launch_preparations')
		.select('*')
		.eq('owner_id', identity.ownerId)
		.eq('id', id)
		.maybeSingle();
	if (result.error) error(503, 'Não foi possível abrir a preparação.');
	if (!result.data) error(404, 'Preparação não encontrada.');
	return result.data as LaunchPreparation;
}
