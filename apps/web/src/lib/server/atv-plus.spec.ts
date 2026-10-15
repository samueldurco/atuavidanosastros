import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	plusCycleActive,
	plusOwnerIdentity,
	plusState,
	plusWriteError,
	requirePlusSelection
} from './atv-plus';
import { trialIdentity } from './private-trials';
import { actions } from '../../routes/atv-mais/+page.server';
vi.mock('./private-trials', () => ({
	trialIdentity: vi.fn(),
	validTrialId: (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}$/.test(value)
}));
const owner = '00000000-0000-4000-8000-000000000001';
const cycleId = '00000000-0000-4000-8000-000000000011';
const cycle = {
	id: cycleId,
	plan_id: 'premium' as const,
	started_at: '2026-10-15T12:00:00Z',
	ends_at: '2026-11-14T12:00:00Z',
	cancelled_at: null
};
const abortSignal = vi.fn(),
	rpc = vi.fn(() => ({ abortSignal })),
	from = vi.fn();
const query = (result: unknown) => {
	const chain: Record<string, ReturnType<typeof vi.fn>> = {};
	for (const method of ['select', 'eq', 'order', 'limit', 'in', 'maybeSingle'])
		chain[method] = vi.fn(() => chain);
	chain.then = vi.fn((resolve) => Promise.resolve(result).then(resolve));
	return chain;
};
beforeEach(() => {
	vi.clearAllMocks();
	vi.useRealTimers();
	vi.mocked(trialIdentity).mockResolvedValue({ ownerId: owner, supabase: { rpc, from } } as never);
	abortSignal.mockResolvedValue({ data: true, error: null });
});
describe('ATV+ server access and quota preflight', () => {
	it('requires the additional verified owner grant and fails closed on infrastructure errors', async () => {
		abortSignal.mockResolvedValue({ data: false, error: null });
		await expect(plusOwnerIdentity({} as never)).rejects.toMatchObject({ status: 403 });
		expect(await plusOwnerIdentity({} as never, false)).toBeNull();
		abortSignal.mockRejectedValue(new Error('network'));
		await expect(plusOwnerIdentity({} as never)).rejects.toMatchObject({ status: 503 });
		expect(await plusOwnerIdentity({} as never, false)).toBeNull();
		expect(from).not.toHaveBeenCalled();
	});
	it('keeps the public plan presentation free of private state for a visitor', async () => {
		vi.mocked(trialIdentity).mockResolvedValue(null);
		expect(await plusState({} as never)).toEqual({ ownerAccess: false, cycles: [], uses: [] });
		expect(rpc).not.toHaveBeenCalled();
		expect(from).not.toHaveBeenCalled();
	});
	it('treats exact expiry, cancellation and future start as inactive', () => {
		expect(plusCycleActive(cycle, Date.parse(cycle.started_at))).toBe(true);
		expect(plusCycleActive(cycle, Date.parse(cycle.ends_at))).toBe(false);
		expect(plusCycleActive(cycle, Date.parse(cycle.started_at) - 1)).toBe(false);
		expect(
			plusCycleActive({ ...cycle, cancelled_at: cycle.started_at }, Date.parse(cycle.started_at))
		).toBe(false);
	});
	it('reads only the verified owner and complete cycle usage before allowing a product', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-16T12:00:00Z'));
		const cycleQuery = query({ data: cycle, error: null });
		const usesQuery = query({ data: [{ product_id: 'dream-reading' }], error: null });
		from.mockImplementation((table) => (table === 'atv_plus_test_cycles' ? cycleQuery : usesQuery));
		await expect(
			requirePlusSelection({} as never, cycleId, 'tarot-situation-challenge-advice')
		).resolves.toMatchObject({ id: cycleId, planName: 'ATV+ Premium' });
		expect(cycleQuery.eq).toHaveBeenCalledWith('owner_id', owner);
		expect(cycleQuery.eq).toHaveBeenCalledWith('id', cycleId);
		expect(usesQuery.eq).toHaveBeenCalledWith('owner_id', owner);
		expect(usesQuery.eq).toHaveBeenCalledWith('cycle_id', cycleId);
		await expect(
			requirePlusSelection({} as never, cycleId, 'tarot-peladan-cross')
		).rejects.toMatchObject({ status: 409 });
		await expect(
			requirePlusSelection({} as never, cycleId, 'career-compass')
		).rejects.toMatchObject({ status: 409 });
	});
	it('refuses missing cycles and ledger errors instead of assuming unused quota', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-16T12:00:00Z'));
		from.mockReturnValue(query({ data: null, error: null }));
		await expect(requirePlusSelection({} as never, cycleId, 'dream-reading')).rejects.toMatchObject(
			{ status: 404 }
		);
		from.mockImplementation((table) =>
			query(
				table === 'atv_plus_test_cycles'
					? { data: cycle, error: null }
					: { data: null, error: { message: 'private detail' } }
			)
		);
		await expect(requirePlusSelection({} as never, cycleId, 'dream-reading')).rejects.toMatchObject(
			{ status: 503 }
		);
	});
	it('rejects cross-origin actions before identity or RPC work', async () => {
		const event = {
			request: new Request('https://example.test/atv-mais?/start', {
				method: 'POST',
				headers: { origin: 'https://other.test' }
			}),
			url: new URL('https://example.test/atv-mais'),
			locals: {}
		};
		await expect(actions.start(event as never)).rejects.toMatchObject({ status: 403 });
		await expect(actions.cancel(event as never)).rejects.toMatchObject({ status: 403 });
		expect(trialIdentity).not.toHaveBeenCalled();
	});
	it.each([
		['42501', 403],
		['P0001', 409],
		['22023', 400],
		['unexpected', 503]
	])('maps %s to safe status %s', (code, status) => {
		try {
			plusWriteError({ code, message: 'secret database detail' });
		} catch (problem) {
			expect(problem).toMatchObject({ status });
			expect(JSON.stringify(problem)).not.toContain('secret database detail');
		}
	});
});
