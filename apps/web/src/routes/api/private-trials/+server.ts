import { error, json } from '@sveltejs/kit';
import { isRetiredTarot, parseWorkflowInput, tarotMethodFor } from '@atv/domain';
import { preparePrivateTarotDraw } from '$lib/server/private-tarot-draw';
import { computeTrial } from '$lib/server/trial-runtime';
import { plusWriteError, requirePlusSelection } from '$lib/server/atv-plus';
import { anchorForecastInput } from '$lib/server/forecast-input';
import { atlasWriteError, trialAtlasSelection } from '$lib/server/private-dream-atlas';
import {
	trialDreamSources,
	trialIdentity,
	trialJson,
	trialWriter,
	validTrialId
} from '$lib/server/private-trials';
import { canonical, type SavedTrial } from '$lib/trials/reading';
import type { RequestEvent, RequestHandler } from './$types';

async function saveDiary(event: RequestEvent, saved: SavedTrial, ownerId: string) {
	if (saved.product_id !== 'dream-journal' || !saved.input.dream) return;
	const dream = saved.input.dream;
	const result = await trialWriter(event)
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
	const cycleId = body?.atvPlusCycleId ?? null;
	const atlasCycleId = body?.dreamAtlasCycleId ?? null;
	if (atlasCycleId !== null && !validTrialId(atlasCycleId)) error(400, 'Diário inválido.');
	if (cycleId !== null && !validTrialId(cycleId)) error(400, 'Ciclo de avaliação inválido.');
	if (!validTrialId(body?.requestKey)) error(400, 'Confira os dados e consentimentos da leitura.');
	const previous = await identity.supabase
		.from('atv_trial_readings')
		.select('*')
		.eq('owner_id', identity.ownerId)
		.eq('request_key', body.requestKey)
		.maybeSingle();
	if (previous.error) error(503, 'O salvamento está indisponível. Tente novamente.');
	const input = parseWorkflowInput(anchorForecastInput(body?.input, previous.data?.input));
	if (!input || isRetiredTarot(input.productId))
		error(400, 'Confira os dados e consentimentos da leitura.');
	if (atlasCycleId && input.productId !== 'dream-atlas')
		error(400, 'Este produto não utiliza o diário de 30 dias.');
	const sources =
		input.productId === 'dream-atlas'
			? previous.data
				? []
				: await trialAtlasSelection(event.locals, atlasCycleId, input.dreamAtlas!.startDate)
			: await trialDreamSources(event.locals, body.sourceIds ?? []);
	const sourceIds: string[] =
		input.productId === 'dream-atlas' && previous.data
			? previous.data.source_ids.slice().sort()
			: sources.map((s) => s.id).sort();
	if (sources.length && !['dream-dossier', 'dream-atlas'].includes(input.productId))
		error(400, 'Este produto não utiliza histórico de sonhos.');
	if (previous.data) {
		const saved = previous.data as SavedTrial;
		if (
			canonical(saved.input) !== canonical(input) ||
			(previous.data.atv_plus_cycle_id ?? null) !== cycleId ||
			(previous.data.dream_atlas_cycle_id ?? null) !== atlasCycleId ||
			canonical(previous.data.source_ids.slice().sort()) !== canonical(sourceIds)
		)
			error(
				409,
				'Uma solicitação anterior já usou essa chave. Abra a leitura salva ou inicie outra.'
			);
		await saveDiary(event, saved, identity.ownerId);
		return json({ id: saved.id }, { headers: { 'cache-control': 'private, no-store' } });
	}
	if (cycleId) await requirePlusSelection(event.locals, cycleId, input.productId);
	const draw = tarotMethodFor(input.productId)
		? await preparePrivateTarotDraw(identity.ownerId, body.requestKey, input)
		: null;
	const id = draw?.id ?? crypto.randomUUID();
	const result = await computeTrial(event, input, id, sources, draw?.calculation);
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
		approval,
		...(atlasCycleId ? { dream_atlas_cycle_id: atlasCycleId } : {}),
		...(cycleId ? { atv_plus_cycle_id: cycleId } : {})
	};
	const inserted = await trialWriter(event)
		.from('atv_trial_readings')
		.insert(row)
		.select('*')
		.single();
	if (inserted.error?.code === '23505') {
		const retry = await identity.supabase
			.from('atv_trial_readings')
			.select('*')
			.eq('owner_id', identity.ownerId)
			.eq('request_key', body.requestKey)
			.single();
		if (
			retry.error ||
			(retry.data.atv_plus_cycle_id ?? null) !== cycleId ||
			(retry.data.dream_atlas_cycle_id ?? null) !== atlasCycleId ||
			canonical(retry.data.input) !== canonical(input) ||
			canonical(retry.data.source_ids.slice().sort()) !== canonical(sourceIds)
		)
			error(409, 'Solicitação já processada. Consulte sua biblioteca.');
		await saveDiary(event, retry.data as SavedTrial, identity.ownerId);
		return json({ id: retry.data.id });
	}
	if (inserted.error && cycleId && ['42501', 'P0001', '22023'].includes(inserted.error.code))
		plusWriteError(inserted.error);
	if (inserted.error && atlasCycleId && ['42501', 'P0001', '22023'].includes(inserted.error.code))
		atlasWriteError(inserted.error);
	if (inserted.error)
		error(503, 'Não foi possível salvar. Tente novamente com a mesma solicitação.');
	await saveDiary(event, inserted.data as SavedTrial, identity.ownerId);
	return json({ id }, { status: 201, headers: { 'cache-control': 'private, no-store' } });
};
