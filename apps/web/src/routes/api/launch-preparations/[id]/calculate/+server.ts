import { error, json } from '@sveltejs/kit';
import { launchPreparation } from '$lib/server/launch-preparations';
import { isLaunchProductId } from '@atv/domain';
import { runLaunchRuntime } from '$lib/server/launch-runtime';
import { trialIdentity, trialJson, trialWriter } from '$lib/server/private-trials';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	await trialJson(event);
	const saved = await launchPreparation(event.locals, event.params.id);
	if (saved.status === 'FACTS_READY_AWAITING_REVIEW')
		return json({ id: saved.id }, { headers: { 'cache-control': 'private, no-store' } });
	if (!isLaunchProductId(saved.product_id))
		error(409, 'O método deste produto ainda está em preparação.');
	const calculated = await runLaunchRuntime(event, {
		operation: 'launch-calculation',
		input: saved.input,
		executionId: saved.id
	});
	if (calculated.operation !== 'launch-calculation')
		error(503, 'Não foi possível confirmar o cálculo.');
	const evidence = calculated.calculation;
	// Revalidate access after calculation; the write uses no caller-supplied owner or facts.
	const identity = (await trialIdentity(event.locals))!;
	const result = await trialWriter(event)
		.from('atv_launch_preparations')
		.update({ evidence, status: evidence.state })
		.eq('id', saved.id)
		.eq('owner_id', identity.ownerId)
		.eq('input_digest', saved.input_digest)
		.eq('status', 'AWAITING_CALCULATION');
	if (result.error) error(503, 'Não foi possível salvar os fatos calculados.');
	const stored = await launchPreparation(event.locals, saved.id);
	if (stored.status !== 'FACTS_READY_AWAITING_REVIEW')
		error(503, 'Não foi possível confirmar os fatos.');
	// Only the persisted draw may be consumed by a future editorial stage.
	return json({ id: stored.id }, { headers: { 'cache-control': 'private, no-store' } });
};
