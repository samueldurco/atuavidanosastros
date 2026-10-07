import { error, json } from '@sveltejs/kit';
import { parseWorkflowInput } from '@atv/domain';
import { computeTrial } from '$lib/server/trial-runtime';
import {
	trialDreamSources,
	trialIdentity,
	trialJson,
	trialWriter,
	validTrialId
} from '$lib/server/private-trials';
import { canonical, type SavedTrial } from '$lib/trials/reading';
import type { RequestHandler } from './$types';

async function saveDiary(saved: SavedTrial, ownerId: string) {
	if (saved.product_id !== 'dream-journal' || !saved.input.dream) return;
	const dream = saved.input.dream;
	const result = await trialWriter()
		.from('atv_trial_dreams')
		.upsert(
			{
				owner_id: ownerId,
				reading_id: saved.id,
				data: {
					version: 'atv-dream-atlas-entry/1',
					dreamDate: dream.date,
					narrative: dream.narrative,
					emotions: dream.emotions,
					associations: dream.associations,
					includeInSynthesis: true
				}
			},
			{ onConflict: 'owner_id,reading_id', ignoreDuplicates: true }
		);
	if (result.error)
		error(503, 'Leitura salva. Tente novamente para concluir o registro no diário.');
}

export const POST: RequestHandler = async (event) => {
	const identity = (await trialIdentity(event.locals))!;
	const body = await trialJson(event);
	const input = parseWorkflowInput(body?.input);
	if (!input || !validTrialId(body?.requestKey))
		error(400, 'Confira os dados e consentimentos da leitura.');
	const sources = await trialDreamSources(event.locals, body.sourceIds ?? []);
	const sourceIds = sources.map((s) => s.id).sort();
	if (sources.length && !['dream-dossier', 'dream-atlas'].includes(input.productId))
		error(400, 'Este produto não utiliza histórico de sonhos.');
	const previous = await identity.supabase
		.from('atv_trial_readings')
		.select('*')
		.eq('owner_id', identity.ownerId)
		.eq('request_key', body.requestKey)
		.maybeSingle();
	if (previous.error) error(503, 'O salvamento está indisponível. Tente novamente.');
	if (previous.data) {
		const saved = previous.data as SavedTrial;
		if (
			canonical(saved.input) !== canonical(input) ||
			canonical(previous.data.source_ids.slice().sort()) !== canonical(sourceIds)
		)
			error(
				409,
				'Uma solicitação anterior já usou essa chave. Abra a leitura salva ou inicie outra.'
			);
		await saveDiary(saved, identity.ownerId);
		return json({ id: saved.id }, { headers: { 'cache-control': 'private, no-store' } });
	}
	const id = crypto.randomUUID();
	const result = await computeTrial(event, input, id, sources);
	if (!result) error(422, 'Esta leitura não passou nos critérios automáticos e não foi liberada.');
	const { calculation, reading, approval } = result;
	// Recheck revocation after calculation. The DB trigger also enforces the grant atomically.
	await trialIdentity(event.locals);
	const row = {
		id,
		owner_id: identity.ownerId,
		product_id: input.productId,
		request_key: body.requestKey,
		source_ids: sourceIds,
		input,
		calculation,
		reading,
		approval
	};
	const inserted = await trialWriter().from('atv_trial_readings').insert(row).select('*').single();
	if (inserted.error?.code === '23505') {
		const retry = await identity.supabase
			.from('atv_trial_readings')
			.select('*')
			.eq('owner_id', identity.ownerId)
			.eq('request_key', body.requestKey)
			.single();
		if (
			retry.error ||
			canonical(retry.data.input) !== canonical(input) ||
			canonical(retry.data.source_ids.slice().sort()) !== canonical(sourceIds)
		)
			error(409, 'Solicitação já processada. Consulte sua biblioteca.');
		await saveDiary(retry.data as SavedTrial, identity.ownerId);
		return json({ id: retry.data.id });
	}
	if (inserted.error)
		error(503, 'Não foi possível salvar. Tente novamente com a mesma solicitação.');
	await saveDiary(inserted.data as SavedTrial, identity.ownerId);
	return json({ id }, { status: 201, headers: { 'cache-control': 'private, no-store' } });
};
