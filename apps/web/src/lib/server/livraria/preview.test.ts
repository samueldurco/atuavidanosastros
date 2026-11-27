import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { catalog } from './catalog';
import { calculateQuote, parseQuoteInput, PreviewError, type QuoteInput } from './domain';
import { previewAction, previewSnapshot } from './preview';
import { emptyPreview, type PreviewDocument, type PreviewStore } from './store';
import { requireLivrariaPreview } from './access';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const now = Date.parse('2026-11-26T12:00:00Z');
const migrationPath = new URL(
	'../../../../../../supabase/migrations/20261126125656_p03_preview.sql',
	import.meta.url
);
const rollbackPath = new URL(
	'../../../../../../supabase/rollback/20261126125656_p03_preview.sql',
	import.meta.url
);
let db: PGlite;

const bootstrap = `create schema auth; create table auth.users(id uuid primary key); create role authenticated; create role anon; create role service_role bypassrls; create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$; grant usage on schema auth to authenticated; insert into auth.users values ('${owner}'),('${other}');`;

function pgStore(): PreviewStore {
	return {
		async load(ownerId) {
			const result = await db.query<{ version: number; data_json: PreviewDocument }>(
				'select version, data_json from public.p03_preview_accounts where owner_id=$1',
				[ownerId]
			);
			return result.rows[0]
				? { version: Number(result.rows[0].version), data: result.rows[0].data_json }
				: { version: null, data: emptyPreview() };
		},
		async compareAndSet(ownerId, expected, data) {
			const result =
				expected === null
					? await db.query(
							'insert into public.p03_preview_accounts(owner_id,data_json) values ($1,$2) on conflict do nothing returning owner_id',
							[ownerId, JSON.stringify(data)]
						)
					: await db.query(
							'update public.p03_preview_accounts set data_json=$1,version=version+1 where owner_id=$2 and version=$3 returning owner_id',
							[JSON.stringify(data), ownerId, expected]
						);
			return result.rows.length === 1;
		}
	};
}
const input = (change: Partial<QuoteInput> = {}) =>
	parseQuoteInput({ kind: 'book', bookId: 'book-01', cep: '01001-000', tier: 'none', ...change });
const action = (body: unknown, at = now, who = owner) => previewAction(pgStore(), who, body, at);
const quote = async (change: Partial<QuoteInput> = {}) =>
	((await action({ action: 'quote', input: input(change) })) as { quote: { id: string } }).quote;
async function checkout(
	change: Partial<QuoteInput>,
	requestKey: string,
	outcome = 'approved',
	consent = true
) {
	const q = await quote(change);
	return (await action({
		action: 'checkout',
		quoteId: q.id,
		requestKey,
		method: 'card',
		paymentOutcome: outcome,
		renewalAuthorized: change.kind === 'club' ? consent : false
	})) as {
		order: { id: string; quote: { totalCents: number }; endsAt: string };
		duplicate: boolean;
	};
}

beforeAll(async () => {
	db = new PGlite();
	await db.exec(bootstrap);
	await db.exec(await readFile(migrationPath, 'utf8'));
}, 30_000);
afterAll(async () => {
	await db?.close();
});

