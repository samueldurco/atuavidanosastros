import { expect, it, vi } from 'vitest';
import { checkoutDatabase } from './checkout-database';

const bindings = vi.hoisted(() => {
	const env = { ATVNA_CHECKOUT_DB: undefined as D1Database | undefined };
	vi.stubGlobal('__sveltekit_cloudflare_platform', { env });
	return env;
});

it('uses the Pages binding without a SvelteKit request platform', () => {
	const workerDb = {} as D1Database;
	const platformDb = {} as D1Database;
	bindings.ATVNA_CHECKOUT_DB = workerDb;
	expect(checkoutDatabase(undefined)).toBe(workerDb);
	expect(checkoutDatabase({ env: { ATVNA_CHECKOUT_DB: platformDb } } as App.Platform)).toBe(
		platformDb
	);
	bindings.ATVNA_CHECKOUT_DB = undefined;
	expect(checkoutDatabase(undefined)).toBeUndefined();
});
