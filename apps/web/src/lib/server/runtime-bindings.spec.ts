import { beforeEach, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import {
	supabaseAuthBindings,
	trialRuntimeConfigured,
	trialServiceBindings
} from './runtime-bindings';
import { trialWriter } from './private-trials';
import { GET } from '../../routes/api/private-trials/health/+server';
import { handle } from '../../hooks.server';

const mocks = vi.hoisted(() => ({
	publicEnv: {} as Record<string, string>,
	privateEnv: {} as Record<string, string>,
	createClient: vi.fn(),
	createServerClient: vi.fn(),
	query: vi.fn()
}));
vi.mock('$env/dynamic/public', () => ({ env: mocks.publicEnv }));
vi.mock('$env/dynamic/private', () => ({ env: mocks.privateEnv }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }));

const platformValues = {
	PUBLIC_SUPABASE_URL: 'https://request.synthetic.test',
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-key',
	SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-key',
	ATV_TRIAL_RUNTIME_KEY: 'synthetic-runtime-key'
};
const request = (bindings: Record<string, string> = platformValues) =>
	({ platform: { env: bindings } }) as unknown as RequestEvent;

beforeEach(() => {
	vi.resetAllMocks();
	for (const key of Object.keys(mocks.publicEnv)) delete mocks.publicEnv[key];
	for (const key of Object.keys(mocks.privateEnv)) delete mocks.privateEnv[key];
	const builder = {
		from: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		abortSignal: mocks.query
	};
	mocks.createClient.mockReturnValue(builder);
	mocks.query.mockResolvedValue({ error: null });
});

it('resolve bindings da requisição sem depender de env dinâmico nem expor serviço ao cliente público', () => {
	expect(supabaseAuthBindings(request())).toEqual({
		url: platformValues.PUBLIC_SUPABASE_URL,
		key: platformValues.PUBLIC_SUPABASE_PUBLISHABLE_KEY
	});
	expect(trialRuntimeConfigured(trialServiceBindings(request()))).toBe(true);
});

it('inicializa autenticação no hook com a chave pública da plataforma e mantém cookies privados', async () => {
	const client = { auth: {} };
	mocks.createServerClient.mockReturnValue(client);
	const event = {
		...request(),
		url: new URL('https://atuavidanosastros.com.br/biblioteca'),
		request: new Request('https://atuavidanosastros.com.br/biblioteca'),
		locals: {},
		cookies: {
			getAll: () => [{ name: 'sb-synthetic-auth-token', value: 'synthetic' }],
			set: vi.fn()
		}
	} as unknown as RequestEvent;
	const response = await handle({ event, resolve: async () => new Response('ok') });
	expect(event.locals.supabase).toBe(client);
	expect(mocks.createServerClient).toHaveBeenCalledWith(
		platformValues.PUBLIC_SUPABASE_URL,
		platformValues.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		expect.objectContaining({ cookies: expect.any(Object) })
	);
	expect(mocks.createClient).not.toHaveBeenCalled();
	expect(response.headers.get('cache-control')).toBe('private, no-store');
	expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
});

it('mantém fallback dinâmico quando o adaptador não fornece bindings', () => {
	Object.assign(mocks.publicEnv, {
		PUBLIC_SUPABASE_URL: 'https://fallback.synthetic.test',
		PUBLIC_SUPABASE_ANON_KEY: 'synthetic-anon'
	});
	Object.assign(mocks.privateEnv, {
		SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-fallback',
		ATV_TRIAL_RUNTIME_KEY: 'synthetic-runtime-fallback'
	});
	const event = { platform: undefined } as RequestEvent;
	expect(supabaseAuthBindings(event).key).toBe('synthetic-anon');
	expect(trialServiceBindings(event)).toEqual({
		url: 'https://fallback.synthetic.test',
		serviceRoleKey: 'synthetic-service-fallback',
		runtimeKey: 'synthetic-runtime-fallback'
	});
});

