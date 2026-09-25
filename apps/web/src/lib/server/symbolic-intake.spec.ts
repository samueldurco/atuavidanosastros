import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readIntakeAccess } from './symbolic-intake';
import { load } from '../../routes/biblioteca/nova/[productId]/+page.server';
import { load as specLoad } from '../../routes/biblioteca/_spec/entrada/+page.server';
const owner = '00000000-0000-4000-8000-000000000056';
function mock(data: unknown, error: unknown = null) {
	const abortSignal = vi.fn().mockResolvedValue({ data, error });
	const rpc = vi.fn().mockReturnValue({ abortSignal });
	return { rpc, abortSignal, client: { rpc } as unknown as SupabaseClient };
}
it.each(['AVAILABLE', 'UNRELEASED', 'ACCESS_REQUIRED'])(
	'returns only minimal access state %s',
	async (state) => {
		const m = mock({ state });
		expect(await readIntakeAccess(m.client, 'daily-card')).toBe(state);
		expect(m.rpc).toHaveBeenCalledWith('read_product_request_access', {
			p_product_id: 'daily-card'
		});
		expect(m.abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
	}
);
it.each([
	null,
	[],
	{},
	{ state: 'AVAILABLE', owner },
	{ state: 'READY' },
	'AVAILABLE',
	{ state: ['AVAILABLE'] }
])('fails closed on malformed projection %#', async (data) => {
	expect(await readIntakeAccess(mock(data).client, 'daily-card')).toBe('UNAVAILABLE');
});
it('fails closed on missing RPC, transport exception, client or unknown product', async () => {
	const m = mock({ state: 'AVAILABLE' }, { message: 'PRIVATE' });
	expect(await readIntakeAccess(m.client, 'daily-card')).toBe('UNAVAILABLE');
	m.abortSignal.mockRejectedValue(new Error('PRIVATE'));
	expect(await readIntakeAccess(m.client, 'daily-card')).toBe('UNAVAILABLE');
	m.rpc.mockClear();
	expect(await readIntakeAccess(m.client, 'birth-chart')).toBe('UNAVAILABLE');
	expect(await readIntakeAccess(undefined, 'daily-card')).toBe('UNAVAILABLE');
	expect(m.rpc).not.toHaveBeenCalled();
});
function event(user: unknown, productId = 'daily-card') {
	const m = mock({ state: 'UNRELEASED' });
	const setHeaders = vi.fn();
	return {
		m,
		setHeaders,
		args: {
			parent: async () => ({ user }),
			params: { productId },
			locals: { supabase: m.client },
			setHeaders
		} as unknown as Parameters<typeof load>[0]
	};
}
it.each([null, { id: 'invalid' }])('requires verified identity before RPC %#', async (user) => {
	const e = event(user);
	await expect(load(e.args)).rejects.toMatchObject({ status: 303, location: '/entrar' });
	expect(e.m.rpc).not.toHaveBeenCalled();
});
it('returns private minimal data without form input or entitlement rows', async () => {
	const e = event({ id: owner });
	expect(await load(e.args)).toEqual({
		ownerId: owner,
		productId: 'daily-card',
		access: 'UNRELEASED'
	});
	expect(e.setHeaders).toHaveBeenCalledWith({
		'cache-control': 'private, no-store',
		'referrer-policy': 'no-referrer',
		'x-robots-tag': 'noindex, nofollow'
	});
});
it('rejects a product without an implemented form before querying', async () => {
	const e = event({ id: owner }, 'birth-chart');
	await expect(load(e.args)).rejects.toMatchObject({ status: 404 });
	expect(e.m.rpc).not.toHaveBeenCalled();
});
it.each([
	'https://example.com/biblioteca/_spec/entrada',
	'http://localhost/biblioteca/_spec/entrada?product=unknown',
	'http://localhost/biblioteca/_spec/entrada?access=READY'
])('restricts synthetic fixture %s', (url) => {
	expect(() =>
		specLoad({ url: new URL(url), setHeaders: vi.fn() } as unknown as Parameters<
			typeof specLoad
		>[0])
	).toThrow();
});
