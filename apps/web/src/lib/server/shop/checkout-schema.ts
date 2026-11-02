import schema from '../../../../d1-checkout/0001_checkout.sql?raw';

const statements = schema
	.split(';')
	.map((sql) => sql.trim())
	.filter(Boolean);
const initialized = new WeakSet<D1Database>();

export async function ensureCheckoutSchema(db: D1Database) {
	if (initialized.has(db)) return;
	// D1 batches are atomic. Concurrent cold starts may safely run the same IF NOT EXISTS statements.
	const results = await db.batch(statements.map((sql) => db.prepare(sql)));
	if (results.length !== statements.length || results.some((result) => !result.success)) {
		throw new Error('checkout_schema_unavailable');
	}
	initialized.add(db);
	console.info('shop.checkout_schema_ready', { version: '0001' });
}
