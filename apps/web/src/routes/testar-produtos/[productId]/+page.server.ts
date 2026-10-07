import { error, redirect } from '@sveltejs/kit';
import { loginHref } from '$lib/auth-return';
import { workflows } from '@atv/domain';
import { trialIdentity } from '$lib/server/private-trials';
import type { WorkflowInput } from '@atv/domain';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, params, parent, url }) => {
	if (!(await parent()).user) redirect(303, loginHref(`/testar-produtos/${params.productId}`));
	const identity = (await trialIdentity(locals))!;
	const product = workflows.find((p) => p.id === params.productId);
	if (!product) error(404, 'Produto não encontrado.');
	let dreams: { id: string; date: string; preview: string }[] = [];
	if (['dream-dossier', 'dream-atlas'].includes(product.id)) {
		const result = await identity.supabase
			.from('atv_trial_dreams')
			.select('id,data')
			.eq('owner_id', identity.ownerId)
			.order('created_at', { ascending: false })
			.limit(150);
		if (result.error) error(503, 'Não foi possível consultar seu diário.');
		dreams = (result.data ?? []).map((row) => ({
			id: row.id,
			date: String(row.data.dreamDate),
			preview: String(row.data.narrative).slice(0, 140)
		}));
	}
	let previous: { id: string; input: WorkflowInput } | null = null;
	const from = url.searchParams.get('from');
	if (from) {
		if (!/^[0-9a-f-]{36}$/i.test(from)) error(400, 'Leitura de origem inválida.');
		const result = await identity.supabase
			.from('atv_trial_readings')
			.select('id,input')
			.eq('owner_id', identity.ownerId)
			.eq('product_id', product.id)
			.eq('id', from)
			.maybeSingle();
		if (result.error) error(503, 'Não foi possível recuperar os dados anteriores.');
		if (!result.data) error(404, 'Leitura de origem não encontrada.');
		previous = result.data as { id: string; input: WorkflowInput };
	}
	return { product, dreams, previous };
};
