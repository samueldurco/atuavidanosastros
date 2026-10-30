import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import {
	setupProductDatabase,
	owner,
	other
} from '../../../../../scripts/helpers/product-database.mjs';
import { asRole } from '../../../../../scripts/helpers/artifact-fixture.mjs';
import { newsConsentApi, NEWS_CONSENT_POLICY, NEWS_CONSENT_SOURCE } from './news-consent';

const service = vi.hoisted(() => ({ createClient: vi.fn(), insert: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: service.createClient }));
vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$env/dynamic/public', () => ({ env: {} }));
const secret = 'synthetic-consent-binding-key-for-local-tests-only';
function event(
	body?: unknown,
	options: {
		user?: string | null;
		confirmed?: boolean;
		origin?: string;
		authError?: boolean;
		bindings?: Record<string, string>;
		headers?: Record<string, string>;
		raw?: string;
	} = {}
) {
	const user = options.user === undefined ? owner : options.user;
	return {
		url: new URL('https://atv.test/api/free-tools/news-consent'),
		request: new Request('https://atv.test/api/free-tools/news-consent', {
			method: body === undefined ? 'GET' : 'POST',
			headers: {
				origin: options.origin ?? 'https://atv.test',
				'content-type': 'application/json',
				...options.headers
			},
			...(body === undefined ? {} : { body: options.raw ?? JSON.stringify(body) })
		}),
		platform: {
			env: {
				FREE_TOOL_RECEIPT_KEY: secret,
				PUBLIC_SUPABASE_URL: 'https://synthetic.invalid',
				SUPABASE_SERVICE_ROLE_KEY: 'synthetic-private-service',
				...options.bindings
			}
		},
		locals: {
			supabase: {
				auth: {
					getUser: async () => ({
						data: {
							user: user
								? {
										id: user,
										email_confirmed_at: options.confirmed === false ? null : '2026-10-30T00:00:00Z'
									}
								: null
						},
						error: options.authError ? new Error('PRIVATE_AUTH_ERROR') : null
					})
				}
			}
		}
	} as unknown as RequestEvent;
}
const get = (options?: Parameters<typeof event>[1]) =>
	newsConsentApi(event(undefined, options), false);
const post = (body: unknown, options?: Parameters<typeof event>[1]) =>
	newsConsentApi(event(body, options), true);
async function token(options?: Parameters<typeof event>[1]) {
	const body = (await (await get(options)).json()) as { owner: string };
	return body.owner;
}
beforeEach(() => {
	vi.restoreAllMocks();
	service.createClient.mockReset();
	service.insert.mockReset();
	service.insert.mockImplementation(() => ({ abortSignal: async () => ({ error: null }) }));
	service.createClient.mockReturnValue({
		from: vi.fn((table: string) => {
			if (table !== 'consent_events') throw new Error('unexpected table');
			return { insert: service.insert };
		})
	});
});

