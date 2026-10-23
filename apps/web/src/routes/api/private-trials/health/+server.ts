import { json } from '@sveltejs/kit';
import { trialWriter } from '$lib/server/private-trials';
import { POLICY_VERSION } from '$lib/trials/versions';
import {
	supabaseAuthBindings,
	trialRuntimeConfigured,
	trialServiceBindings
} from '$lib/server/runtime-bindings';
import type { RequestHandler } from './$types';

// Deployment probe: no account, key, record or provider error is exposed.
export const GET: RequestHandler = async (event) => {
	const bindings = trialServiceBindings(event);
	const authBindings = supabaseAuthBindings(event);
	const authUrlValid = Boolean(authBindings.url?.startsWith('https://'));
	const authPublicKeyPresent = Boolean(authBindings.key?.trim());
	const configurationReady =
		trialRuntimeConfigured(bindings) && authUrlValid && authPublicKeyPresent;
	let available = false;
	if (configurationReady) {
		try {
			const result = await trialWriter(event)
				.from('atv_trial_grants')
				.select('owner_id')
				.limit(0)
				.abortSignal(AbortSignal.timeout(5000));
			available = !result.error;
		} catch {
			available = false;
		}
	}
	return json(
		{
			available,
			configurationReady,
			authUrlValid,
			authPublicKeyPresent,
			urlValid: Boolean(bindings.url?.startsWith('https://')),
			serviceRolePresent: Boolean(bindings.serviceRoleKey?.trim()),
			runtimeKeyPresent: Boolean(bindings.runtimeKey?.trim()),
			scope: 'private-free-test',
			version: POLICY_VERSION
		},
		{ status: available ? 200 : 503, headers: { 'cache-control': 'private, no-store' } }
	);
};
