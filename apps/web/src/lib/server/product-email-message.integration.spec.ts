import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { prepareProductEmailMessage } from './product-email-message';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole, readyArtifactFixture } from '../../../../../scripts/helpers/artifact-fixture.mjs';

let db: Awaited<ReturnType<typeof setupProductDatabase>>;
let reading: Awaited<ReturnType<typeof readyArtifactFixture>>;
let key: string;
const configuration = { accountOrigin: 'https://account.atv.example' };
beforeAll(async () => {
	db = await setupProductDatabase();
	await db.exec(await file('supabase/migrations/20260925220000_product_email_requests.sql'));
}, 20000);
afterAll(async () => {
	await db?.close();
});
beforeEach(async () => {
	await db.exec(
		'delete from product_runs; delete from library_items; update product_email_policy set enabled=false; update profiles set deleted_at=null'
	);
	reading = await readyArtifactFixture(db);
	key = randomUUID();
	// Synthetic local fixture only; neither runtime nor hosted acceptance is enabled.
	await db.exec('update product_email_policy set enabled=true');
	await asRole(db, 'authenticated', owner, () =>
		db.query('select request_product_email($1,$2)', [
			key,
			{
				version: 'atv-email-request/1',
				runId: reading.id,
				expectedRevision: reading.revision,
				reviewDigest: reading.reviewDigest,
				consent: {
					transactional: true,
					policyVersion: 'atv-email-delivery/1',
					recipient: 'account-owner'
				}
			}
		])
	);
});
async function projections(user = owner) {
	return asRole(db, 'authenticated', user, async () => ({
		reading: (
			await db.query<{ data: unknown }>('select read_product_run($1) as data', [reading.id])
		).rows[0].data,
		receipt: (
			await db.query<{ data: unknown }>('select read_product_email_request($1) as data', [key])
		).rows[0].data
	}));
}
async function prepare(user = owner) {
	const snapshot = await projections(user);
	return prepareProductEmailMessage(snapshot.reading, snapshot.receipt, configuration);
}
it('composes from owner-scoped SQL projections without changing receipts; foreign access and cancellation close composition', async () => {
	const before = await projections();
	const message = await prepare();
	expect(message).toMatchObject({
		status: 'prepared',
		dispatch: 'blocked',
		providerAcceptance: 'not-attempted'
	});
	expect(await projections()).toEqual(before);
	expect(await projections(other)).toEqual({ reading: null, receipt: null });
	expect(await prepare(other)).toBeNull();
	await asRole(db, 'authenticated', owner, () =>
		db.query('select cancel_product_email_request($1)', [message!.basis.receiptId])
	);
	expect(await prepare()).toBeNull();
	expect((await projections()).receipt).toMatchObject({ state: 'CANCELLED' });
});
it('rechecks fresh reading release even while the recoverable request remains registered', async () => {
	expect(await prepare()).not.toBeNull();
	await db.query('update workflow_releases set enabled=false where product_id=$1', [
		reading.productId
	]);
	expect((await projections()).receipt).toMatchObject({ state: 'REQUESTED' });
	expect(await prepare()).toBeNull();
});
it('cannot compose after deletion cascades the request', async () => {
	expect(await prepare()).not.toBeNull();
	await db.query('delete from product_runs where id=$1', [reading.id]);
	expect(await projections()).toEqual({ reading: null, receipt: null });
	expect(await prepare()).toBeNull();
});
