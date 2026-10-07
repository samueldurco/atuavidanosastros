import { beforeEach, expect, it, vi } from 'vitest';
import { computeTrial, reviewTrial } from './trial-runtime';
import type { RequestEvent } from '@sveltejs/kit';
import type { WorkflowInput } from '@atv/domain';
const mocks = vi.hoisted(() => ({ execute: vi.fn(), fetch: vi.fn() }));
vi.mock('$app/environment', () => ({ dev: false }));
vi.mock('$env/dynamic/public', () => ({
	env: { PUBLIC_SUPABASE_URL: 'https://synthetic.supabase.co' }
}));
vi.mock('$env/dynamic/private', () => ({
	env: {
		SUPABASE_SERVICE_ROLE_KEY: 'synthetic-server-key',
		ATV_TRIAL_RUNTIME_KEY: 'synthetic-runtime-key'
	}
}));
vi.mock('./trial-computation', () => ({ executeTrialRuntime: mocks.execute }));
const event = {
	url: new URL('https://atuavidanosastros.com.br'),
	fetch: mocks.fetch
} as unknown as RequestEvent;
const input = { productId: 'dream-reading' } as WorkflowInput;
beforeEach(() => vi.resetAllMocks());
it('encaminha somente pelo servidor e falha fechado sem recalcular no Pages', async () => {
	mocks.fetch.mockResolvedValue(new Response('<html>Error 1102</html>', { status: 500 }));
	await expect(computeTrial(event, input, 'id', [])).rejects.toMatchObject({ status: 503 });
	expect(mocks.execute).not.toHaveBeenCalled();
	expect(mocks.fetch).toHaveBeenCalledWith(
		'https://synthetic.supabase.co/functions/v1/atv-trial-runtime',
		expect.objectContaining({
			method: 'POST',
			headers: expect.objectContaining({
				authorization: 'Bearer synthetic-server-key',
				'x-atv-runtime-key': 'synthetic-runtime-key'
			})
		})
	);
});
it('aceita só protocolo vigente e revisão explicitamente verdadeira', async () => {
	mocks.fetch.mockResolvedValue(
		new Response(JSON.stringify({ protocol: 'old', result: true }), {
			headers: { 'content-type': 'application/json' }
		})
	);
	await expect(reviewTrial(event, {} as never)).rejects.toMatchObject({ status: 503 });
	mocks.fetch.mockResolvedValue(
		new Response(JSON.stringify({ protocol: 'atv-trial-runtime/1', result: false }), {
			headers: { 'content-type': 'application/json' }
		})
	);
	expect(await reviewTrial(event, {} as never)).toBe(false);
});
it('mantém o cálculo local para testes sintéticos', async () => {
	mocks.execute.mockResolvedValue(false);
	expect(
		await reviewTrial(
			{ ...event, url: new URL('http://127.0.0.1:4187') } as RequestEvent,
			{} as never
		)
	).toBe(false);
	expect(mocks.fetch).not.toHaveBeenCalled();
});
