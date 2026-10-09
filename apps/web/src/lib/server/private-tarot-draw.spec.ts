import { beforeEach, expect, it, vi } from 'vitest';
import type { WorkflowInput } from '@atv/domain';
import { preparePrivateTarotDraw } from './private-tarot-draw';
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('./private-trials', () => ({ trialWriter: () => ({ rpc: mocks.rpc }) }));
const owner = '00000000-0000-4000-8000-000000000001',
	key = '00000000-0000-4000-8000-000000000002';
const input: WorkflowInput = {
	version: 'atv-workflow/1.0.0',
	productId: 'tarot-celtic-cross',
	consent: {
		storage: true,
		partner: false,
		continuity: false,
		policyVersion: 'atv-input-consent/1'
	}
};
let saved: Record<string, unknown>;
beforeEach(() => {
	saved = {
		id: '00000000-0000-4000-8000-000000000003',
		owner_id: owner,
		request_key: key,
		product_id: input.productId,
		input,
		calculation: null,
		recorded_at: null
	};
	mocks.rpc.mockReset();
	mocks.rpc.mockImplementation(async (name, args) => {
		if (name === 'record_atv_tarot_draw')
			saved = { ...saved, calculation: args.p_calculation, recorded_at: '2026-10-08T00:00:00Z' };
		return { data: { ...saved }, error: null };
	});
});
it('records before returning and reuses the persisted draw after editorial or transport failure', async () => {
	const first = await preparePrivateTarotDraw(owner, key, input);
	expect(mocks.rpc.mock.calls.map((c) => c[0])).toEqual([
		'reserve_atv_tarot_draw',
		'record_atv_tarot_draw'
	]);
	const next = await preparePrivateTarotDraw(owner, key, input);
	expect(next).toEqual(first);
	expect(mocks.rpc.mock.calls.map((c) => c[0])).toEqual([
		'reserve_atv_tarot_draw',
		'record_atv_tarot_draw',
		'reserve_atv_tarot_draw'
	]);
});
it('a failed record retries the same reserved ID and conserves every card', async () => {
	mocks.rpc.mockImplementationOnce(async () => ({ data: { ...saved }, error: null }));
	mocks.rpc.mockImplementationOnce(async () => ({ data: null, error: { code: 'transport' } }));
	await expect(preparePrivateTarotDraw(owner, key, input)).rejects.toMatchObject({ status: 503 });
	const failed = mocks.rpc.mock.calls[1][1].p_calculation;
	const retry = await preparePrivateTarotDraw(owner, key, input);
	expect(retry.calculation).toEqual(failed);
	expect(retry.id).toBe(saved.id);
});
it('rejects conflicts, unavailable storage and mismatched owner before any delivery', async () => {
	mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: '23505' } });
	await expect(preparePrivateTarotDraw(owner, key, input)).rejects.toMatchObject({ status: 409 });
	mocks.rpc.mockResolvedValueOnce({ data: { ...saved, owner_id: 'another' }, error: null });
	await expect(preparePrivateTarotDraw(owner, key, input)).rejects.toMatchObject({ status: 503 });
	mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
	await expect(preparePrivateTarotDraw(owner, key, input)).rejects.toMatchObject({ status: 403 });
	expect(mocks.rpc).toHaveBeenCalledTimes(3);
});