it('prioriza a chave pública presente na plataforma e respeita desativação explícita', () => {
	mocks.publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'synthetic-other-environment';
	expect(
		supabaseAuthBindings(request({ PUBLIC_SUPABASE_ANON_KEY: 'synthetic-request-anon' })).key
	).toBe('synthetic-request-anon');
	expect(supabaseAuthBindings(request({ PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' })).key).toBe('');
});

it('isola as configurações de cada requisição e não recupera chave explicitamente vazia', () => {
	mocks.privateEnv.ATV_TRIAL_RUNTIME_KEY = 'synthetic-stale-runtime';
	expect(trialServiceBindings(request()).runtimeKey).toBe('synthetic-runtime-key');
	const empty = trialServiceBindings(request({ ...platformValues, ATV_TRIAL_RUNTIME_KEY: '' }));
	expect(empty.runtimeKey).toBe('');
	expect(trialRuntimeConfigured(empty)).toBe(false);
	expect(trialServiceBindings(request()).runtimeKey).toBe('synthetic-runtime-key');
});

it('usa o serviço por requisição com persistência de sessão desativada', () => {
	trialWriter(request());
	expect(mocks.createClient).toHaveBeenCalledWith(
		platformValues.PUBLIC_SUPABASE_URL,
		platformValues.SUPABASE_SERVICE_ROLE_KEY,
		{ auth: { persistSession: false, autoRefreshToken: false } }
	);
});

it('rejeita writer sem chave e não usa a chave pública como substituta', () => {
	expect(() =>
		trialWriter(
			request({
				PUBLIC_SUPABASE_URL: platformValues.PUBLIC_SUPABASE_URL,
				PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-public-only'
			})
		)
	).toThrow();
	expect(mocks.createClient).not.toHaveBeenCalled();
});

it('health confirma bindings e consulta real sem devolver chaves ou dados', async () => {
	const response = await GET(request() as Parameters<typeof GET>[0]);
	expect(response.status).toBe(200);
	expect(response.headers.get('cache-control')).toBe('private, no-store');
	const body = (await response.json()) as Record<string, unknown>;
	expect(body).toMatchObject({
		available: true,
		configurationReady: true,
		scope: 'private-free-test'
	});
	expect(Object.keys(body).sort()).toEqual([
		'available',
		'configurationReady',
		'runtimeKeyPresent',
		'scope',
		'serviceRolePresent',
		'urlValid',
		'version'
	]);
	expect(body).toMatchObject({
		urlValid: true,
		serviceRolePresent: true,
		runtimeKeyPresent: true
	});
	// The response is restricted to booleans and these two public constants,
	// so values, lengths, fingerprints and hashes cannot be serialized.
	for (const [key, value] of Object.entries(body)) {
		if (key !== 'scope' && key !== 'version') expect(typeof value).toBe('boolean');
	}
	for (const value of Object.values(platformValues)) {
		expect(JSON.stringify(body)).not.toContain(value);
	}
	expect(mocks.query).toHaveBeenCalledOnce();
});

it('health distingue indisponibilidade do banco sem expor mensagem do provedor', async () => {
	mocks.query.mockResolvedValue({ error: { message: 'synthetic-private-provider-detail' } });
	const response = await GET(request() as Parameters<typeof GET>[0]);
	expect(response.status).toBe(503);
	const body = await response.json();
	expect(body).toMatchObject({ available: false, configurationReady: true });
	expect(JSON.stringify(body)).not.toContain('synthetic');
});

it('health falha fechado se falta o binding de runtime', async () => {
	const response = await GET(
		request({ ...platformValues, ATV_TRIAL_RUNTIME_KEY: '' }) as Parameters<typeof GET>[0]
	);
	expect(response.status).toBe(503);
	expect(await response.json()).toMatchObject({ available: false, configurationReady: false });
});

it.each([
	['PUBLIC_SUPABASE_URL', 'urlValid'],
	['SUPABASE_SERVICE_ROLE_KEY', 'serviceRolePresent'],
	['ATV_TRIAL_RUNTIME_KEY', 'runtimeKeyPresent']
] as const)(
	'health identifica somente a configuração ausente ou vazia de %s',
	async (key, field) => {
		for (const value of [undefined, '', '   ']) {
			const bindings: Record<string, string> = { ...platformValues };
			if (value === undefined) delete bindings[key];
			else bindings[key] = value;
			const response = await GET(request(bindings) as Parameters<typeof GET>[0]);
			expect(response.status).toBe(503);
			expect(await response.json()).toMatchObject({
				available: false,
				configurationReady: false,
				urlValid: true,
				serviceRolePresent: true,
				runtimeKeyPresent: true,
				[field]: false
			});
		}
	}
);

it('health distingue URL insegura de chaves presentes sem enfraquecer o guard', async () => {
	const response = await GET(
		request({ ...platformValues, PUBLIC_SUPABASE_URL: 'http://synthetic.test' }) as Parameters<
			typeof GET
		>[0]
	);
	expect(response.status).toBe(503);
	expect(await response.json()).toMatchObject({
		available: false,
		configurationReady: false,
		urlValid: false,
		serviceRolePresent: true,
		runtimeKeyPresent: true
	});
});
