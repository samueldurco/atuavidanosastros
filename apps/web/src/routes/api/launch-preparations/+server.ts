import { error, json } from '@sveltejs/kit';
import { parseLaunchInput, prepareLaunchEvidence } from '@atv/domain';
import { trialIdentity, trialJson, trialWriter, validTrialId } from '$lib/server/private-trials';
import type { LaunchPreparation } from '$lib/server/launch-preparations';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const identity = (await trialIdentity(event.locals))!;
	const body = await trialJson(event);
	const input = parseLaunchInput(body?.input);
	if (!input || !validTrialId(body?.requestKey)) error(400, 'Confira os dados e o consentimento.');
	const previous = await identity.supabase
		.from('atv_launch_preparations')
		.select('*')
		.eq('owner_id', identity.ownerId)
		.eq('request_key', body.requestKey)
		.maybeSingle();
	if (previous.error) error(503, 'O salvamento está indisponível.');
	const id = previous.data?.id ?? crypto.randomUUID();
	const evidence = await prepareLaunchEvidence(input, id);
	if (previous.data && previous.data.input_digest !== evidence.inputDigest)
		error(409, 'Esta solicitação já foi salva com outros dados. Inicie outra preparação.');
	if (!previous.data) {
		const saved = await trialWriter(event).from('atv_launch_preparations').upsert(
			{
				id,
				owner_id: identity.ownerId,
				request_key: body.requestKey,
				product_id: input.productId,
				input,
				input_digest: evidence.inputDigest,
				evidence,
				status: evidence.state
			},
			{ onConflict: 'owner_id,request_key', ignoreDuplicates: true }
		);
		if (saved.error) error(503, 'Não foi possível salvar a preparação.');
	}
	// Re-read through the owner's RLS context, including after concurrent retries or revocation.
	const stored = await identity.supabase
		.from('atv_launch_preparations')
		.select('*')
		.eq('owner_id', identity.ownerId)
		.eq('request_key', body.requestKey)
		.maybeSingle();
	if (stored.error || !stored.data) error(503, 'Não foi possível confirmar o salvamento.');
	if ((stored.data as LaunchPreparation).input_digest !== evidence.inputDigest)
		error(409, 'Esta solicitação já foi salva com outros dados. Inicie outra preparação.');
	return json({ id: stored.data.id }, { headers: { 'cache-control': 'private, no-store' } });
};
