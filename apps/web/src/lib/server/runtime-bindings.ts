import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestEvent } from '@sveltejs/kit';

type BindingEvent = Pick<RequestEvent, 'platform'>;

// Cloudflare bindings belong to the current request. Dynamic env remains the
// fallback for adapters and local commands that do not provide a platform.
// An explicitly empty binding must fail closed, not recover an older key.
export function supabaseAuthBindings(event: BindingEvent) {
	const bindings = event.platform?.env;
	const platformKey =
		bindings?.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? bindings?.PUBLIC_SUPABASE_ANON_KEY;
	return {
		url: bindings?.PUBLIC_SUPABASE_URL ?? publicEnv.PUBLIC_SUPABASE_URL,
		key:
			platformKey ??
			(publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY || publicEnv.PUBLIC_SUPABASE_ANON_KEY)
	};
}

export function trialServiceBindings(event: BindingEvent) {
	const bindings = event.platform?.env;
	return {
		url: bindings?.PUBLIC_SUPABASE_URL ?? publicEnv.PUBLIC_SUPABASE_URL,
		serviceRoleKey: bindings?.SUPABASE_SERVICE_ROLE_KEY ?? privateEnv.SUPABASE_SERVICE_ROLE_KEY,
		runtimeKey: bindings?.ATV_TRIAL_RUNTIME_KEY ?? privateEnv.ATV_TRIAL_RUNTIME_KEY
	};
}

export function trialRuntimeConfigured(
	config: ReturnType<typeof trialServiceBindings>
): config is { url: string; serviceRoleKey: string; runtimeKey: string } {
	return Boolean(
		config.url?.startsWith('https://') && config.serviceRoleKey?.trim() && config.runtimeKey?.trim()
	);
}
