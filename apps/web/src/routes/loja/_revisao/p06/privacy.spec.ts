import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ dev: false, env: { ATV_P06_LOCAL_REVIEW: 'true' } }));
vi.mock('$app/environment', () => ({
	get dev() {
		return mocks.dev;
	}
}));
vi.mock('$env/dynamic/private', () => ({ env: mocks.env }));
import { load } from './+page.server';
it.each([
	{ dev: false, host: '127.0.0.1', address: '127.0.0.1' },
	{ dev: true, host: 'example.com', address: '127.0.0.1' },
	{ dev: true, host: '127.0.0.1', address: '203.0.113.1' }
])('never serves the private review outside local development: %j', async (input) => {
	mocks.dev = input.dev;
	const event = {
		url: new URL('http://' + input.host + '/loja/_revisao/p06'),
		getClientAddress: () => input.address,
		setHeaders: vi.fn()
	} as unknown as Parameters<typeof load>[0];
	try {
		await load(event);
		throw new Error('Review unexpectedly served');
	} catch (error) {
		expect(error).toMatchObject({ status: 404 });
	}
});
