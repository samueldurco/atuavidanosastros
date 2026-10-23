import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import LoginPage from '../../routes/entrar/+page.svelte';
import { load } from '../../routes/entrar/+page.server';
import { GET as callback } from '../../routes/auth/callback/+server';
import { GET as confirm } from '../../routes/auth/confirm/+server';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

const origin = 'https://example.test';
const destination = '/biblioteca/00000000-0000-4000-8000-000000000081';
const callbacks = [
	{
		name: 'Google',
		path: '/auth/callback?code=synthetic-code',
		handler: callback,
		method: 'exchangeCodeForSession',
		issue: 'oauth',
		message: 'Não foi possível concluir o acesso com o Google. Tente entrar novamente.'
	},
	{
		name: 'confirmation link',
		path: '/auth/confirm?token_hash=synthetic-token&type=magiclink',
		handler: confirm,
		method: 'verifyOtp',
		issue: 'confirmacao',
		message: 'Não foi possível confirmar o link de acesso. Tente entrar com o Google.'
	}
] as const;

async function loginData(url: string, user: unknown = null) {
	return load({ url: new URL(url, origin), parent: async () => ({ user }) } as never);
}

async function redirectLocation(action: unknown) {
	try {
		await action;
		throw new Error('Expected authentication redirect');
	} catch (result) {
		expect(result).toMatchObject({ status: 303 });
		return (result as { location: string }).location;
	}
}

function renderLogin(data: unknown, message?: string) {
	return render(LoginPage, {
		props: {
			data: {
				user: null,
				seo: null,
				trialAccess: false,
				authConfigured: true,
				...(data as { next: string; loginError: string | null })
			},
			form: message ? { message } : null
		}
	}).body;
}

describe('authentication failure recovery', () => {
	for (const scenario of callbacks) {
		it(`explains a failed ${scenario.name} callback and preserves the reading for retry`, async () => {
			const auth = {
				[scenario.method]: vi
					.fn()
					.mockResolvedValue({ error: { message: 'Synthetic provider failure' } })
			};
			const url = new URL(scenario.path, origin);
			url.searchParams.set('next', destination);
			const location = await redirectLocation(
				scenario.handler({ url, locals: { supabase: { auth } } } as never)
			);
			expect(new URL(location, origin).searchParams.get('erro')).toBe(scenario.issue);
			const data = await loginData(location);
			expect(data).toMatchObject({ next: destination, loginError: scenario.message });
			const body = renderLogin(data);
			expect(body).toContain('role="alert"');
			expect(body).toContain(scenario.message);
			expect(body).toContain(`action="?/google&amp;next=${encodeURIComponent(destination)}"`);
			expect(body).toContain('Continuar com Google');
			expect(body).not.toContain('Synthetic provider failure');
		});

		it(`returns a successful ${scenario.name} callback to the requested reading`, async () => {
			const auth = { [scenario.method]: vi.fn().mockResolvedValue({ error: null }) };
			const url = new URL(scenario.path, origin);
			url.searchParams.set('next', destination);
			expect(
				await redirectLocation(scenario.handler({ url, locals: { supabase: { auth } } } as never))
			).toBe(destination);
		});

		it(`keeps the ${scenario.name} retry destination internal`, async () => {
			const url = new URL(scenario.path, origin);
			url.searchParams.set('next', 'https://outside.test/private');
			const location = await redirectLocation(scenario.handler({ url, locals: {} } as never));
			const data = await loginData(location);
			expect(data).toMatchObject({ next: '/dashboard', loginError: scenario.message });
			expect(renderLogin(data)).toContain('action="?/google&amp;next=%2Fdashboard"');
			expect(renderLogin(data)).not.toContain('outside.test');
		});
	}

	it('does not display unknown query text as an authentication error', async () => {
		const data = await loginData('/entrar?erro=arbitrary-provider-details&next=/biblioteca');
		expect(data).toEqual({ next: '/biblioteca', loginError: null });
		expect(renderLogin(data)).not.toContain('role="alert"');
		expect(renderLogin(data)).not.toContain('arbitrary-provider-details');
	});

	it('prioritizes a new retry failure over the previous callback error', async () => {
		const data = await loginData('/entrar?erro=oauth&next=/biblioteca');
		const body = renderLogin(data, 'Não foi possível iniciar o login.');
		expect(body).toContain('Não foi possível iniciar o login.');
		expect(body).not.toContain(callbacks[0].message);
	});

	it('redirects an authenticated visitor to the safe destination', async () => {
		expect(
			await redirectLocation(
				loginData(`/entrar?next=${encodeURIComponent(destination)}`, { id: 'synthetic-user' })
			)
		).toBe(destination);
		expect(
			await redirectLocation(loginData('/entrar?next=//outside.test', { id: 'synthetic-user' }))
		).toBe('/dashboard');
	});
});
