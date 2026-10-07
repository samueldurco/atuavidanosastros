import { error } from '@sveltejs/kit';
import { productCatalog } from '@atv/domain';
import { privateTrial } from '$lib/server/private-trials';
import { reviewTrial } from '$lib/server/trial-runtime';
import type { PageServerLoad } from './$types';
import { privateFormats } from '$lib/trials/experience';
export const load: PageServerLoad = async (event) => {
	const saved = await privateTrial(event.locals, event.params.id);
	if (
		!privateFormats(
			saved.product_id,
			productCatalog.find((p) => p.id === saved.product_id)?.delivery ?? []
		).includes('pdf')
	)
		error(400, 'PDF indisponível neste produto.');
	if (!(await reviewTrial(event, saved)))
		error(409, 'A revisão desta versão precisa ser conferida antes do download.');
	return { saved };
};