describe('P03 persistent simulation', () => {
	it('reconciles 21 distinct metadata records and keeps all file URLs behind the private API', () => {
		expect(catalog).toHaveLength(21);
		expect(new Set(catalog.map((book) => book.id)).size).toBe(21);
		expect(catalog.reduce((sum, book) => sum + book.chapters, 0)).toBe(392);
		expect(catalog.every((book) => book.coverUrl.startsWith('/api/livraria/previa/capas/'))).toBe(
			true
		);
		expect(catalog.every((book) => book.manuscriptStatus === 'IN_REWRITE')).toBe(true);
		expect(new Set(catalog.map((book) => book.summary)).size).toBe(21);
		expect(catalog[17].summary).toMatch(/colorir/);
	});

	it('uses P01 physical 10/15/20%, the best condition once, and excludes freight and subscriptions', () => {
		const tiers = ['essencial', 'ampliado', 'premium'] as const;
		expect(tiers.map((tier) => calculateQuote(input({ tier }), now).unitCents)).toEqual([
			7110, 6715, 6320
		]);
		const promotion = calculateQuote(input({ tier: 'essencial', condition: 'promotion15' }), now);
		expect(promotion.unitCents).toBe(6715);
		expect(promotion.priceSource).toBe('promotion');
		expect(promotion.memberGate).toBe('cost-review-required');
		const premium = calculateQuote(input({ tier: 'premium', condition: 'promotion15' }), now);
		expect(premium.unitCents).toBe(6320);
		expect(premium.totalCents).toBe(6320 + 1990);
		const annual = calculateQuote(
			input({ kind: 'club', cycle: 'annual', tier: 'premium', condition: 'coupon12' }),
			now
		);
		expect(annual.itemsCents).toBe(60000);
		expect(annual.shippingCents).toBe(1990 * 12);
		expect(annual.memberGate).toBe('excluded-kind');
		expect(annual.commercialEnabled).toBe(false);
	});

	it('rejects invalid/unserved CEP and unknown catalog IDs; covers representative fixture regions', () => {
		for (const cep of ['123', '00000000', '99999999'])
			expect(() => input({ cep })).toThrow(PreviewError);
		expect(() => input({ bookId: 'book-99' })).toThrow(PreviewError);
		expect(
			['01001000', '20040020', '40020000', '69005070', '90010000'].map(
				(cep) => calculateQuote(input({ cep }), now).shippingPerDeliveryCents
			)
		).toEqual([1990, 2490, 2990, 2990, 3490]);
	});

	it('validates quote ownership/expiry and repeats one checkout even after quote expiry', async () => {
		const q = await quote();
		await expect(
			action(
				{
					action: 'checkout',
					quoteId: q.id,
					requestKey: 'owner-denied-01',
					method: 'pix',
					paymentOutcome: 'approved',
					renewalAuthorized: false
				},
				now,
				other
			)
		).rejects.toMatchObject({ status: 404 });
		await expect(
			action(
				{
					action: 'checkout',
					quoteId: q.id,
					requestKey: 'expired-quote-01',
					method: 'pix',
					paymentOutcome: 'approved',
					renewalAuthorized: false
				},
				now + 16 * 60_000
			)
		).rejects.toMatchObject({ status: 410 });
		const request = {
			action: 'checkout',
			quoteId: q.id,
			requestKey: 'checkout-book-01',
			method: 'pix',
			paymentOutcome: 'approved',
			renewalAuthorized: false,
			totalCents: 1
		};
		const first = (await action(request)) as {
			order: { id: string; quote: { totalCents: number } };
			duplicate: boolean;
		};
		const replay = (await action(request, now + 20 * 60_000)) as typeof first;
		expect(first.order.quote.totalCents).toBe(9890);
		expect(replay.order.id).toBe(first.order.id);
		expect(replay.duplicate).toBe(true);
		await expect(action({ ...request, paymentOutcome: 'failed' })).rejects.toMatchObject({
			status: 409
		});
		await expect(action({ ...request, requestKey: 'another-book-01' })).rejects.toMatchObject({
			status: 409
		});
		const freshStore = pgStore();
		expect(
			(await previewSnapshot(freshStore, owner, now)).account.orders.filter(
				(order) => order.id === first.order.id
			)
		).toHaveLength(1);
		expect((await previewSnapshot(freshStore, other, now)).account.orders).toHaveLength(0);
	});

	it('atomically retries concurrent CAS, recovers payment failure and produces only 12 annual competencies', async () => {
		const annual = await checkout(
			{ kind: 'club', cycle: 'annual' },
			'annual-checkout-01',
			'pending'
		);
		expect(
			(await previewSnapshot(pgStore(), owner, now)).account.shipments.filter(
				(item) => item.orderId === annual.order.id
			)
		).toHaveLength(0);
		await action({
			action: 'payment',
			orderId: annual.order.id,
			eventKey: 'annual-failed-001',
			outcome: 'failed'
		});
		const pay = {
			action: 'payment',
			orderId: annual.order.id,
			eventKey: crypto.randomUUID(),
			outcome: 'approved'
		};
		const results = await Promise.all([action(pay), action(pay)]);
		expect(results.map((result) => 'duplicate' in result && result.duplicate).sort()).toEqual([
			false,
			true
		]);
		await action({
			action: 'payment',
			orderId: annual.order.id,
			eventKey: 'annual-late-fail01',
			outcome: 'failed'
		});
		const snapshot = await previewSnapshot(pgStore(), owner, now);
		const shipments = snapshot.account.shipments.filter((item) => item.orderId === annual.order.id);
		expect(shipments).toHaveLength(12);
		expect(new Set(shipments.map((item) => `${item.orderId}:${item.competence}`)).size).toBe(12);
		expect(snapshot.account.orders.find((item) => item.id === annual.order.id)?.status).toBe(
			'paid'
		);
		await expect(action({ ...pay, outcome: 'failed' })).rejects.toMatchObject({ status: 409 });
	});

	it('validates and tracks all three monthly shipments, cutoff retries, event duplicates and one replacement', async () => {
		const quarterly = await checkout({ kind: 'club', cycle: 'quarterly' }, 'quarter-checkout-01');
		const shipments = (await previewSnapshot(pgStore(), owner, now)).account.shipments.filter(
			(item) => item.orderId === quarterly.order.id
		);
		expect(shipments).toHaveLength(3);
		for (const [index, shipment] of shipments.entries()) {
			const base = {
				action: 'fulfillment',
				orderId: quarterly.order.id,
				competence: shipment.competence
			};
			await expect(
				action({ ...base, eventKey: `ship-early-${index}`, operation: 'ship' })
			).rejects.toMatchObject({ status: 409 });
			await action({
				...base,
				eventKey: `address-bad-${index}`,
				operation: 'cutoff',
				addressValid: false,
				editionReady: true
			});
			await action({
				...base,
				eventKey: `edition-bad-${index}`,
				operation: 'cutoff',
				addressValid: true,
				editionReady: false
			});
			const ready = {
				...base,
				eventKey: `cutoff-ready-${index}`,
				operation: 'cutoff',
				addressValid: true,
				editionReady: true
			};
			await action(ready);
			await action(ready);
			await action({ ...base, eventKey: `ship-ready-${index}`, operation: 'ship' });
			await action({ ...base, eventKey: `deliver-done-${index}`, operation: 'deliver' });
			const replace = { ...base, eventKey: `replace-one-${index}`, operation: 'replace' };
			await action(replace);
			await action(replace);
			await expect(action({ ...replace, eventKey: `replace-two-${index}` })).rejects.toMatchObject({
				status: 409
			});
		}
		const final = (await previewSnapshot(pgStore(), owner, now)).account.shipments.filter(
			(item) => item.orderId === quarterly.order.id
		);
		expect(
			final.every(
				(item) =>
					item.status === 'delivered' &&
					item.attempts === 3 &&
					item.replacementCount === 1 &&
					item.tracking?.startsWith('SIM-') &&
					item.replacementTracking?.startsWith('SIM-REP-')
			)
		).toBe(true);
		expect(final).toHaveLength(3);
		await action({
			action: 'renewal',
			orderId: quarterly.order.id,
			eventKey: crypto.randomUUID(),
			enabled: false
		});
		const after = await previewSnapshot(pgStore(), owner, Date.parse(quarterly.order.endsAt));
		expect(after.account.orders.find((item) => item.id === quarterly.order.id)).toMatchObject({
			renewalEnabled: false,
			effectiveStatus: 'expired'
		});
		await expect(
			action(
				{
					action: 'renewal',
					orderId: quarterly.order.id,
					eventKey: 'expired-renewal01',
					enabled: true
				},
				Date.parse(quarterly.order.endsAt)
			)
		).rejects.toMatchObject({ status: 410 });
		const noConsent = await checkout(
			{ kind: 'club', cycle: 'quarterly' },
			'quarter-no-consent',
			'approved',
			false
		);
		await expect(
			action({
				action: 'renewal',
				orderId: noConsent.order.id,
				eventKey: 'enable-no-consent',
				enabled: true
			})
		).rejects.toMatchObject({ status: 409 });
	});

	it('keeps annual and quarterly content equal and does not create a new paid cycle on renewal toggle', async () => {
		const snapshot = await previewSnapshot(pgStore(), owner, now);
		const annual = snapshot.account.orders.find((order) => order.cycleMonths === 12)!;
		const quarterly = snapshot.account.orders.find((order) => order.cycleMonths === 3)!;
		expect(
			snapshot.account.shipments
				.filter((item) => item.orderId === annual.id)
				.slice(0, 3)
				.map((item) => item.editionId)
		).toEqual(
			snapshot.account.shipments
				.filter((item) => item.orderId === quarterly.id)
				.map((item) => item.editionId)
		);
		const count = snapshot.account.orders.length;
		await action({
			action: 'renewal',
			orderId: annual.id,
			eventKey: 'annual-renew-off',
			enabled: false
		});
		expect((await previewSnapshot(pgStore(), owner, now)).account.orders).toHaveLength(count);
	});

	it('applies migration twice, enforces RLS across owners and anonymous roles, and rolls back/reapplies only P03', async () => {
		const isolated = new PGlite();
		try {
			await isolated.exec(bootstrap);
			await isolated.exec(
				'create table public.unrelated_gate(id integer); insert into public.unrelated_gate values(42)'
			);
			const migration = await readFile(migrationPath, 'utf8');
			await isolated.exec(migration);
			await isolated.exec(migration);
			await isolated.exec(
				`insert into public.p03_preview_accounts(owner_id) values('${owner}'); set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false)`
			);
			await expect(
				isolated.exec(`insert into public.p03_preview_accounts(owner_id) values('${other}')`)
			).rejects.toThrow(/permission denied/);
			await expect(isolated.query('select * from public.p03_preview_accounts')).rejects.toThrow(
				/permission denied/
			);
			await expect(
				isolated.query('update public.p03_preview_accounts set version=99 returning owner_id')
			).rejects.toThrow(/permission denied/);
			await isolated.exec('reset role; set role anon');
			await expect(isolated.query('select * from public.p03_preview_accounts')).rejects.toThrow(
				/permission denied/
			);
			await isolated.exec('reset role');
			await isolated.exec(await readFile(rollbackPath, 'utf8'));
			expect(
				(await isolated.query<{ id: number }>('select id from public.unrelated_gate')).rows[0].id
			).toBe(42);
			await isolated.exec(migration);
			expect((await isolated.query('select * from public.p03_preview_accounts')).rows).toHaveLength(
				0
			);
		} finally {
			await isolated.close();
		}
	}, 30_000);
});

