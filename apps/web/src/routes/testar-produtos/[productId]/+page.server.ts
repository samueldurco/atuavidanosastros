import { error, redirect } from '@sveltejs/kit';
import { loginHref } from '$lib/auth-return';
import { workflows } from '@atv/domain';
import { trialIdentity } from '$lib/server/private-trials';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, params, parent }) => {
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
	return { product, dreams };
};
