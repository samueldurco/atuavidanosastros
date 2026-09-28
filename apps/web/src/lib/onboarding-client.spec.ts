import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ONBOARDING_VERSION, type OnboardingCommand } from './onboarding';
import { requestOnboarding } from './onboarding-client';

const snapshot = { version: ONBOARDING_VERSION, revision: 0, state: 'NOT_STARTED', natal: null };
const command: OnboardingCommand = {
	version: ONBOARDING_VERSION,
	expectedRevision: 0,
	action: 'begin'
};
const reply = () => Response.json({ onboarding: snapshot });
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

for (const variant of [
	{ name: 'onboarding read', options: {}, ms: 15000 },
	{ name: 'onboarding write', options: { command }, ms: 15000 },
	{ name: 'product intake', options: { intake: true }, ms: 10000 }
]) {
	for (const phase of ['headers', 'body']) {
		it(`${variant.name}: ${phase} timeout settles without cooperation; explicit recovery only`, async () => {
			const pending = deferred<Response>();
			const body = deferred<unknown>();
			const late = reply();
			const json = vi.spyOn(late, 'json').mockImplementation(() => body.promise);
			const transport = vi
				.fn<typeof fetch>()
				.mockImplementationOnce(() =>
					phase === 'headers' ? pending.promise : Promise.resolve(late)
				)
				.mockResolvedValueOnce(reply());
			const result = requestOnboarding(transport, variant.options);
			const settled = result.catch((error: Error) => error.message);
			await vi.advanceTimersByTimeAsync(variant.ms - 1);
			expect(transport.mock.calls[0][1]?.signal?.aborted).toBe(false);
			await vi.advanceTimersByTimeAsync(1);
			expect(await settled).toBe('onboarding_deadline');
			expect(transport.mock.calls[0][1]?.signal?.aborted).toBe(true);
			pending.resolve(late);
			body.resolve({ onboarding: { ...snapshot, revision: 1, state: 'IN_PROGRESS' } });
			await vi.advanceTimersByTimeAsync(60000);
			expect(transport).toHaveBeenCalledTimes(1);
			expect(json).toHaveBeenCalledTimes(phase === 'headers' ? 0 : 1);
			expect(await settled).toBe('onboarding_deadline');
			expect(await requestOnboarding(transport)).toEqual({ ok: true, snapshot });
			expect(transport.mock.calls[1][1]?.method).toBe('GET');
			expect(vi.getTimerCount()).toBe(0);
		});
	}
}

it('uses a single budget for headers and body and rejects before abort resolution', async () => {
	const headers = deferred<Response>();
	const body = deferred<unknown>();
	const response = reply();
	vi.spyOn(response, 'json').mockImplementation(() => body.promise);
	const transport = vi.fn<typeof fetch>().mockImplementation((_url, init) => {
		init?.signal?.addEventListener('abort', () => body.resolve({ onboarding: snapshot }));
		return headers.promise;
	});
	const settled = requestOnboarding(transport).catch((error: Error) => error.message);
	await vi.advanceTimersByTimeAsync(14000);
	headers.resolve(response);
	await vi.advanceTimersByTimeAsync(1000);
	expect(await settled).toBe('onboarding_deadline');
	expect(vi.getTimerCount()).toBe(0);
});

it('late transport rejection is handled and never retries a write', async () => {
	const pending = deferred<Response>();
	const transport = vi.fn<typeof fetch>().mockImplementation(() => pending.promise);
	const settled = requestOnboarding(transport, { command }).catch((error: Error) => error.message);
	await vi.advanceTimersByTimeAsync(15000);
	expect(await settled).toBe('onboarding_deadline');
	pending.reject(new Error('late_private_error'));
	await vi.advanceTimersByTimeAsync(1);
	expect(transport).toHaveBeenCalledTimes(1);
});

it('preserves exact command, revision and private request options; cleans successful timer', async () => {
	const transport = vi.fn<typeof fetch>().mockResolvedValue(reply());
	expect(await requestOnboarding(transport, { command })).toEqual({ ok: true, snapshot });
	expect(transport.mock.calls[0]).toEqual([
		'/api/onboarding',
		expect.objectContaining({
			method: 'POST',
			credentials: 'same-origin',
			cache: 'no-store',
			redirect: 'error',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(command)
		})
	]);
	expect(transport.mock.calls[0][1]?.signal?.aborted).toBe(false);
	expect(vi.getTimerCount()).toBe(0);
});

for (const payload of [
	null,
	[],
	{ onboarding: {} },
	{ onboarding: snapshot, error: 'invalid_input' },
	{ error: 'invalid_input' }
]) {
	it(`rejects malformed successful envelope ${JSON.stringify(payload)}`, async () => {
		await expect(
			requestOnboarding(vi.fn<typeof fetch>().mockResolvedValue(Response.json(payload)))
		).rejects.toThrow('invalid_response');
		expect(vi.getTimerCount()).toBe(0);
	});
}

it('returns status and error only for a strict error envelope', async () => {
	const transport = vi
		.fn<typeof fetch>()
		.mockResolvedValue(Response.json({ error: 'revision_conflict' }, { status: 409 }));
	expect(await requestOnboarding(transport, { command })).toEqual({
		ok: false,
		status: 409,
		error: 'revision_conflict'
	});
	expect(vi.getTimerCount()).toBe(0);
	for (const payload of [
		{ error: 400 },
		{ error: 'invalid_input', onboarding: snapshot },
		{ onboarding: snapshot }
	]) {
		await expect(
			requestOnboarding(
				vi.fn<typeof fetch>().mockResolvedValue(Response.json(payload, { status: 400 })),
				{ command }
			)
		).rejects.toThrow('invalid_response');
	}
});

it('cleans timers on network and JSON failure', async () => {
	await expect(
		requestOnboarding(vi.fn<typeof fetch>().mockRejectedValue(new Error('network')))
	).rejects.toThrow('network');
	expect(vi.getTimerCount()).toBe(0);
	await expect(
		requestOnboarding(vi.fn<typeof fetch>().mockResolvedValue(new Response('{')))
	).rejects.toThrow();
	expect(vi.getTimerCount()).toBe(0);
});
