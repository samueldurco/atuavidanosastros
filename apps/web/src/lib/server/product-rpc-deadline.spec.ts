import { afterEach, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import { productContinuityApi } from './product-continuity-api';
import { recoverWorkflowRequest } from './workflow-recovery';
import { readIntakeAccess } from './symbolic-intake';
import { withRpcDeadline } from './rpc-deadline';

const id = '00000000-0000-4000-8000-000000000001';
afterEach(() => vi.useRealTimers());
function mock(body: unknown) {
	const abortSignal = vi.fn((signal: AbortSignal) => {
		void signal;
		return new Promise<never>(() => {});
	});
	const rpc = vi.fn(() => ({ abortSignal }));
	const client = {
		rpc,
		auth: { getClaims: async () => ({ data: { claims: { sub: id } }, error: null }) }
	} as unknown as SupabaseClient;
	const url = new URL('http://localhost/api/test');
	const event = {
		url,
		locals: { supabase: client },
		request: new Request(url, {
			method: 'POST',
			headers: { origin: url.origin, 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as unknown as RequestEvent;
	return { rpc, abortSignal, client, event };
}
const commands = {
	read: {},
	access: {},
	'clear-access': {},
	delete: { id },
	consent: {
		version: 'atv-continuity-consent/1',
		purpose: 'reading-context',
		expectedRevision: 0,
		runIds: [id],
		granted: true
	},
	save: {
		id,
		runId: id,
		expectedRevision: 0,
		relevance: 'unreviewed',
		selection: { kind: 'reported', category: 'theme', text: 'Nota sintética.' }
	}
};
it.each(Object.keys(commands) as (keyof typeof commands)[])(
	'continuity %s returns redacted unavailability, never retries a stalled RPC',
	async (action) => {
		vi.useFakeTimers();
		const s = mock(commands[action]);
		const pending = productContinuityApi(s.event, action);
		await vi.advanceTimersByTimeAsync(10000);
		const response = await pending;
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ error: 'continuity_service_unavailable' });
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(s.rpc).toHaveBeenCalledTimes(1);
		expect(s.abortSignal.mock.calls[0][0].aborted).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
	}
);
it('workflow recovery timeout is unavailable, never not-found or another submission', async () => {
	vi.useFakeTimers();
	const s = mock({ requestKey: id });
	const pending = recoverWorkflowRequest(s.event);
	await vi.advanceTimersByTimeAsync(10000);
	const response = await pending;
	expect(response.status).toBe(503);
	expect(await response.json()).toEqual({ error: 'workflow_unavailable' });
	expect(s.rpc).toHaveBeenCalledExactlyOnceWith('recover_product_request', { p_request_key: id });
	expect(s.abortSignal.mock.calls[0][0].aborted).toBe(true);
	expect(vi.getTimerCount()).toBe(0);
});
it('intake timeout cannot grant eligibility', async () => {
	vi.useFakeTimers();
	const s = mock({});
	const pending = readIntakeAccess(s.client, 'daily-card');
	await vi.advanceTimersByTimeAsync(10000);
	expect(await pending).toBe('UNAVAILABLE');
	expect(s.rpc).toHaveBeenCalledExactlyOnceWith('read_product_request_access', {
		p_product_id: 'daily-card'
	});
	expect(s.abortSignal.mock.calls[0][0].aborted).toBe(true);
	expect(vi.getTimerCount()).toBe(0);
});
it('supports lazy PromiseLike transports exactly once', async () => {
	vi.useFakeTimers();
	const then = vi.fn((resolve: (value: number) => unknown) => {
		resolve(7);
	});
	const result = await withRpcDeadline(() => ({ then }) as unknown as PromiseLike<number>);
	expect(result).toBe(7);
	expect(then).toHaveBeenCalledTimes(1);
	expect(vi.getTimerCount()).toBe(0);
});
