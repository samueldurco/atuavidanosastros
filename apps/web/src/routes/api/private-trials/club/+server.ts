import { error, json } from '@sveltejs/kit';
import { trialIdentity, trialJson } from '$lib/server/private-trials';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async (event) => {
	const identity = (await trialIdentity(event.locals))!;
	const body = await trialJson(event);
	if (
		!['approved', 'rejected'].includes(body?.decision) ||
		typeof body.comment !== 'string' ||
		body.comment.length > 3000
	)
		error(400, 'Confira sua avaliação e comentário.');
	const result = await identity.supabase.from('atv_trial_club_feedback').upsert(
		{
			owner_id: identity.ownerId,
			decision: body.decision,
			comment: body.comment,
			updated_at: new Date().toISOString()
		},
		{ onConflict: 'owner_id' }
	);
	if (result.error) error(503, 'Não foi possível salvar sua avaliação. Tente novamente.');
	return json({ saved: true }, { headers: { 'cache-control': 'private, no-store' } });
};
