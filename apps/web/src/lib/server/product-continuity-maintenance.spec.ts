import { afterEach, describe, expect, it, vi } from 'vitest';
import { maintainContinuityAccess } from './product-continuity-maintenance';

afterEach(() => vi.useRealTimers());
describe('continuity maintenance internal single-batch boundary', () => {
	it.each([undefined, false])('default-off (%s) never calls service', async (enabled) => {
		const purgeExpired = vi.fn();
		expect(await maintainContinuityAccess({ enabled, purgeExpired })).toEqual({
			status: 'blocked',
			code: 'disabled'
		});
		expect(purgeExpired).not.toHaveBeenCalled();
	});
	it.each([0, 1, 500])('accepts one batch %s but never claims backlog empty', async (data) => {
		const purgeExpired = vi.fn(async () => ({ data, error: null }));
		expect(await maintainContinuityAccess({ enabled: true, purgeExpired })).toEqual({
			status: 'completed',
			deleted: data,
			remaining: 'unknown'
		});
		expect(purgeExpired).toHaveBeenCalledTimes(1);
		expect(purgeExpired.mock.calls[0]).toHaveLength(1);
	});
	it.each([null, true, '1', -1, 0.5, 501, Infinity, NaN, { deleted: 1 }, []])(
		'rejects malformed receipt %j without retry',
		async (data) => {
			const purgeExpired = vi.fn(async () => ({ data, error: null }));
			expect(await maintainContinuityAccess({ enabled: true, purgeExpired })).toEqual({
				status: 'unconfirmed',
				code: 'maintenance_unavailable'
			});
			expect(purgeExpired).toHaveBeenCalledTimes(1);
		}
	);
	it.each(['throw', 'error', 'lost-after-commit'])(
		'sanitizes %s without repeating destructive action',
		async (mode) => {
			let committed = 0;
			const purgeExpired = vi.fn(async () => {
				if (mode === 'lost-after-commit') committed++;
				if (mode !== 'error') throw new Error('PRIVATE_PROVIDER_DETAIL');
				return { data: 1, error: 'PRIVATE_PROVIDER_DETAIL' };
			});
			expect(await maintainContinuityAccess({ enabled: true, purgeExpired })).toEqual({
				status: 'unconfirmed',
				code: 'maintenance_unavailable'
			});
			expect(purgeExpired).toHaveBeenCalledTimes(1);
			expect(committed).toBe(mode === 'lost-after-commit' ? 1 : 0);
		}
	);
	it('bounds waiting even when transport ignores abort; late success is not delivered', async () => {
		vi.useFakeTimers();
		let signal!: AbortSignal;
		let complete!: (value: { data: unknown; error: unknown }) => void;
		const purgeExpired = vi.fn((value: AbortSignal) => {
			signal = value;
			return new Promise<{ data: unknown; error: unknown }>((resolve) => {
				complete = resolve;
			});
		});
		const result = maintainContinuityAccess({ enabled: true, purgeExpired });
		await vi.advanceTimersByTimeAsync(10000);
		expect(signal.aborted).toBe(true);
		expect(await result).toEqual({ status: 'unconfirmed', code: 'maintenance_unavailable' });
		complete({ data: 500, error: null });
		await vi.runAllTimersAsync();
		expect(purgeExpired).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	});
	it('cleans deadline on success and immediate throw', async () => {
		vi.useFakeTimers();
		await maintainContinuityAccess({
			enabled: true,
			purgeExpired: async () => ({ data: 0, error: null })
		});
		expect(vi.getTimerCount()).toBe(0);
		await maintainContinuityAccess({
			enabled: true,
			purgeExpired: () => {
				throw new Error('private');
			}
		});
		expect(vi.getTimerCount()).toBe(0);
	});
});
