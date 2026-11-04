import { error } from '@sveltejs/kit';
import { trialIdentity } from './private-trials';
import type { LaunchPreparation } from './launch-preparations';
import type { LaunchFactCalculation } from './launch-calculation';
import {
	evaluateLaunchReading,
	launchReadingDigest,
	type LaunchReading,
	type LaunchReadingReview
} from '$lib/trials/launch-reading';

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
	locals: App.Locals,
	preparation: LaunchPreparation
): Promise<SavedLaunchReading | null> {
	const identity = (await trialIdentity(locals))!;
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
		saved.product_id !== preparation.product_id ||
		saved.input_digest !== preparation.input_digest ||
		saved.calculation_digest !== (await launchReadingDigest(preparation.evidence)) ||
		saved.reading_digest !== (await launchReadingDigest(saved.reading))
	)
		error(409, 'A edição salva precisa de revisão.');
	const review = await evaluateLaunchReading(
		preparation.input,
		preparation.evidence as LaunchFactCalculation,
		saved.reading
	);
	if (
		review.status !== 'APPROVED_FOR_PRIVATE_TEST' ||
		saved.review.status !== review.status ||
		saved.review.policyVersion !== review.policyVersion ||
		saved.review.digest !== review.digest
	)
		error(409, 'A leitura salva não passou na revisão desta edição.');
	return saved;
}
