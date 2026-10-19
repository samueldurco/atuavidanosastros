import { json } from '@sveltejs/kit';
import { trialWriter } from '$lib/server/private-trials';
import { POLICY_VERSION } from '$lib/trials/versions';
import { trialRuntimeConfigured, trialServiceBindings } from '$lib/server/runtime-bindings';
import type { RequestHandler } from './$types';

// Deployment probe: no account, key, record or provider error is exposed.
export const GET: RequestHandler = async (event) => {
	const configurationReady = trialRuntimeConfigured(trialServiceBindings(event));
	let available: boolean;
	try {
		const result = await trialWriter(event)
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
};
