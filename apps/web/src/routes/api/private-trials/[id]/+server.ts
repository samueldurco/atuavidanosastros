import { error, json } from '@sveltejs/kit';
import { privateTrial, trialIdentity, trialJson } from '$lib/server/private-trials';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const identity = (await trialIdentity(event.locals))!;
	const saved = await privateTrial(event.locals, event.params.id);
	const body = await trialJson(event);
	if (body?.action === 'feedback') {
		if (
			!['approved', 'rejected'].includes(body.decision) ||
			typeof body.comment !== 'string' ||
			body.comment.length > 3000
		)
			error(400, 'Avaliação inválida.');
		const result = await identity.supabase.from('atv_trial_feedback').upsert(
			{
				owner_id: identity.ownerId,
				product_id: saved.product_id,
				reading_id: saved.id,
				decision: body.decision,
				comment: body.comment,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'owner_id,product_id' }
		);
		if (result.error) error(503, 'Não foi possível salvar sua avaliação.');
	} else if (body?.action === 'note') {
		const steps =
			saved.product_id === 'direction-journey'
				? [0, 7, 14, 30]
				: saved.product_id === 'tarot-journey'
					? [0, 1, 7, 14]
					: [0];
		if (
			!steps.includes(body.step) ||
			typeof body.text !== 'string' ||
			!body.text.trim() ||
			body.text.length > 3000
		)
			error(400, 'Anotação inválida.');
		const result = await identity.supabase.from('atv_trial_notes').upsert(
			{
				owner_id: identity.ownerId,
				reading_id: saved.id,
				step: body.step,
				text: body.text,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'owner_id,reading_id,step' }
		);
		if (result.error) error(503, 'Não foi possível salvar sua anotação.');
	} else error(400, 'Ação inválida.');
	return json({ saved: true }, { headers: { 'cache-control': 'private, no-store' } });
};
