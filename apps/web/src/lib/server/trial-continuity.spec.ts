import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../../routes/api/private-trials/continuity/+server';
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const getClaims = vi.fn(),
	abortSignal = vi.fn(),
	rpc = vi.fn(() => ({ abortSignal }));
const locals = { supabase: { auth: { getClaims }, rpc } } as unknown as App.Locals;
const clean = { revision: 0, granted: false, available: true, items: [] };
function event(body: unknown, origin = 'https://example.test') {
	const url = new URL('https://example.test/api/private-trials/continuity');
	return {
		locals,
		url,
		request: new Request(url, {
			method: 'POST',
			headers: { origin, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as never;
}
beforeEach(() => {
	vi.clearAllMocks();
	getClaims.mockResolvedValue({ data: { claims: { sub: owner } }, error: null });
	abortSignal.mockResolvedValue({ data: clean, error: null });
});
describe('ATV+ continuity authenticated boundary', () => {
	it('reads fresh owner-scoped RPC with deadline and private no-store headers', async () => {
		const response = await GET({ locals } as never);
		expect(rpc).toHaveBeenCalledWith('read_atv_trial_continuity');
		expect(abortSignal.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(await response.json()).toEqual({
			state: clean,
			preparation: { status: 'blocked', code: 'consent_required' }
		});
	});
	it('allows authenticated revocation without requiring an active trial grant', async () => {
		expect((await POST(event({ revision: 0, granted: false, items: [] }))).status).toBe(200);
		expect(rpc).toHaveBeenCalledExactlyOnceWith('set_atv_trial_continuity', {
			p_revision: 0,
			p_granted: false,
			p_items: []
		});
	});
	it('rejects cross-origin requests and client-supplied sources before any RPC', async () => {
		await expect(
			POST(event({ revision: 0, granted: false, items: [] }, 'https://foreign.test'))
		).rejects.toMatchObject({ status: 403 });
		await expect(
			POST(event({ revision: 0, granted: false, items: [], sources: [] }))
		).rejects.toMatchObject({ status: 400 });
		expect(rpc).not.toHaveBeenCalled();
	});
	it('requires verified claims and normalizes session transport failures', async () => {
		getClaims.mockResolvedValue({ data: null, error: { message: 'invalid' } });
		await expect(GET({ locals } as never)).rejects.toMatchObject({ status: 401 });
		getClaims.mockRejectedValue(Error('provider details'));
		await expect(GET({ locals } as never)).rejects.toMatchObject({ status: 503 });
		expect(rpc).not.toHaveBeenCalled();
	});
	it.each([
		['40001', 409],
		['22023', 400],
		['42501', 403],
		['unknown', 503]
	])('normalizes database failure %s', async (code, status) => {
		abortSignal.mockResolvedValue({
			data: null,
			error: { code, message: 'private database details' }
		});
		await expect(POST(event({ revision: 0, granted: false, items: [] }))).rejects.toMatchObject({
			status
		});
	});
	it('normalizes RPC transport failures and rejects untrusted projections', async () => {
		abortSignal.mockRejectedValue(Error('private timeout details'));
		await expect(GET({ locals } as never)).rejects.toMatchObject({ status: 503 });
		abortSignal.mockResolvedValue({
			data: { ...clean, email: 'not-exported@example.test' },
			error: null
		});
		await expect(GET({ locals } as never)).rejects.toMatchObject({ status: 503 });
	});
});
