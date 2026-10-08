import { DIRECTION_VERSION } from '$lib/trials/reconstruction/direction-facts';
import { parseDirectionNote } from '$lib/trials/reconstruction/direction-check-ins';
import { error, json } from '@sveltejs/kit';
import { privateTrial, trialIdentity, trialJson } from '$lib/server/private-trials';
import type { RequestHandler } from './$types';
import { parseReaderState } from '$lib/trials/reader-state';
import { canShareReading, shareTokenHash } from '$lib/trials/sharing';

export const POST: RequestHandler = async (event) => {
	const identity = (await trialIdentity(event.locals))!;
	const saved = await privateTrial(event.locals, event.params.id);
	const body = await trialJson(event);
	if (body?.action === 'create-share' || body?.action === 'revoke-share') {
		if (!canShareReading(saved.product_id))
			error(400, 'Esta leitura não oferece compartilhamento a dois.');
		if (body.action === 'revoke-share') {
			const result = await identity.supabase
				.from('atv_trial_shares')
				.update({ revoked_at: new Date().toISOString() })
				.eq('owner_id', identity.ownerId)
				.eq('reading_id', saved.id);
			if (result.error) error(503, 'Não foi possível desativar o link.');
			return json({ revoked: true }, { headers: { 'cache-control': 'private, no-store' } });
		}
		if (body.consent !== true) error(400, 'Confirme o compartilhamento desta leitura.');
		const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
			v.toString(16).padStart(2, '0')
		).join('');
		const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
		const result = await identity.supabase.from('atv_trial_shares').upsert(
			{
				owner_id: identity.ownerId,
				reading_id: saved.id,
				token_hash: await shareTokenHash(token),
				expires_at: expiresAt,
				revoked_at: null,
				created_at: new Date().toISOString()
			},
			{ onConflict: 'owner_id,reading_id' }
		);
		if (result.error) error(503, 'Não foi possível criar o link.');
		return json(
			{ url: `${event.url.origin}/compartilhar/leitura/${token}`, expiresAt },
			{ headers: { 'cache-control': 'private, no-store' } }
		);
	} else if (body?.action === 'feedback') {
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
		if (
			saved.calculation.version === DIRECTION_VERSION &&
			!parseDirectionNote(body.text, body.step)
		)
			error(400, 'Preencha os quatro campos da etapa e a decisão do dia 30.');
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
	} else if (body?.action === 'reader-state') {
		const state = parseReaderState(body, saved.reading.sections.length);
		if (!state) error(400, 'Posição de leitura inválida.');
		const result = await identity.supabase.from('atv_trial_reader_state').upsert(
			{
				owner_id: identity.ownerId,
				reading_id: saved.id,
				...state,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'owner_id,reading_id' }
		);
		if (result.error) error(503, 'Não foi possível guardar sua posição de leitura.');
	} else error(400, 'Ação inválida.');
	return json({ saved: true }, { headers: { 'cache-control': 'private, no-store' } });
};
