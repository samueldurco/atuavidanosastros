import { privateTrial, trialIdentity } from '$lib/server/private-trials';
import { error } from '@sveltejs/kit';
import { productCatalog } from '@atv/domain';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals, params }) => {
	const saved = await privateTrial(locals, params.id);
	const identity = (await trialIdentity(locals))!;
	const [feedback, notes, readerState] = await Promise.all([
		identity.supabase
			.from('atv_trial_feedback')
			.select('decision,comment,reading_id')
			.eq('owner_id', identity.ownerId)
			.eq('product_id', saved.product_id)
			.maybeSingle(),
		identity.supabase
			.from('atv_trial_notes')
			.select('step,text,updated_at')
			.eq('owner_id', identity.ownerId)
			.eq('reading_id', saved.id)
			.order('step'),
		identity.supabase
			.from('atv_trial_reader_state')
			.select('chapter,bookmarks')
			.eq('owner_id', identity.ownerId)
			.eq('reading_id', saved.id)
			.maybeSingle()
	]);
	if (feedback.error || notes.error || readerState.error)
		error(503, 'Não foi possível consultar sua avaliação e suas anotações. Tente novamente.');
	return {
		saved,
		product: productCatalog.find((p) => p.id === saved.product_id)!,
		feedback: feedback.data,
		notes: notes.data ?? [],
		readerState: readerState.data ?? { chapter: 0, bookmarks: [] }
	};
};
