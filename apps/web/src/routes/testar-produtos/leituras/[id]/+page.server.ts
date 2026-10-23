import { privateTrial, trialIdentity } from '$lib/server/private-trials';
import { readTrialReaderExtras } from '$lib/server/trial-reader-extras';
import { productCatalog } from '@atv/domain';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, params }) => {
	const saved = await privateTrial(locals, params.id);
	const identity = (await trialIdentity(locals))!;
	const extras = await readTrialReaderExtras(identity.supabase, identity.ownerId, saved);
	return {
		saved,
		product: productCatalog.find((p) => p.id === saved.product_id)!,
		...extras
	};
};
