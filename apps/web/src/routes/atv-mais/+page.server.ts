import { error, fail, redirect } from '@sveltejs/kit';
import { atvPlusPlanFor } from '@atv/domain';
import { plusOwnerIdentity, plusState, plusWriteError } from '$lib/server/atv-plus';
import { validTrialId } from '$lib/server/private-trials';
import {
	commercialPageState,
	completeCommercialOnboarding,
	commercialCheckoutEnabled,
	startCommercialCheckout
} from '$lib/server/atv-plus-commercial-page';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, platform, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const [evaluation, commercial] = await Promise.all([
		plusState(locals),
		commercialPageState(locals, commercialCheckoutEnabled(platform))
	]);
	return { ...evaluation, commercial, requestKey: crypto.randomUUID(), serverNow: Date.now() };
};

export const actions: Actions = {
	checkout: async ({ locals, platform, request, url }) => {
		if (request.headers.get('origin') !== url.origin) error(403, 'Origem inválida.');
		const fields = await request.formData();
		const result = await startCommercialCheckout(
			locals,
			String(fields.get('offerId') ?? ''),
			commercialCheckoutEnabled(platform)
		);
		if (result.status !== 200) return fail(result.status, { commercialMessage: result.message });
		redirect(303, result.checkoutUrl, { external: ['https://pay.hotmart.com'] });
	},
	onboard: async ({ locals, request, url }) => {
		if (request.headers.get('origin') !== url.origin) error(403, 'Origem inválida.');
		const result = await completeCommercialOnboarding(locals, await request.formData());
		if (result.status !== 200) return fail(result.status, { commercialMessage: result.message });
		return { commercialMessage: result.message };
	},
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
