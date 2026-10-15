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
it('traduz rejeição de origem para 422 no cálculo local', async () => {
	const message = 'Origem dos Três Pilares: base natal divergente em data.natal.facts[0].display.';
	mocks.execute.mockRejectedValue(new Error(message));
	await expect(
		computeTrial(
			{ ...event, url: new URL('http://localhost:4187') } as RequestEvent,
			input,
			'id',
			[]
		)
	).rejects.toMatchObject({ status: 422, body: { message } });
	expect(mocks.fetch).not.toHaveBeenCalled();
});
it('preserva 422 da rejeição de origem no runtime hospedado', async () => {
	const message = 'Origem dos Três Pilares: recálculo natal indisponível.';
	mocks.fetch.mockResolvedValue(
		new Response(JSON.stringify({ error: message }), {
			status: 422,
			headers: { 'content-type': 'application/json' }
		})
	);
	await expect(computeTrial(event, input, 'id', [])).rejects.toMatchObject({
		status: 422,
		body: { message }
	});
	expect(mocks.execute).not.toHaveBeenCalled();
});

it('encaminha com bindings da requisição em preferência ao env dinâmico', async () => {
	mocks.fetch.mockResolvedValue(
		new Response(JSON.stringify({ protocol: 'atv-trial-runtime/1', result: true }), {
			headers: { 'content-type': 'application/json' }
		})
	);
	const hosted = {
		...event,
		platform: {
			env: {
				PUBLIC_SUPABASE_URL: 'https://request.synthetic.test',
				SUPABASE_SERVICE_ROLE_KEY: 'synthetic-request-service',
				ATV_TRIAL_RUNTIME_KEY: 'synthetic-request-runtime'
			}
		}
	} as unknown as RequestEvent;
	expect(await reviewTrial(hosted, {} as never)).toBe(true);
	expect(mocks.fetch).toHaveBeenCalledWith(
		'https://request.synthetic.test/functions/v1/atv-trial-runtime',
		expect.objectContaining({
			headers: expect.objectContaining({
				authorization: 'Bearer synthetic-request-service',
				apikey: 'synthetic-request-service',
				'x-atv-runtime-key': 'synthetic-request-runtime'
			})
		})
	);
	expect(mocks.execute).not.toHaveBeenCalled();
});

it('não recupera chave antiga se o binding da requisição estiver vazio', async () => {
	const hosted = { ...event, platform: { env: { ATV_TRIAL_RUNTIME_KEY: '' } } } as RequestEvent;
	await expect(reviewTrial(hosted, {} as never)).rejects.toMatchObject({ status: 503 });
	expect(mocks.fetch).not.toHaveBeenCalled();
	expect(mocks.execute).not.toHaveBeenCalled();
});
