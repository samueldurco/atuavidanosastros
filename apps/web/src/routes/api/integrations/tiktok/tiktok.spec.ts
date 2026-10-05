import { Buffer } from 'node:buffer';
import { beforeEach, expect, it, vi } from 'vitest';
import { GET as connect } from './connect/+server';
import { GET as callback } from './callback/+server';
import { decryptTikTokTokens } from '$lib/server/tiktok-credentials';

const mocks = vi.hoisted(() => ({
	privateEnv: {} as Record<string, string>,
	publicEnv: { PUBLIC_SUPABASE_URL: 'https://storage.example' },
	exchange: vi.fn(),
	profile: vi.fn(),
	upsert: vi.fn(),
	from: vi.fn()
}));
vi.mock('$env/dynamic/private', () => ({ env: mocks.privateEnv }));
vi.mock('$env/dynamic/public', () => ({ env: mocks.publicEnv }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: mocks.from }) }));
vi.mock('@atv/integrations', async (importOriginal) => ({
	...(await importOriginal<typeof import('@atv/integrations')>()),
	exchangeTikTokAuthorizationCode: mocks.exchange,
	TikTokDisplayClient: class {
		getProfile = mocks.profile;
	}
}));

const tokens = {
	accessToken: 'synthetic-access',
	refreshToken: 'synthetic-refresh',
	openId: 'synthetic-open-id',
	scopes: ['user.info.basic', 'video.upload'],
	accessExpiresAt: '2026-10-06T12:00:00Z',
	refreshExpiresAt: '2027-10-05T12:00:00Z'
};

function event(path: string, email = 'admin@example.test', state = 'valid-state') {
	return {
		url: new URL(`https://site.example/api/integrations/tiktok/${path}`),
		cookies: { get: vi.fn(() => state), set: vi.fn(), delete: vi.fn() },
		locals: {
			supabase: {
				auth: {
					getClaims: vi.fn(async () => ({
						data: { claims: { sub: 'synthetic-admin', email } },
						error: null
					}))
				}
			}
		}
	} as unknown as Parameters<typeof connect>[0] & Parameters<typeof callback>[0];
}

beforeEach(() => {
	vi.clearAllMocks();
	Object.keys(mocks.privateEnv).forEach((key) => delete mocks.privateEnv[key]);
	Object.assign(mocks.privateEnv, {
		ADMIN_EMAIL_ALLOWLIST: 'admin@example.test',
		TIKTOK_CLIENT_KEY: 'synthetic-client',
		TIKTOK_CLIENT_SECRET: 'synthetic-secret',
		TIKTOK_REDIRECT_URI: 'https://site.example/api/integrations/tiktok/callback',
		TIKTOK_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
		SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-role'
	});
	mocks.exchange.mockResolvedValue(tokens);
	mocks.profile.mockResolvedValue({
		openId: tokens.openId,
		displayName: 'Synthetic',
		avatarUrl: ''
	});
	mocks.upsert.mockResolvedValue({ error: null });
	mocks.from.mockReturnValue({ upsert: mocks.upsert });
});

it('restringe a conexão ao administrador autorizado', async () => {
	await expect(connect(event('connect', 'other@example.test'))).rejects.toMatchObject({
		status: 403
	});
	expect(mocks.exchange).not.toHaveBeenCalled();
});

it('recusa início sem autenticação disponível', async () => {
	const input = event('connect');
	input.locals.supabase = undefined;
	await expect(connect(input)).rejects.toMatchObject({ status: 503 });
	expect(input.cookies.set).not.toHaveBeenCalled();
});

it('solicita identificação e envio de vídeos sem Direct Post, com state seguro', async () => {
	const input = event('connect');
	const result = await Promise.resolve(connect(input)).catch((failure: unknown) => failure);
	if (!result || typeof result !== 'object' || !('location' in result)) {
		throw new Error('A conexão deve redirecionar para a autorização TikTok.');
	}
	expect(result).toMatchObject({
		status: 303,
		location: expect.stringContaining('https://www.tiktok.com/')
	});
	const authorization = new URL(String(result.location));
	expect(authorization.searchParams.get('scope')).toBe('user.info.basic,video.upload');
	expect(input.cookies.set).toHaveBeenCalledWith(
		'atv_tiktok_oauth_state',
		expect.any(String),
		expect.objectContaining({
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 600,
			path: '/api/integrations/tiktok'
		})
	);
	const state = vi.mocked(input.cookies.set).mock.calls[0][1];
	expect(state).toMatch(/^[a-f0-9]{32}$/);
});

