import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actions } from './+page.server';

const mocks = vi.hoisted(() => ({
	publicEnv: {} as Record<string, string>,
	privateEnv: {} as Record<string, string>,
	signInWithOAuth: vi.fn()
}));
vi.mock('$env/dynamic/public', () => ({ env: mocks.publicEnv }));
vi.mock('$env/dynamic/private', () => ({ env: mocks.privateEnv }));

const authOrigin = 'https://request.synthetic.test';
const authUrl = `${authOrigin}/auth/v1/authorize?provider=google`;
const request = (bindings?: Record<string, string>, next = '/biblioteca') =>
	({
		url: new URL(`https://example.test/entrar?next=${encodeURIComponent(next)}`),
		locals: { supabase: { auth: { signInWithOAuth: mocks.signInWithOAuth } } },
		...(bindings ? { platform: { env: bindings } } : {})
	}) as unknown as Parameters<NonNullable<typeof actions.google>>[0];

beforeEach(() => {
	vi.resetAllMocks();
	for (const key of Object.keys(mocks.publicEnv)) delete mocks.publicEnv[key];
	for (const key of Object.keys(mocks.privateEnv)) delete mocks.privateEnv[key];
	mocks.signInWithOAuth.mockResolvedValue({ data: { url: authUrl }, error: null });
});

describe('Google login external redirect compatibility', () => {
	it('allows the configured request origin through the real Kit redirect and keeps the callback local', async () => {
		mocks.publicEnv.PUBLIC_SUPABASE_URL = 'https://old.synthetic.test';
		await expect(
			actions.google(request({ PUBLIC_SUPABASE_URL: authOrigin }))
		).rejects.toMatchObject({ status: 303, location: authUrl });
		expect(mocks.signInWithOAuth).toHaveBeenCalledExactlyOnceWith({
			provider: 'google',
			options: {
				redirectTo: 'https://example.test/auth/callback?next=%2Fbiblioteca',
				scopes: 'openid email profile',
				skipBrowserRedirect: true
			}
		});
	});

	it('uses the dynamic fallback locally and rejects an untrusted next destination', async () => {
		mocks.publicEnv.PUBLIC_SUPABASE_URL = authOrigin;
		await expect(actions.google(request(undefined, 'https://outside.test'))).rejects.toMatchObject({
			status: 303,
			location: authUrl
		});
		expect(mocks.signInWithOAuth.mock.calls[0][0].options.redirectTo).toBe(
			'https://example.test/auth/callback?next=%2Fdashboard'
		);
	});

	it('permits the explicit local Supabase development origin', async () => {
		const localOrigin = 'http://127.0.0.1:54321';
		const destination = `${localOrigin}/auth/v1/authorize?provider=google`;
		mocks.signInWithOAuth.mockResolvedValue({ data: { url: destination }, error: null });
		await expect(
			actions.google(request({ PUBLIC_SUPABASE_URL: localOrigin }))
		).rejects.toMatchObject({ status: 303, location: destination });
	});

	it.each([
		'https://request.synthetic.test.outside.test/auth/v1/authorize',
		'https://old.synthetic.test/auth/v1/authorize',
		'https://user:secret@request.synthetic.test/auth/v1/authorize',
		'javascript:alert(1)',
		'/auth/v1/authorize',
		'not-a-url'
	])(
		'returns a safe failure instead of allowing an untrusted OAuth URL: %s',
		async (destination) => {
			mocks.signInWithOAuth.mockResolvedValue({ data: { url: destination }, error: null });
			expect(await actions.google(request({ PUBLIC_SUPABASE_URL: authOrigin }))).toMatchObject({
				status: 502,
				data: { message: 'Não foi possível iniciar o login.' }
			});
		}
	);

	it.each([
		'',
		'not-a-url',
		'http://remote.synthetic.test',
		'https://user:secret@request.synthetic.test'
	])(
		'fails closed before calling OAuth when the current binding is invalid: %s',
		async (configured) => {
			mocks.publicEnv.PUBLIC_SUPABASE_URL = authOrigin;
			expect(await actions.google(request({ PUBLIC_SUPABASE_URL: configured }))).toMatchObject({
				status: 503
			});
			expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
		}
	);

	it('fails safely when no auth URL is configured or no auth client is available', async () => {
		expect(await actions.google(request())).toMatchObject({ status: 503 });
		const noClient = request({ PUBLIC_SUPABASE_URL: authOrigin });
		noClient.locals.supabase = undefined;
		expect(await actions.google(noClient)).toMatchObject({ status: 503 });
		expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
	});

	it.each([
		{ data: { url: authUrl }, error: { message: 'private-provider-detail' } },
		{ data: { url: null }, error: null }
	])('keeps provider errors and absent redirects as a safe retry', async (result) => {
		mocks.signInWithOAuth.mockResolvedValue(result);
		expect(await actions.google(request({ PUBLIC_SUPABASE_URL: authOrigin }))).toMatchObject({
			status: 502,
			data: { message: 'Não foi possível iniciar o login.' }
		});
	});
});