describe('consentimento opcional de novidades', () => {
	it('GET devolve somente vínculo opaco, não registra escolha nem expõe identidade', async () => {
		const response = await get();
		const body = (await response.json()) as { owner: string };
		expect(response.status).toBe(200);
		expect(Object.keys(body)).toEqual(['owner']);
		expect(body.owner).toMatch(/^\d{13}\.[a-f0-9]{64}$/);
		expect(JSON.stringify(body)).not.toContain(owner);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(service.createClient).not.toHaveBeenCalled();
	});
	it.each([true, false])(
		'registra escolha explícita %s para a conta confirmada pelo servidor',
		async (granted) => {
			const response = await post({ granted, owner: await token() });
			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({ saved: true, granted });
			expect(service.createClient).toHaveBeenCalledWith(
				'https://synthetic.invalid',
				'synthetic-private-service',
				{ auth: { persistSession: false, autoRefreshToken: false } }
			);
			expect(service.insert).toHaveBeenCalledExactlyOnceWith({
				user_id: owner,
				consent_type: 'MARKETING',
				granted,
				policy_version: NEWS_CONSENT_POLICY,
				source: NEWS_CONSENT_SOURCE
			});
		}
	);
	it.each([{ user: null }, { confirmed: false }, { authError: true }])(
		'recusa identidade ausente/não confirmada/inválida %j',
		async (options) => {
			expect((await get(options)).status).toBe(401);
			expect((await post({ granted: true, owner: await token() }, options)).status).toBe(401);
			expect(service.createClient).not.toHaveBeenCalled();
		}
	);
	it('recusa troca de conta e recibo adulterado antes de construir cliente privilegiado', async () => {
		const binding = await token();
		expect((await post({ granted: true, owner: binding }, { user: other })).status).toBe(409);
		expect(
			(await post({ granted: true, owner: `${binding.slice(0, 14)}${'0'.repeat(64)}` })).status
		).toBe(409);
		expect(service.createClient).not.toHaveBeenCalled();
	});
	it('expira a escolha e recusa token futuro', async () => {
		const now = Date.now();
		const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
		const binding = await token();
		clock.mockReturnValue(now + 15 * 60 * 1000 + 1);
		expect((await post({ granted: true, owner: binding })).status).toBe(409);
		clock.mockReturnValue(now - 6000);
		expect((await post({ granted: true, owner: binding })).status).toBe(409);
		expect(service.createClient).not.toHaveBeenCalled();
	});
	it.each([{ origin: 'https://evil.test' }, { headers: { 'sec-fetch-site': 'cross-site' } }])(
		'recusa outra origem %j em GET e POST',
		async (options) => {
			expect((await get(options)).status).toBe(403);
			expect((await post({}, options)).status).toBe(403);
			expect(service.createClient).not.toHaveBeenCalled();
		}
	);
	it('não aceita e-mail, user_id, versão/fonte ou valores implícitos no corpo', async () => {
		const binding = await token();
		for (const body of [
			null,
			[],
			{ owner: binding },
			{ owner: binding, granted: 'true' },
			{ owner: binding, granted: true, user_id: other },
			{ owner: binding, granted: true, email: 'synthetic@example.invalid' },
			{ owner: binding, granted: true, source: 'anything' }
		])
			expect((await post(body)).status).toBe(400);
		expect(service.createClient).not.toHaveBeenCalled();
	});
	it('recusa JSON grande, malformado e outro content-type', async () => {
		for (const options of [
			{ raw: '{' },
			{ raw: JSON.stringify({ text: 'x'.repeat(1025) }) },
			{ headers: { 'content-type': 'text/plain' } }
		])
			expect((await post({}, options)).status).toBe(400);
		expect(service.createClient).not.toHaveBeenCalled();
	});
	it('falha fechada sem configuração e não simula salvamento quando banco falha', async () => {
		const binding = await token();
		const missingBindings: Record<string, string>[] = [
			{ FREE_TOOL_RECEIPT_KEY: '' },
			{ PUBLIC_SUPABASE_URL: '' },
			{ SUPABASE_SERVICE_ROLE_KEY: '' }
		];
		for (const bindings of missingBindings)
			expect((await post({ owner: binding, granted: true }, { bindings })).status).toBe(503);
		expect(service.createClient).not.toHaveBeenCalled();
		service.insert.mockImplementation(() => ({
			abortSignal: async () => ({ error: new Error('PRIVATE_DATABASE_ERROR') })
		}));
		const response = await post({ owner: binding, granted: true });
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ code: 'consent_unavailable' });
	});
});

describe('consent_events no PostgreSQL local com migração real', () => {
	let db: Awaited<ReturnType<typeof setupProductDatabase>>;
	beforeAll(async () => {
		db = await setupProductDatabase({ privateOnly: true });
	}, 30000);
	afterAll(async () => {
		await db?.close();
	});
	it('RLS impede escrita direta de anon e authenticated, mesmo com concessões da plataforma', async () => {
		for (const role of ['anon', 'authenticated']) {
			await expect(
				asRole(db, role, owner, () =>
					db.query(
						"insert into consent_events(user_id,consent_type,granted,policy_version,source) values ($1,'MARKETING',true,'synthetic','synthetic')",
						[owner]
					)
				)
			).rejects.toThrow(/row-level security/);
		}
		expect((await db.query('select count(*)::int as n from consent_events')).rows).toEqual([
			{ n: 0 }
		]);
	});
	it('API insere a autorização e a retirada reais sem email nem outra conta', async () => {
		service.insert.mockImplementation((record) => ({
			abortSignal: async () => {
				await asRole(db, 'service_role', null, () =>
					db.query(
						'insert into consent_events(user_id,consent_type,granted,policy_version,source) values ($1,$2,$3,$4,$5)',
						[
							record.user_id,
							record.consent_type,
							record.granted,
							record.policy_version,
							record.source
						]
					)
				);
				return { error: null };
			}
		}));
		for (const granted of [true, false])
			expect((await post({ owner: await token(), granted })).status).toBe(200);
		expect(
			(
				await db.query(
					'select user_id,consent_type,granted,policy_version,source from consent_events order by occurred_at'
				)
			).rows
		).toEqual(
			[true, false].map((granted) => ({
				user_id: owner,
				consent_type: 'MARKETING',
				granted,
				policy_version: NEWS_CONSENT_POLICY,
				source: NEWS_CONSENT_SOURCE
			}))
		);
		expect(
			(
				await asRole(db, 'authenticated', owner, () =>
					db.query('select count(*)::int as n from consent_events')
				)
			).rows
		).toEqual([{ n: 0 }]);
	});
});
