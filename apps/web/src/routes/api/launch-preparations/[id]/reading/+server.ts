import { error, json } from '@sveltejs/kit';
import { launchPreparation } from '$lib/server/launch-preparations';
import { savedLaunchReading } from '$lib/server/launch-readings';
import {
	composeLaunchReading,
	evaluateLaunchReading,
	launchReadingDigest
} from '$lib/trials/launch-reading';
import type { LaunchFactCalculation } from '$lib/server/launch-calculation';
import { trialIdentity, trialJson, trialWriter } from '$lib/server/private-trials';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	await trialJson(event);
	const preparation = await launchPreparation(event.locals, event.params.id);
	if (preparation.status !== 'FACTS_READY_AWAITING_REVIEW')
		error(409, 'Calcule e salve os fatos antes de gerar a leitura.');
	const existing = await savedLaunchReading(event.locals, preparation);
	if (existing)
		return json({ id: preparation.id }, { headers: { 'cache-control': 'private, no-store' } });
	const calculation = preparation.evidence as LaunchFactCalculation;
	let reading;
	try {
		reading = await composeLaunchReading(preparation.input, calculation);
	} catch {
		error(422, 'A composição deste produto ainda não está liberada. Os fatos continuam salvos.');
	}
	const review = await evaluateLaunchReading(preparation.input, calculation, reading);
	if (review.status !== 'APPROVED_FOR_PRIVATE_TEST') {
		return json(
			{
				message: 'A leitura ainda não cumpriu os critérios editoriais deste produto.',
				reasons: review.reasons
			},
			{ status: 422, headers: { 'cache-control': 'private, no-store' } }
		);
	}
	const identity = (await trialIdentity(event.locals))!;
	const result = await trialWriter(event)
		.from('atv_launch_readings')
		.upsert(
			{
				preparation_id: preparation.id,
				owner_id: identity.ownerId,
				product_id: preparation.product_id,
				input_digest: preparation.input_digest,
				calculation_digest: await launchReadingDigest(calculation),
				reading_digest: await launchReadingDigest(reading),
				reading,
				review
			},
			{ onConflict: 'preparation_id', ignoreDuplicates: true }
		);
	if (result.error)
		error(503, 'Não foi possível salvar a leitura. Os fatos continuam preservados.');
	const saved = await savedLaunchReading(event.locals, preparation);
	if (!saved) error(503, 'Não foi possível confirmar a leitura salva.');
	return json({ id: saved.preparation_id }, { headers: { 'cache-control': 'private, no-store' } });
};
