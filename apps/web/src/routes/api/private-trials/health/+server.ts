import { json } from '@sveltejs/kit';
import { trialWriter } from '$lib/server/private-trials';

// Deployment probe: no account, key, record or provider error is exposed.
export async function GET() {
	let available = false;
	try {
		const result = await trialWriter()
			.from('atv_trial_grants')
			.select('owner_id')
			.limit(0)
			.abortSignal(AbortSignal.timeout(5000));
		available = !result.error;
	} catch {
		available = false;
	}
	return json(
		{ available, scope: 'private-free-test', version: 'atv-private-trial-approval/1.0.0' },
		{ status: available ? 200 : 503, headers: { 'cache-control': 'private, no-store' } }
	);
}
