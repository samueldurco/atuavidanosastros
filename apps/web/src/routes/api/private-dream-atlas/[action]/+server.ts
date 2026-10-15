import { error, json } from '@sveltejs/kit';
import { parseDreamAtlasEntryInput } from '@atv/domain';
import { trialIdentity, trialJson, validTrialId } from '$lib/server/private-trials';
import { atlasWriteError, readPrivateAtlas } from '$lib/server/private-dream-atlas';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const identity = (await trialIdentity(event.locals))!;
	const body = await trialJson(event);
	const action = event.params.action;
	if (action === 'start') {
		if (!validTrialId(body?.requestKey) || body?.consent !== true)
			error(400, 'Autorize o salvamento privado para iniciar o diário.');
		const result = await identity.supabase.rpc('start_private_dream_atlas', {
			p_request_key: body.requestKey,
			p_consent_version: 'atv-input-consent/1'
		});
		if (result.error) atlasWriteError(result.error);
		return json(await readPrivateAtlas(event.locals, result.data.id), {
			headers: { 'cache-control': 'private, no-store' }
		});
	}
	if (!validTrialId(body?.runId)) error(400, 'Diário inválido.');
	let payload;
	if (action === 'read') payload = await readPrivateAtlas(event.locals, body.runId);
	else if (action === 'save') {
		const entry = parseDreamAtlasEntryInput(body.entry);
		if (
			!entry ||
			!validTrialId(body.entryId) ||
			!Number.isInteger(body.expectedRevision) ||
			body.expectedRevision < 0
		)
			error(400, 'Confira os campos do registro.');
		const result = await identity.supabase.rpc('save_private_dream_atlas_entry', {
			p_cycle_id: body.runId,
			p_entry_id: body.entryId,
			p_expected_revision: body.expectedRevision,
			p_entry: entry
		});
		if (result.error) atlasWriteError(result.error);
		payload = { revision: result.data };
	} else if (action === 'delete') {
		if (!validTrialId(body.entryId)) error(400, 'Registro inválido.');
		const result = await identity.supabase.rpc('delete_private_dream_atlas_entry', {
			p_cycle_id: body.runId,
			p_entry_id: body.entryId
		});
		if (result.error) atlasWriteError(result.error);
		payload = { deleted: result.data === true };
	} else error(404, 'Ação não encontrada.');
	return json(payload, { headers: { 'cache-control': 'private, no-store' } });
};
