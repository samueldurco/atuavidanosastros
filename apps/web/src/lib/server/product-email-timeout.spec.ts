import { afterEach, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { productEmailApi } from './product-email-api';

const id = '00000000-0000-4000-8000-000000000001';
const command = {
	version: 'atv-email-request/1',
	runId: id,
	expectedRevision: 4,
	reviewDigest: 'a'.repeat(64),
	consent: {
		transactional: true,
		policyVersion: 'atv-email-delivery/1',
		recipient: 'account-owner'
	}
};
type Action = Parameters<typeof productEmailApi>[1];
const inputs = {
	request: { requestKey: id, command },
	recover: { requestKey: id },
	cancel: { receiptId: id },
	history: { runId: id }
};
function setup(action: Action, transport: (signal: AbortSignal) => unknown) {
	const abortSignal = vi.fn(transport);
	const rpc = vi.fn(() => ({ abortSignal }));
	const url = new URL(`http://localhost/api/product-email/${action}`);
	const event = {
		url,
		request: new Request(url, {
			method: 'POST',
			headers: { origin: url.origin, 'content-type': 'application/json' },
			body: JSON.stringify(inputs[action])
		}),
		locals: {
			supabase: {
				auth: { getClaims: async () => ({ data: { claims: { sub: id } }, error: null }) },
				rpc
			}
		}
	} as unknown as RequestEvent;
	return { event, rpc, abortSignal };
}
afterEach(() => vi.useRealTimers());

it.each(['request', 'recover', 'cancel', 'history'] as const)(
	'%s stops waiting after 10 seconds even if transport ignores abort',
	async (action) => {
		vi.useFakeTimers();
		const s = setup(action, () => new Promise(() => {}));
		const settled = vi.fn();
		const pending = productEmailApi(s.event, action).then((response) => {
			settled();
			return response;
		});
		await vi.advanceTimersByTimeAsync(0);
		expect(s.rpc).toHaveBeenCalledTimes(1);
		const signal = s.abortSignal.mock.calls[0][0];
		await vi.advanceTimersByTimeAsync(9999);
		expect(settled).not.toHaveBeenCalled();
		expect(signal.aborted).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		const response = await pending;
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ error: 'email_service_unavailable' });
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(signal.aborted).toBe(true);
		expect(s.rpc).toHaveBeenCalledTimes(1);
		expect(settled).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	}
);
it.each(['resolve', 'reject'] as const)(
	'consumes late %s without retry or changing timeout',
	async (outcome) => {
		vi.useFakeTimers();
		let resolve!: (value: unknown) => void;
		let reject!: (error: Error) => void;
		const transport = new Promise((yes, no) => {
			resolve = yes;
			reject = no;
		});
		const s = setup('recover', () => transport);
		const pending = productEmailApi(s.event, 'recover');
		await vi.advanceTimersByTimeAsync(10000);
		const response = await pending;
		expect(response.status).toBe(503);
		if (outcome === 'resolve') resolve({ data: null, error: null });
		else reject(new Error('private late transport details'));
		await vi.runAllTimersAsync();
		expect(await response.json()).toEqual({ error: 'email_service_unavailable' });
		expect(s.rpc).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	}
);
it('deadline wins even if abort synchronously resolves the transport', async () => {
	vi.useFakeTimers();
	const s = setup(
		'recover',
		(signal) =>
			new Promise((resolve) => {
				signal.addEventListener('abort', () => resolve({ data: null, error: null }), {
					once: true
				});
			})
	);
	const pending = productEmailApi(s.event, 'recover');
	await vi.advanceTimersByTimeAsync(10000);
	expect((await pending).status).toBe(503);
});
it.each(['success', 'invalid', 'error', 'throw'] as const)(
	'cleans deadline after immediate %s',
	async (outcome) => {
		vi.useFakeTimers();
		const s = setup('recover', () => {
			if (outcome === 'throw') throw new Error('private synchronous transport error');
			return Promise.resolve({
				data: outcome === 'invalid' ? {} : null,
				error: outcome === 'error' ? { message: 'private SQL failure' } : null
			});
		});
		const response = await productEmailApi(s.event, 'recover');
		expect(response.status).toBe(outcome === 'success' ? 200 : 503);
		expect(vi.getTimerCount()).toBe(0);
		await vi.advanceTimersByTimeAsync(10000);
		expect(s.abortSignal.mock.calls[0][0].aborted).toBe(false);
		expect(s.rpc).toHaveBeenCalledTimes(1);
	}
);
