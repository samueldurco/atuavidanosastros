import { launchPreparation } from '$lib/server/launch-preparations';
import { canCalculateLaunchFacts } from '$lib/server/launch-calculation';
import { launchProductDefinitions } from '@atv/domain';
import { savedLaunchReading } from '$lib/server/launch-readings';
import { canComposeLaunchReading } from '$lib/trials/launch-reading';
import { trialIdentity } from '$lib/server/private-trials';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, setHeaders }) => {
	setHeaders({ 'cache-control': 'private, no-store' });
	const preparation = await launchPreparation(locals, params.id);
	const savedReading =
		preparation.status === 'FACTS_READY_AWAITING_REVIEW'
			? await savedLaunchReading(locals, preparation)
			: null;
	let feedback: { id: string; decision: string; comment: string; created_at: string }[] = [];
	let feedbackHistoryAvailable = true;
	if (savedReading) {
		const identity = (await trialIdentity(locals))!;
		const result = await identity.supabase
			.from('atv_launch_feedback')
			.select('id,decision,comment,created_at')
			.eq('owner_id', identity.ownerId)
			.eq('preparation_id', preparation.id)
			.eq('reading_digest', savedReading.reading_digest)
			.order('created_at', { ascending: false })
			.limit(5);
		feedbackHistoryAvailable = !result.error;
		if (!result.error) feedback = result.data ?? [];
	}
	return {
		preparation,
		savedReading,
		feedback,
		feedbackHistoryAvailable,
		product: launchProductDefinitions.find((p) => p.id === preparation.product_id)!,
		canCalculate: canCalculateLaunchFacts(preparation.product_id),
		canCompose: canComposeLaunchReading(preparation.product_id)
	};
};
