import { error, fail } from '@sveltejs/kit';
import { atvPlusPlanFor } from '@atv/domain';
import { plusOwnerIdentity, plusState, plusWriteError } from '$lib/server/atv-plus';
import { validTrialId } from '$lib/server/private-trials';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	return { ...(await plusState(locals)), requestKey: crypto.randomUUID(), serverNow: Date.now() };
};

export const actions: Actions = {
	start: async (event) => {
		if (event.request.headers.get('origin') !== event.url.origin)
			error(403, 'Origem da solicitação inválida.');
		const identity = (await plusOwnerIdentity(event.locals))!;
		const form = await event.request.formData();
		const planId = form.get('planId');
		const requestKey = form.get('requestKey');
		if (typeof planId !== 'string' || !atvPlusPlanFor(planId) || !validTrialId(requestKey))
			return fail(400, { message: 'Confira o plano e tente novamente.' });
		const result = await identity.supabase.rpc('start_atv_plus_test_cycle', {
			p_plan: planId,
			p_request_key: requestKey
		});
		if (result.error) plusWriteError(result.error);
		return { message: 'Seu ciclo de teste começou. Escolha uma leitura abaixo.' };
	},
	cancel: async (event) => {
		if (event.request.headers.get('origin') !== event.url.origin)
			error(403, 'Origem da solicitação inválida.');
		const identity = (await plusOwnerIdentity(event.locals))!;
		const form = await event.request.formData();
		const cycleId = form.get('cycleId');
		if (!validTrialId(cycleId)) return fail(400, { message: 'Ciclo inválido.' });
		const result = await identity.supabase.rpc('cancel_atv_plus_test_cycle', { p_cycle: cycleId });
		if (result.error) plusWriteError(result.error);
		if (!result.data) return fail(404, { message: 'Ciclo não encontrado.' });
		return { message: 'Simulação encerrada. As leituras entregues continuam na sua biblioteca.' };
	}
};