describe('P03 server authorization', () => {
	function event(
		claims: Record<string, unknown> | null,
		allowed = owner,
		user?: Record<string, unknown>
	) {
		return {
			url: new URL('https://atvna.test/loja/livraria/previa'),
			platform: { env: { LIVRARIA_PREVIEW_OWNER_IDS: allowed, ADMIN_EMAIL_ALLOWLIST: '' } },
			locals: {
				supabase: {
					auth: {
						getClaims: async () => ({ data: claims ? { claims } : null, error: null }),
						getUser: async () => ({
							data: { user: user ?? (claims ? { id: claims.sub, is_anonymous: false } : null) },
							error: null
						})
					}
				}
			}
		} as unknown as Parameters<typeof requireLivrariaPreview>[0];
	}
	it('requires authenticated nonanonymous signed claims and a server allowlist; ignores browser metadata', async () => {
		await expect(requireLivrariaPreview(event(null), true)).rejects.toMatchObject({ status: 401 });
		await expect(requireLivrariaPreview(event(null))).rejects.toMatchObject({ status: 303 });
		await expect(
			requireLivrariaPreview(event({ sub: owner, role: 'authenticated', is_anonymous: true }), true)
		).rejects.toMatchObject({ status: 401 });
		await expect(
			requireLivrariaPreview(
				event({ sub: other, role: 'authenticated', user_metadata: { admin: true } }),
				true
			)
		).rejects.toMatchObject({ status: 403 });
		await expect(
			requireLivrariaPreview(event({ sub: owner, role: 'authenticated' }, ''), true)
		).rejects.toMatchObject({ status: 403 });
		await expect(
			requireLivrariaPreview(event({ sub: owner, role: 'authenticated' }), true)
		).resolves.toBe(owner);
	});
	it('accepts existing admin only with a confirmed email returned by getUser', async () => {
		const candidate = event(
			{ sub: owner, role: 'authenticated', email: 'owner@example.test' },
			'',
			{
				id: owner,
				email: 'owner@example.test',
				email_confirmed_at: '2026-01-01',
				is_anonymous: false
			}
		);
		candidate.platform!.env.ADMIN_EMAIL_ALLOWLIST = 'owner@example.test';
		await expect(requireLivrariaPreview(candidate, true)).resolves.toBe(owner);
		const unverified = event(
			{ sub: owner, role: 'authenticated', email: 'owner@example.test' },
			'',
			{ id: owner, email: 'owner@example.test' }
		);
		unverified.platform!.env.ADMIN_EMAIL_ALLOWLIST = 'owner@example.test';
		await expect(requireLivrariaPreview(unverified, true)).rejects.toMatchObject({ status: 403 });
	});
});
