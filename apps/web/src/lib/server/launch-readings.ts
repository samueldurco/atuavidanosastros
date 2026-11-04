import { error, type RequestEvent } from '@sveltejs/kit';
import { trialIdentity } from './private-trials';
import type { LaunchPreparation } from './launch-preparations';
import type { LaunchFactCalculation } from './launch-calculation';
import type { LaunchReading, LaunchReadingReview } from '$lib/trials/launch-reading';
import { launchRuntimeDigest } from './launch-runtime-contract';
import { runLaunchRuntime } from './launch-runtime';

export type SavedLaunchReading = {
	preparation_id: string;
	owner_id: string;
	product_id: string;
	input_digest: string;
	calculation_digest: string;
	reading_digest: string;
	reading: LaunchReading;
	review: LaunchReadingReview;
	created_at: string;
};

/** Reopening checks the exact persisted facts and edition; private approval never grants paid access. */
export async function savedLaunchReading(
	event: Pick<RequestEvent, 'locals' | 'url' | 'fetch' | 'platform' | 'request'>,
	preparation: LaunchPreparation
): Promise<SavedLaunchReading | null> {
	const identity = (await trialIdentity(event.locals))!;
	const result = await identity.supabase
		.from('atv_launch_readings')
		.select('*')
		.eq('preparation_id', preparation.id)
		.eq('owner_id', identity.ownerId)
		.maybeSingle();
	if (result.error) error(503, 'Não foi possível consultar a leitura salva.');
	if (!result.data) return null;
	const saved = result.data as SavedLaunchReading;
	if (
		preparation.status !== 'FACTS_READY_AWAITING_REVIEW' ||
		saved.preparation_id !== preparation.id ||
		saved.owner_id !== identity.ownerId ||
		saved.product_id !== preparation.product_id ||
		saved.input_digest !== preparation.input_digest ||
		saved.calculation_digest !== (await launchRuntimeDigest(preparation.evidence)) ||
		saved.reading_digest !== (await launchRuntimeDigest(saved.reading))
	)
		error(409, 'A edição salva precisa de revisão.');
	const verified = await runLaunchRuntime(event, {
		operation: 'launch-verify',
		input: preparation.input,
		calculation: preparation.evidence as LaunchFactCalculation,
		reading: saved.reading
	});
	if (verified.operation !== 'launch-verify') error(503, 'Não foi possível confirmar a revisão.');
	const { review } = verified;
	if (
		review.status !== 'APPROVED_FOR_PRIVATE_TEST' ||
		saved.review.status !== review.status ||
		saved.review.policyVersion !== review.policyVersion ||
		saved.review.digest !== review.digest ||
		(await launchRuntimeDigest(saved.review)) !== (await launchRuntimeDigest(review))
	)
		error(409, 'A leitura salva não passou na revisão desta edição.');
	await trialIdentity(event.locals);
	return saved;
}
