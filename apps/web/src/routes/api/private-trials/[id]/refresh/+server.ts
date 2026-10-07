import { error, json } from '@sveltejs/kit';
import {
	privateTrial,
	trialIdentity,
	trialJson,
	trialWriter,
	validTrialId
} from '$lib/server/private-trials';
import { canonical } from '$lib/trials/reading';
import { reissueTrial } from '$lib/server/trial-runtime';
import type { RequestHandler } from './$types';

/** A new editorial edition reuses the private, authenticated calculation; it never redraws cards. */
export const POST: RequestHandler = async (event) => {
	const body = await trialJson(event);
	if (!validTrialId(body?.requestKey)) error(400, 'Solicitação inválida.');
	const saved = await privateTrial(event.locals, event.params.id);
	const result = await reissueTrial(event, saved);
	if (!result)
		error(422, 'A leitura original ou a nova edição precisa ser revisada antes da liberação.');
	const { reading, approval } = result;
	const identity = (await trialIdentity(event.locals))!;
	const sourceIds = (saved as typeof saved & { source_ids: string[] }).source_ids;
	const row = {
		id: crypto.randomUUID(),
		owner_id: identity.ownerId,
		product_id: saved.product_id,
		request_key: body.requestKey,
		source_ids: sourceIds,
		input: saved.input,
		calculation: saved.calculation,
		reading,
		approval
	};
	const inserted = await trialWriter().from('atv_trial_readings').insert(row).select('id').single();
	if (inserted.error?.code === '23505') {
		const retry = await identity.supabase
			.from('atv_trial_readings')
			.select('*')
			.eq('owner_id', identity.ownerId)
			.eq('request_key', body.requestKey)
			.single();
		if (
			retry.error ||
			canonical(retry.data.source_ids) !== canonical(sourceIds) ||
			canonical(retry.data.input) !== canonical(row.input) ||
			canonical(retry.data.calculation) !== canonical(row.calculation) ||
			retry.data.approval.digest !== approval.digest
		)
			error(409, 'Solicitação já utilizada. Consulte sua biblioteca.');
		return json({ id: retry.data.id }, { headers: { 'cache-control': 'private, no-store' } });
	}
	if (inserted.error) error(503, 'Não foi possível salvar a nova edição. Tente novamente.');
	return json(
		{ id: inserted.data.id },
		{ status: 201, headers: { 'cache-control': 'private, no-store' } }
	);
};