it.each(['TIKTOK_CLIENT_SECRET', 'SUPABASE_SERVICE_ROLE_KEY'])(
	'recusa configuração sem %s antes do redirecionamento',
	async (key) => {
		delete mocks.privateEnv[key];
		const input = event('connect');
		await expect(connect(input)).rejects.toMatchObject({ status: 503 });
		expect(input.cookies.set).not.toHaveBeenCalled();
	}
);

it.each([
	['TIKTOK_TOKEN_ENCRYPTION_KEY', 'invalid'],
	['TIKTOK_REDIRECT_URI', 'https://another.example/api/integrations/tiktok/callback'],
	['TIKTOK_REDIRECT_URI', 'https://site.example/api/integrations/tiktok/callback?injected=1']
])('recusa configuração insegura: %s', async (key, value) => {
	mocks.privateEnv[key] = value;
	await expect(connect(event('connect'))).rejects.toMatchObject({ status: 503 });
});

it('consome o cookie e recusa state inválido sem chamar o provedor', async () => {
	const input = event('callback?state=wrong&code=synthetic-code');
	await expect(callback(input)).rejects.toMatchObject({ status: 400 });
	expect(input.cookies.delete).toHaveBeenCalledWith('atv_tiktok_oauth_state', {
		path: '/api/integrations/tiktok'
	});
	expect(mocks.exchange).not.toHaveBeenCalled();
});

it('recusa autorização negada e código ausente', async () => {
	await expect(callback(event('callback?error=access_denied'))).rejects.toMatchObject({
		status: 400
	});
	await expect(callback(event('callback?state=valid-state'))).rejects.toMatchObject({
		status: 400
	});
	expect(mocks.exchange).not.toHaveBeenCalled();
});

it.each([{ scopes: [] }, { scopes: ['user.info.basic'] }, { scopes: ['video.upload'] }])(
	'recusa autorização parcial $scopes antes de consultar perfil ou gravar',
	async ({ scopes }) => {
		mocks.exchange.mockResolvedValue({ ...tokens, scopes });
		await expect(
			callback(event('callback?state=valid-state&code=synthetic-code'))
		).rejects.toMatchObject({ status: 400 });
		expect(mocks.upsert).not.toHaveBeenCalled();
		expect(mocks.profile).not.toHaveBeenCalled();
	}
);

it('recusa identidade divergente sem gravar', async () => {
	mocks.profile.mockResolvedValue({ openId: 'another-id' });
	await expect(
		callback(event('callback?state=valid-state&code=synthetic-code'))
	).rejects.toMatchObject({ status: 400 });
	expect(mocks.upsert).not.toHaveBeenCalled();
});

it('confirma somente depois de armazenar credenciais criptografadas', async () => {
	await expect(
		callback(event('callback?state=valid-state&code=synthetic-code'))
	).rejects.toMatchObject({ status: 303, location: '/admin?tiktok=connected' });
	const stored = mocks.upsert.mock.calls[0][0];
	expect(JSON.stringify(stored)).not.toContain(tokens.accessToken);
	expect(JSON.stringify(stored)).not.toContain(tokens.refreshToken);
	expect(stored).toMatchObject({
		id: 'primary',
		owner_user_id: 'synthetic-admin',
		scopes: ['user.info.basic', 'video.upload']
	});
	expect(
		await decryptTikTokTokens(
			{ ciphertext: stored.token_ciphertext, iv: stored.token_iv },
			mocks.privateEnv.TIKTOK_TOKEN_ENCRYPTION_KEY
		)
	).toEqual(tokens);
});

it('não confirma conexão quando armazenamento falha', async () => {
	mocks.upsert.mockResolvedValue({ error: { message: 'synthetic database error' } });
	await expect(
		callback(event('callback?state=valid-state&code=synthetic-code'))
	).rejects.toMatchObject({ status: 503 });
});

it('não expõe mensagens do provedor no erro público', async () => {
	mocks.exchange.mockRejectedValue(new Error('synthetic-access synthetic-secret'));
	await expect(
		callback(event('callback?state=valid-state&code=synthetic-code'))
	).rejects.toMatchObject({
		status: 503,
		body: { message: 'Não foi possível concluir a conexão do TikTok. Tente autorizar novamente.' }
	});
	expect(mocks.upsert).not.toHaveBeenCalled();
});
