import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
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
	await db.exec(await file('supabase/migrations/20260925140000_product_request_access.sql'));
	await db.exec(
		"insert into products(id,slug,name,universe) values ('daily-card','daily-card','Sintético','tarot-arcanos')"
	);
}, 20000);
afterAll(async () => {
	await db?.close();
});
beforeEach(async () => {
	await db.exec(
		"delete from entitlements; update profiles set deleted_at=null; update workflow_releases set enabled=false,contract_version='atv-workflow/1.0.0'; update workflow_releases set access_policy='free' where product_id='daily-card'"
	);
});
async function access(user: string | null = owner, role = 'authenticated', product = 'daily-card') {
	return asRole(
		db,
		role,
		user,
		async () =>
			(
				await db.query<{ value: unknown }>('select read_product_request_access($1) as value', [
					product
				])
			).rows[0].value
	);
}
async function entitlement(
	user = owner,
	state = 'ACTIVE',
	start: string | null = null,
	end: string | null = null
) {
	await db.query(
		'insert into entitlements(user_id,product_id,state,starts_at,ends_at) values ($1,$2,$3,$4,$5)',
		[user, 'daily-card', state, start, end]
	);
}
it('starts with all 25 products closed and reads do not create runs, library or entitlements', async () => {
	expect(
		(
			await db.query<{ n: number }>(
				'select count(*)::int as n from workflow_releases where enabled'
			)
		).rows[0].n
	).toBe(0);
	expect(await access()).toEqual({ state: 'UNRELEASED' });
	expect(await access(owner, 'authenticated', 'unknown')).toEqual({ state: 'UNRELEASED' });
	for (const table of ['product_runs', 'library_items', 'entitlements'])
		expect(
			(await db.query<{ n: number }>(`select count(*)::int as n from ${table}`)).rows[0].n
		).toBe(0);
});
it.each(['anon', 'service_role'])(
	'denies execute to %s even with a supplied subject',
	async (role) => {
		await expect(access(owner, role)).rejects.toThrow(/permission denied/);
	}
);
it('denies missing identity and deleted account', async () => {
	await expect(access(null)).rejects.toThrow('auth_required');
	await db.query('update profiles set deleted_at=now() where id=$1', [owner]);
	await expect(access()).rejects.toThrow('auth_required');
});
it('allows only enabled free products with the known contract', async () => {
	await db.exec("update workflow_releases set enabled=true where product_id='daily-card'");
	expect(await access()).toEqual({ state: 'AVAILABLE' });
	await db.exec(
		"update workflow_releases set contract_version='other' where product_id='daily-card'"
	);
	await expect(access()).rejects.toThrow('contract_unavailable');
});
it('does not use another account entitlement', async () => {
	await db.exec(
		"update workflow_releases set enabled=true,access_policy='entitlement' where product_id='daily-card'"
	);
	await entitlement(other);
	expect(await access()).toEqual({ state: 'ACCESS_REQUIRED' });
	expect(await access(other)).toEqual({ state: 'AVAILABLE' });
});
it.each(['PENDING', 'SUSPENDED', 'REVOKED', 'EXPIRED'])(
	'does not use %s entitlement',
	async (state) => {
		await db.exec(
			"update workflow_releases set enabled=true,access_policy='entitlement' where product_id='daily-card'"
		);
		await entitlement(owner, state);
		expect(await access()).toEqual({ state: 'ACCESS_REQUIRED' });
	}
);
it.each([
	['2099-01-01', null, 'ACCESS_REQUIRED'],
	[null, '1900-01-01', 'ACCESS_REQUIRED'],
	['1900-01-01', '2099-01-01', 'AVAILABLE'],
	[null, null, 'AVAILABLE']
])('uses database-time entitlement windows %#', async (start, end, state) => {
	await db.exec(
		"update workflow_releases set enabled=true,access_policy='entitlement' where product_id='daily-card'"
	);
	await entitlement(owner, 'ACTIVE', start, end);
	expect(await access()).toEqual({ state });
});
it('forward fix disables eligibility without deleting history or changing the write grant', async () => {
	await db.exec(
		await file('supabase/forward-fixes/20260925140000_disable_product_request_access.sql')
	);
	try {
		await expect(access()).rejects.toThrow(/permission denied/);
		expect(
			(
				await db.query<{ allowed: boolean }>(
					"select has_function_privilege('authenticated','public.request_product_run(text,uuid,jsonb,uuid)','execute') as allowed"
				)
			).rows[0].allowed
		).toBe(true);
		expect(
			(await db.query<{ n: number }>('select count(*)::int as n from workflow_releases')).rows[0].n
		).toBe(25);
	} finally {
		await db.exec(
			'grant execute on function public.read_product_request_access(text) to authenticated'
		);
	}
});
