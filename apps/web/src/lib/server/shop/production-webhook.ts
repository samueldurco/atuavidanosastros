import { admin as productionAdmin } from './shopify-production';
import type { PrivateEnv } from './freight-provider';
import { domain, managePaidWebhook, probePaidReceiver } from './shopify-webhook-contract.mjs';

export async function webhookMaintenance(
	mode: string,
	env: PrivateEnv,
	db: D1Database,
	f: typeof fetch,
	receiver: typeof fetch = f
) {
	const report = (webhook: string, status: number) =>
		Response.json(
			{ webhook },
			{
				status,
				headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
			}
		);
	if (mode !== 'register-webhook' && mode !== 'verify-webhook')
		return report('unknown_operation', 400);
	if (env.SHOPIFY_STORE_DOMAIN !== domain) return report('wrong_installation', 409);
	const secret = env.SHOPIFY_FULFILLMENT_CLIENT_SECRET;
	if (!secret || !env.SHOPIFY_FULFILLMENT_CLIENT_ID) return report('missing_app_credentials', 503);
	// Use the very app that signs our webhook even if a legacy Admin token is present.
	const signingApp = { ...env, SHOPIFY_FULFILLMENT_ADMIN_TOKEN: undefined };
	const register = mode === 'register-webhook';
	const owner = crypto.randomUUID();
	let failure = 'storage_unavailable';
	try {
		// Serialize registrations across isolates. A lost reply leaves the lease in place before a fresh lookup.
		if (register) {
			await db
				.prepare(
					'CREATE TABLE IF NOT EXISTS shop_webhook_registration (id INTEGER PRIMARY KEY CHECK (id=1), owner TEXT NOT NULL, expires INTEGER NOT NULL)'
				)
				.run();
			const lock = await db
				.prepare(
					'INSERT INTO shop_webhook_registration(id,owner,expires) VALUES(1,?,unixepoch()+90) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires=excluded.expires WHERE shop_webhook_registration.expires<=unixepoch()'
				)
				.bind(owner)
				.run();
			if (!lock.success || lock.meta.changes !== 1) return report('registration_busy', 409);
		}
		const webhook = await managePaidWebhook(
			register,
			(query, variables) => {
				const graphFailure = query.startsWith('mutation')
					? 'registration_unconfirmed'
					: 'shopify_read_unavailable';
				failure = graphFailure;
				return productionAdmin(
					signingApp,
					(input, init) => {
						failure = String(input).endsWith('/admin/oauth/access_token')
							? 'app_grant_unavailable'
							: graphFailure;
						return f(input, init);
					},
					query,
					variables
				);
			},
			() => {
				failure = 'receiver_unavailable';
				return probePaidReceiver(receiver, secret);
			}
		);
		failure = 'storage_unavailable';
		if (register && webhook !== 'registration_unconfirmed') {
			await db
				.prepare('DELETE FROM shop_webhook_registration WHERE id=1 AND owner=?')
				.bind(owner)
				.run();
		}
		return report(
			webhook,
			webhook === 'registered' || webhook === 'absent'
				? 200
				: webhook === 'wrong_installation' ||
					  webhook === 'conflicting_subscription' ||
					  webhook === 'missing_scopes'
					? 409
					: 503
		);
	} catch {
		return report(failure, 503);
	}
}
