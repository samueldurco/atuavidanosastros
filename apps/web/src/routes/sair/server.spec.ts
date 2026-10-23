import { describe, expect, it, vi } from 'vitest';
import { POST } from './+server';
import { load } from '../entrar/+page.server';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

const event = (signOut?: ReturnType<typeof vi.fn>) =>
	({
		locals: signOut ? { supabase: { auth: { signOut } } } : {}
	}) as unknown as Parameters<typeof POST>[0];

describe('explicit account sign-out', () => {
	it('ends only the current session and returns a private confirmation', async () => {
		const signOut = vi.fn().mockResolvedValue({ error: null });
		const response = (await POST(event(signOut))) as Response;
		expect(signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/entrar?sessao=encerrada');
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('referrer-policy')).toBe('no-referrer');
	});

	it('does not claim success when the auth service returns an error', async () => {
		const signOut = vi.fn().mockResolvedValue({ error: { message: 'private-provider-detail' } });
		const response = (await POST(event(signOut))) as Response;
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/entrar?sessao=erro');
		expect(await response.text()).not.toContain('private-provider-detail');
	});

	it('offers the same safe retry when sign-out throws or authentication is unavailable', async () => {
		const signOut = vi.fn().mockRejectedValue(new Error('private-provider-detail'));
		for (const request of [event(signOut), event()]) {
			const response = (await POST(request)) as Response;
			expect(response.status).toBe(303);
			expect(response.headers.get('location')).toBe('/entrar?sessao=erro');
			expect(response.headers.get('cache-control')).toBe('private, no-store');
		}
	});
});

const loginEvent = (status: string, user: { id: string } | null) =>
	({
		url: new URL(`https://example.test/entrar?sessao=${status}`),
		parent: async () => ({ user })
	}) as unknown as Parameters<typeof load>[0];

describe('sign-out return page', () => {
	it('shows the retry even if the failed sign-out left a verified session', async () => {
		const data = await load(loginEvent('erro', { id: 'synthetic-user' }));
		expect(data).toMatchObject({ logoutStatus: 'error' });
	});

	it('shows confirmation after the session has ended', async () => {
		const data = await load(loginEvent('encerrada', null));
		expect(data).toMatchObject({ logoutStatus: 'success' });
	});

	it('never confirms sign-out while a verified session is still active', async () => {
		await expect(load(loginEvent('encerrada', { id: 'synthetic-user' }))).rejects.toMatchObject({
			status: 303,
			location: '/dashboard'
		});
	});
});
