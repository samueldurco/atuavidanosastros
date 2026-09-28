import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { maintainContinuityAccess } from './product-continuity-maintenance';
import {
	setupProductDatabase,
	owner,
	other,
	file
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole } from '../../../../../scripts/helpers/artifact-fixture.mjs';

let db: Awaited<ReturnType<typeof setupProductDatabase>>;
beforeAll(async () => {
	db = await setupProductDatabase();
	for (const name of [
		'20260928130000_product_continuity.sql',
		'20260928133000_product_continuity_selection.sql',
		'20260928140000_product_continuity_profile_guard.sql',
		'20260928160000_product_continuity_access.sql',
		'20260928170000_product_continuity_maintenance.sql'
	])
		await db.exec(await file(`supabase/migrations/${name}`));
}, 20000);
afterAll(async () => {
	await db?.close();
});
beforeEach(async () => {
	await db.exec(
		'delete from product_continuity_access; grant execute on function public.purge_expired_product_continuity_access() to service_role'
	);
	await db.query(
		`insert into product_continuity_access(user_id,consent_revision,created_at,expires_at)
    select $1,1,now()-interval '2 days',now()-interval '1 day' from generate_series(1,501)`,
		[owner]
	);
	await db.query(
		`insert into product_continuity_access(user_id,consent_revision,expires_at) values ($1,1,now()+interval '1 day')`,
		[other]
	);
});
const count = async () =>
	(await db.query<{ n: number }>('select count(*)::int n from product_continuity_access')).rows[0]
		.n;
function port(role = 'service_role', loseResponse = false) {
	return vi.fn(async (signal: AbortSignal) => {
		signal.throwIfAborted();
		const data = await asRole(
			db,
			role,
			null,
			async () =>
				(
					await db.query<{ data: unknown }>(
						'select purge_expired_product_continuity_access() as data'
					)
				).rows[0].data
		);
		if (loseResponse) throw new Error('private transport detail after commit');
		return { data, error: null };
	});
}
it('default-off preserves even expired rows; explicit local call removes exactly one SQL batch', async () => {
	const purgeExpired = port();
	expect(await maintainContinuityAccess({ purgeExpired })).toEqual({
		status: 'blocked',
		code: 'disabled'
	});
	expect(purgeExpired).not.toHaveBeenCalled();
	expect(await count()).toBe(502);
	expect(await maintainContinuityAccess({ enabled: true, purgeExpired })).toEqual({
		status: 'completed',
		deleted: 500,
		remaining: 'unknown'
	});
	expect(purgeExpired).toHaveBeenCalledTimes(1);
	expect(await count()).toBe(2);
	const policy = (
		await db.query('select enabled,access_retention_days from product_continuity_policy')
	).rows[0];
	expect(policy).toEqual({ enabled: false, access_retention_days: null });
});
it('lost response after committed deletion is unconfirmed and never drains the next batch', async () => {
	const purgeExpired = port('service_role', true);
	expect(await maintainContinuityAccess({ enabled: true, purgeExpired })).toEqual({
		status: 'unconfirmed',
		code: 'maintenance_unavailable'
	});
	expect(purgeExpired).toHaveBeenCalledTimes(1);
	expect(await count()).toBe(2);
});
it('unauthorized role and disabled service capability cannot delete rows', async () => {
	for (const role of ['anon', 'authenticated']) {
		const purgeExpired = port(role);
		expect(await maintainContinuityAccess({ enabled: true, purgeExpired })).toEqual({
			status: 'unconfirmed',
			code: 'maintenance_unavailable'
		});
		expect(purgeExpired).toHaveBeenCalledTimes(1);
		expect(await count()).toBe(502);
	}
	await db.exec(await file('supabase/forward-fixes/disable_product_continuity_maintenance.sql'));
	expect(await maintainContinuityAccess({ enabled: true, purgeExpired: port() })).toEqual({
		status: 'unconfirmed',
		code: 'maintenance_unavailable'
	});
	expect(await count()).toBe(502);
});
