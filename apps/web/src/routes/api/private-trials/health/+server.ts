import { json } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { trialWriter } from '$lib/server/private-trials';
import { POLICY_VERSION } from '$lib/trials/versions';

// Deployment probe: no account, key, record or provider error is exposed.
export async function GET() {
	const configurationReady = Boolean(
		publicEnv.PUBLIC_SUPABASE_URL &&
		privateEnv.SUPABASE_SERVICE_ROLE_KEY &&
		privateEnv.ATV_TRIAL_RUNTIME_KEY
	);
	let available: boolean;
	try {
		const result = await trialWriter()
			.from('atv_trial_grants')
			.select('owner_id')
			.limit(0)
			.abortSignal(AbortSignal.timeout(5000));
		available = configurationReady && !result.error;
	} catch {
		available = false;
	}
	return json(
		{
			available,
			configurationReady,
			scope: 'private-free-test',
			version: POLICY_VERSION
		},
		{ status: available ? 200 : 503, headers: { 'cache-control': 'private, no-store' } }
	);
}
