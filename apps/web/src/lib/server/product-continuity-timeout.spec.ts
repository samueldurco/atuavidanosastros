import { afterEach, expect, it, vi } from 'vitest';
import { prepareStoredContinuity } from './product-continuity';

const ownerId = '11111111-1111-4111-8111-111111111111';
const selectedIds = ['22222222-2222-4222-8222-222222222222'];
const unavailable = { status: 'blocked', code: 'continuity_service_unavailable' };
const blocked = { status: 'blocked', code: 'consent_required' };
type Receipt = { data: unknown; error: unknown };
afterEach(() => vi.useRealTimers());

it.each([undefined, false])('default-off (%s) creates no deadline or read', async (enabled) => {
	vi.useFakeTimers();
	const readSelection = vi.fn();
	expect(await prepareStoredContinuity({ enabled, ownerId, selectedIds, readSelection })).toEqual({
		status: 'blocked',
		code: 'disabled'
	});
	expect(readSelection).not.toHaveBeenCalled();
	expect(vi.getTimerCount()).toBe(0);
});

it.each([{ ids: [] }, { ids: ['invalid'] }, { ids: [selectedIds[0], selectedIds[0]] }])(
	'invalid selection %j creates no deadline or read',
	async ({ ids }) => {
		vi.useFakeTimers();
		const readSelection = vi.fn();
		expect(
			await prepareStoredContinuity({ enabled: true, ownerId, selectedIds: ids, readSelection })
		).toEqual({
			status: 'blocked',
			code: 'invalid_selection'
		});
		expect(readSelection).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	}
);

it.each(['resolve', 'reject'] as const)(
	'bounds an abort-ignoring read at 10s and ignores late %s without retry',
	async (late) => {
		vi.useFakeTimers();
		let signal!: AbortSignal;
		let complete!: (value: Receipt) => void;
		let fail!: (reason: Error) => void;
		const readSelection = vi.fn((_ids: string[], value: AbortSignal) => {
			signal = value;
			return new Promise<Receipt>((resolve, reject) => {
				complete = resolve;
				fail = reject;
			});
		});
		const result = prepareStoredContinuity({ enabled: true, ownerId, selectedIds, readSelection });
		const settled = vi.fn();
		void result.then(settled);
		await vi.advanceTimersByTimeAsync(9999);
		expect(signal.aborted).toBe(false);
		expect(settled).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(signal.aborted).toBe(true);
		expect(await result).toEqual(unavailable);
		if (late === 'resolve') complete({ data: blocked, error: null });
		else fail(new Error('PRIVATE_LATE_TRANSPORT_DETAIL'));
		await vi.runAllTimersAsync();
		expect(settled).toHaveBeenCalledExactlyOnceWith(unavailable);
		expect(readSelection).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
	}
);

it('sanitizes rejection from an abort-aware transport without retry', async () => {
	vi.useFakeTimers();
	const readSelection = vi.fn(
		(_ids: string[], signal: AbortSignal) =>
			new Promise<Receipt>((_resolve, reject) => {
				signal.addEventListener('abort', () => reject(new Error('PRIVATE_ABORT_DETAIL')), {
					once: true
				});
			})
	);
	const result = prepareStoredContinuity({ enabled: true, ownerId, selectedIds, readSelection });
	await vi.advanceTimersByTimeAsync(10000);
	expect(await result).toEqual(unavailable);
	expect(readSelection).toHaveBeenCalledTimes(1);
	expect(vi.getTimerCount()).toBe(0);
});

it.each(['blocked', 'malformed', 'error', 'throw'])(
	'clears deadline on immediate %s without later abort',
	async (mode) => {
		vi.useFakeTimers();
		let signal!: AbortSignal;
		const readSelection = vi.fn((_ids: string[], value: AbortSignal): Promise<Receipt> => {
			signal = value;
			if (mode === 'throw') throw new Error('PRIVATE_SYNC_DETAIL');
			return Promise.resolve({
				data: mode === 'malformed' ? {} : blocked,
				error: mode === 'error' ? 'PRIVATE_ERROR' : null
			});
		});
		expect(
			await prepareStoredContinuity({ enabled: true, ownerId, selectedIds, readSelection })
		).toEqual(mode === 'blocked' ? blocked : unavailable);
		expect(vi.getTimerCount()).toBe(0);
		await vi.advanceTimersByTimeAsync(10000);
		expect(signal.aborted).toBe(false);
		expect(readSelection).toHaveBeenCalledTimes(1);
	}
);
