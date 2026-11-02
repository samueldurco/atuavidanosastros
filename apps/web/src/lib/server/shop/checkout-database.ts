import { env as workerEnv } from 'cloudflare:workers';

// Pages initializes the Cloudflare environment even when SvelteKit supplies no request platform.
export function checkoutDatabase(platform: App.Platform | undefined) {
	return platform?.env?.ATVNA_CHECKOUT_DB ?? workerEnv.ATVNA_CHECKOUT_DB;
}
