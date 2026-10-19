import { error } from '@sveltejs/kit';
import { atvPlusPlanFor, atvPlusSelectionAllowed, type AtvPlusPlanId } from '@atv/domain';
import { trialIdentity, validTrialId } from './private-trials';

export interface PlusCycle {
	id: string;
	plan_id: AtvPlusPlanId;
	started_at: string;
	ends_at: string;
	cancelled_at: string | null;
}
export interface PlusUse {
	cycle_id: string;
	product_id: string;
	reading_id: string | null;
	created_at: string;
}

export async function plusOwnerIdentity(locals: App.Locals, required = true) {
	const identity = await trialIdentity(locals, required);
	if (!identity) return null;
	let grant;
	try {
		grant = await identity.supabase
			.rpc('has_atv_owner_evaluation_access')
			.abortSignal(AbortSignal.timeout(10000));
	} catch {
		if (required) error(503, 'Não foi possível conferir o acesso de avaliação. Tente novamente.');
		return null;
	}
	if (grant.error || grant.data !== true) {
		if (required)
			error(
				grant.error ? 503 : 403,
				'A simulação está disponível somente para a conta proprietária autorizada.'
			);
		return null;
	}
	return identity;
}

export const plusCycleActive = (cycle: PlusCycle, now = Date.now()) =>
	!cycle.cancelled_at && Date.parse(cycle.started_at) <= now && Date.parse(cycle.ends_at) > now;

export async function plusState(locals: App.Locals) {
	const identity = await plusOwnerIdentity(locals, false);
	if (!identity) return { ownerAccess: false, cycles: [] as PlusCycle[], uses: [] as PlusUse[] };
	const cycles = await identity.supabase
		.from('atv_plus_test_cycles')
		.select('id,plan_id,started_at,ends_at,cancelled_at')
		.eq('owner_id', identity.ownerId)
		.order('started_at', { ascending: false })
		.limit(30);
	if (cycles.error) error(503, 'Não foi possível abrir os ciclos de avaliação. Tente novamente.');
	const cycleRows = (cycles.data ?? []) as PlusCycle[];
	if (!cycleRows.length) return { ownerAccess: true, cycles: cycleRows, uses: [] as PlusUse[] };
	const uses = await identity.supabase
		.from('atv_plus_test_uses')
		.select('cycle_id,product_id,reading_id,created_at')
		.eq('owner_id', identity.ownerId)
		.in(
			'cycle_id',
			cycleRows.map((cycle) => cycle.id)
		)
		.order('created_at', { ascending: true });
	if (uses.error) error(503, 'Não foi possível conferir as leituras do ciclo. Tente novamente.');
	return { ownerAccess: true, cycles: cycleRows, uses: (uses.data ?? []) as PlusUse[] };
}

/** Helpful preflight only. The database locks the cycle and enforces quota at insertion. */
export async function requirePlusSelection(locals: App.Locals, cycleId: string, productId: string) {
	if (!validTrialId(cycleId)) error(400, 'Ciclo de avaliação inválido.');
	const identity = (await plusOwnerIdentity(locals))!;
	const cycle = await identity.supabase
		.from('atv_plus_test_cycles')
		.select('id,plan_id,started_at,ends_at,cancelled_at')
		.eq('owner_id', identity.ownerId)
		.eq('id', cycleId)
		.maybeSingle();
	if (cycle.error) error(503, 'Não foi possível conferir o ciclo. Tente novamente.');
	if (!cycle.data) error(404, 'Ciclo de avaliação não encontrado.');
	const row = cycle.data as PlusCycle;
	if (!plusCycleActive(row)) error(409, 'Este ciclo terminou. Inicie outra simulação no ATV+.');
	const uses = await identity.supabase
		.from('atv_plus_test_uses')
		.select('product_id')
		.eq('owner_id', identity.ownerId)
		.eq('cycle_id', cycleId);
	if (uses.error) error(503, 'Não foi possível conferir as leituras do ciclo. Tente novamente.');
	if (
		!atvPlusSelectionAllowed(row.plan_id, [
			...(uses.data ?? []).map((use) => use.product_id),
			productId
		])
	)
		error(
			409,
			'Esta leitura não está disponível na combinação restante do seu ciclo. Confira o ATV+.'
		);
	return { id: row.id, planName: atvPlusPlanFor(row.plan_id)!.name, endsAt: row.ends_at };
}

export function plusWriteError(problem: { code?: string; message?: string }): never {
	if (problem.code === '42501') error(403, 'O acesso de avaliação não está ativo para esta conta.');
	if (problem.code === 'P0001')
		error(409, 'O ciclo mudou ou já usou essa opção. Confira o ATV+ antes de tentar novamente.');
	if (problem.code === '22023') error(400, 'Confira o plano e inicie uma nova solicitação.');
	error(503, 'Não foi possível atualizar a simulação. Tente novamente.');
}
