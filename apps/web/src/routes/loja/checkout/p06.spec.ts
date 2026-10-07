import { beforeEach, expect, it, vi } from 'vitest';
import { p06Products } from '@atv/integrations';
import { POST } from './+server';
const mocks = vi.hoisted(() => ({ getBinding: vi.fn(), env: { FEATURE_P06_CATALOG: 'true' } }));
vi.mock('$env/dynamic/private', () => ({ env: mocks.env }));
vi.mock('$lib/server/shop/p06', () => ({ getP06Binding: mocks.getBinding }));
const sku = p06Products[0].sku;
function event(
	body = 'sku=' + encodeURIComponent(sku) + '&quantity=1',
	origin = 'https://local.example',
	headers: Record<string, string> = {}
) {
	return {
		request: new Request('https://local.example/loja/checkout', {
			method: 'POST',
			headers: { origin, 'content-type': 'application/x-www-form-urlencoded', ...headers },
			body
		}),
		url: new URL('https://local.example/loja/checkout'),
		setHeaders: vi.fn()
	} as unknown as Parameters<typeof POST>[0];
}
beforeEach(() => {
	vi.clearAllMocks();
	mocks.env.FEATURE_P06_CATALOG = 'true';
	mocks.getBinding.mockResolvedValue(null);
});
it('rejects cross-origin requests before touching a provider', async () => {
	const response = await POST(event(undefined, 'https://evil.example'));
	expect(response.status).toBe(403);
	expect(mocks.getBinding).not.toHaveBeenCalled();
});
it.each(['&amount=1', '&url=https://evil.example', '&sku=other', '&quantity=2'])(
	'rejects forged fields %s',
	async (extra) => {
		const response = await POST(event('sku=' + encodeURIComponent(sku) + '&quantity=1' + extra));
		expect(response.status).toBe(400);
		expect(mocks.getBinding).not.toHaveBeenCalled();
	}
);
it('bounds request bytes even without Content-Length', async () => {
	const response = await POST(event('x'.repeat(4097)));
	expect(response.status).toBe(400);
	expect(mocks.getBinding).not.toHaveBeenCalled();
});
it('fails closed when catalogue is disabled, release missing or database unavailable', async () => {
	mocks.env.FEATURE_P06_CATALOG = 'false';
	expect((await POST(event())).status).toBe(503);
	expect(mocks.getBinding).not.toHaveBeenCalled();
	mocks.env.FEATURE_P06_CATALOG = 'true';
	let response = await POST(event());
	expect(response.status).toBe(503);
	expect(response.headers.get('cache-control')).toContain('no-store');
	mocks.getBinding.mockRejectedValue(new Error('offline'));
	response = await POST(event());
	expect(response.status).toBe(503);
});
