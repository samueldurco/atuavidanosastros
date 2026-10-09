import { calculateTarotMethod, type CalculationSnapshot, type WorkflowInput } from '@atv/domain';
import { error } from '@sveltejs/kit';
import { canonical } from '$lib/trials/reading';
import { trialWriter } from './private-trials';

type DrawRow = {
	id: string;
	owner_id: string;
	request_key: string;
	product_id: string;
	input: WorkflowInput;
	calculation: CalculationSnapshot | null;
	recorded_at: string | null;
};
function row(value: unknown): DrawRow | null {
	const candidate = Array.isArray(value) && value.length === 1 ? value[0] : value;
	return candidate && typeof candidate === 'object' && typeof candidate.id === 'string'
		? (candidate as DrawRow)
		: null;
}
/** Only called with a verified owner and server-validated input. Persist before editorial work. */
export async function preparePrivateTarotDraw(
	ownerId: string,
	requestKey: string,
	input: WorkflowInput
) {
	const writer = trialWriter();
	const reserved = await writer.rpc('reserve_atv_tarot_draw', {
		p_owner: ownerId,
		p_request_key: requestKey,
		p_input: input
	});
	if (reserved.error?.code === '23505')
		error(409, 'Esta solicitação já foi usada. Reabra a leitura ou inicie uma nova consulta.');
	if (reserved.error?.code === '42501')
		error(403, 'Esta conta não tem acesso aos testes privados.');
	const saved = row(reserved.data);
	if (
		reserved.error ||
		!saved ||
		saved.owner_id !== ownerId ||
		saved.request_key !== requestKey ||
		saved.product_id !== input.productId ||
		canonical(saved.input) !== canonical(input)
	)
		error(503, 'Não foi possível reservar a leitura. Repita a mesma solicitação.');
	if (saved.calculation && saved.recorded_at)
		return { id: saved.id, calculation: saved.calculation };
	const calculation = await calculateTarotMethod(input, saved.id, AbortSignal.timeout(10000));
	const recorded = await writer.rpc('record_atv_tarot_draw', {
		p_owner: ownerId,
		p_id: saved.id,
		p_calculation: calculation
	});
	const draw = row(recorded.data);
	if (
		recorded.error ||
		!draw ||
		draw.id !== saved.id ||
		!draw.recorded_at ||
		canonical(draw.calculation) !== canonical(calculation)
	)
		error(
			503,
			'A leitura ainda não foi concluída. Repita a mesma solicitação para conservar suas cartas.'
		);
	return { id: draw.id, calculation };
}
