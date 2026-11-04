import { error, json } from '@sveltejs/kit';
import { launchPreparation } from '$lib/server/launch-preparations';
import { savedLaunchReading } from '$lib/server/launch-readings';
import { trialIdentity, trialJson, validTrialId } from '$lib/server/private-trials';
import type { RequestHandler } from './$types';

type FeedbackRow = {
	id: string;
	request_key: string;
	preparation_id: string;
	owner_id: string;
	reading_digest: string;
	decision: 'approved' | 'rejected';
	comment: string;
	created_at: string;
};

export const POST: RequestHandler = async (event) => {
	const body = await trialJson(event);
	if (
		!body ||
		typeof body !== 'object' ||
		!validTrialId(body.request_key) ||
		!['approved', 'rejected'].includes(body.decision) ||
		typeof body.comment !== 'string' ||
		body.comment.length > 3000 ||
		(body.decision === 'rejected' && !body.comment.trim())
	)
		error(400, 'Escolha sua avaliação e explique o que precisa mudar se rejeitar a leitura.');
	const preparation = await launchPreparation(event.locals, event.params.id);
	const reading = await savedLaunchReading(event, preparation);
	if (!reading) error(409, 'Abra uma leitura salva e revisada antes de avaliá-la.');
	const identity = (await trialIdentity(event.locals))!;
	const payload = {
		request_key: body.request_key.toLowerCase(),
		preparation_id: preparation.id,
		owner_id: identity.ownerId,
		reading_digest: reading.reading_digest,
		decision: body.decision as FeedbackRow['decision'],
		comment: body.comment.trim()
	};
	const read = () =>
		identity.supabase
			.from('atv_launch_feedback')
			.select('*')
			.eq('owner_id', identity.ownerId)
			.eq('request_key', payload.request_key)
			.maybeSingle();
	const confirm = async (row: FeedbackRow | null) => {
		await trialIdentity(event.locals);
		if (!row) error(503, 'Não foi possível confirmar sua avaliação salva. Tente novamente.');
		if (
			row.request_key !== payload.request_key ||
			row.preparation_id !== payload.preparation_id ||
			row.owner_id !== payload.owner_id ||
			row.reading_digest !== payload.reading_digest ||
			row.decision !== payload.decision ||
			row.comment !== payload.comment
		)
			error(
				409,
				'Esta solicitação já registrou outra avaliação. Atualize a página para continuar.'
			);
		return json(
			{ id: row.id, decision: row.decision, comment: row.comment, created_at: row.created_at },
			{ headers: { 'cache-control': 'private, no-store' } }
		);
	};
	const existing = await read();
	if (existing.error) error(503, 'Não foi possível consultar suas avaliações. Tente novamente.');
	if (existing.data) return confirm(existing.data as FeedbackRow);
	// The authenticated client owns this insert; service credentials cannot submit human feedback.
	const inserted = await identity.supabase.from('atv_launch_feedback').insert(payload);
	if (inserted.error && inserted.error.code !== '23505') {
		await trialIdentity(event.locals);
		error(503, 'Não foi possível salvar sua avaliação. Tente novamente.');
	}
	await trialIdentity(event.locals);
	const saved = await read();
	if (saved.error) error(503, 'Não foi possível confirmar sua avaliação salva. Tente novamente.');
	return confirm(saved.data as FeedbackRow | null);
};
