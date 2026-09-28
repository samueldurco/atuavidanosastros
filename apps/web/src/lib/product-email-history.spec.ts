import { describe, expect, it, vi, afterEach } from 'vitest';
import { createProductEmailHistory } from './product-email-history';
import type { ProductEmailReceipt } from './product-email';

const ownerId = '20000000-0000-4000-8000-000000000001';
const runId = '20000000-0000-4000-8000-000000000002';
const receipt: ProductEmailReceipt = {
	id: '20000000-0000-4000-8000-000000000003',
	runId,
	revision: 3,
	reviewDigest: 'a'.repeat(64),
	state: 'REQUESTED',
	createdAt: '2026-09-28T10:00:00Z',
	cancelledAt: null
};
const older = { ...receipt, id: '20000000-0000-4000-8000-000000000004', revision: 1 };
const cancelled: ProductEmailReceipt = {
	...receipt,
	state: 'CANCELLED',
	cancelledAt: '2026-09-28T10:01:00Z'
};
const response = (receipts: unknown = [receipt, older]) => Response.json({ receipts });
function setup() {
	const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response());
	const options = { ownerId, runId, fetch: fetcher };
	return { fetcher, options, client: createProductEmailHistory(options) };
}
afterEach(() => vi.restoreAllMocks());

describe('explicit durable email history', () => {
	it('never fetches on construction or inspection and needs no storage, key, revision or digest', () => {
		const { client, fetcher } = setup();
		expect(client.inspect()).toEqual({ mode: 'idle', message: '', receipts: [] });
		expect(fetcher).not.toHaveBeenCalled();
	});
	it('posts only the pinned run ID with private same-origin transport', async () => {
		const { client, fetcher, options } = setup();
		options.runId = ownerId;
		const state = await client.list();
		expect(state.mode).toBe('ready');
		expect(state.receipts).toEqual([receipt, older]);
		expect(state.message).toContain('não confirma envio nem entrega');
		expect(fetcher).toHaveBeenCalledOnce();
		expect(fetcher).toHaveBeenCalledWith('/api/product-email/history', {
			method: 'POST',
			credentials: 'same-origin',
			cache: 'no-store',
			redirect: 'error',
			signal: expect.any(AbortSignal),
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ runId })
		});
	});
	it.each([
		{ ownerId: 'invalid', runId },
		{ ownerId, runId: 'invalid' }
	])('blocks invalid scope %j', async (scope) => {
		const fetcher = vi.fn<typeof fetch>();
		const client = createProductEmailHistory({ ...scope, fetch: fetcher });
		expect((await client.list()).mode).toBe('blocked');
		expect((await client.cancel(receipt.id)).mode).toBe('blocked');
		expect(fetcher).not.toHaveBeenCalled();
	});
	it('distinguishes a valid empty projection from an unavailable response', async () => {
		const { client, fetcher } = setup();
		fetcher.mockResolvedValueOnce(response([])).mockResolvedValueOnce(response(null));
		expect(await client.list()).toMatchObject({
			mode: 'ready',
			receipts: [],
			message: expect.stringContaining('Nenhum pedido')
		});
		expect(await client.list()).toMatchObject({
			mode: 'unavailable',
			receipts: [],
			message: expect.not.stringContaining('Nenhum pedido')
		});
	});
	it.each([
		null,
		{},
		{ receipts: null },
		{ receipts: [receipt], secret: 'hidden' },
		{ receipts: [{ ...receipt, address: 'private@example.test' }] },
		{ receipts: [{ ...receipt, runId: ownerId }] },
		{ receipts: [older, receipt] },
		{ receipts: [receipt, receipt] },
		{ receipts: Array(9).fill(receipt) }
	])('rejects the entire malformed projection %j', async (payload) => {
		const { client, fetcher } = setup();
		await client.list();
		fetcher.mockResolvedValueOnce(Response.json(payload));
		expect(await client.list()).toMatchObject({ mode: 'unavailable', receipts: [] });
		await client.cancel(receipt.id);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
	it.each([401, 403, 409, 429, 503])(
		'redacts HTTP %i without retry or empty-success claims',
		async (status) => {
			const { client, fetcher } = setup();
			fetcher.mockResolvedValueOnce(Response.json({ error: 'private diagnostic' }, { status }));
			const state = await client.list();
			expect(state.mode).toBe('unavailable');
			expect(state.message).not.toContain('private');
			if (status === 401) expect(state.message).toContain('Entre novamente');
			expect(fetcher).toHaveBeenCalledOnce();
		}
	);
	it('redacts network and JSON errors, with no automatic retry', async () => {
		const { client, fetcher } = setup();
		fetcher
			.mockRejectedValueOnce(new Error('private diagnostic'))
			.mockResolvedValueOnce(new Response('<html>secret</html>'));
		for (let i = 0; i < 2; i++) {
			const state = await client.list();
			expect(state.mode).toBe('unavailable');
			expect(state.message).not.toMatch(/private|secret/);
		}
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
	it('uses a bounded abort signal and handles an aborted fetch', async () => {
		const { client, fetcher } = setup();
		const signal = AbortSignal.abort();
		const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal);
		fetcher.mockImplementationOnce(async (_url, init) => {
			init?.signal?.throwIfAborted();
			return response();
		});
		expect((await client.list()).mode).toBe('unavailable');
		expect(timeout).toHaveBeenCalledWith(15000);
		expect(fetcher).toHaveBeenCalledOnce();
	});
	it('only cancels an acknowledged requested receipt, using ID alone', async () => {
		const { client, fetcher } = setup();
		await client.cancel(receipt.id);
		expect(fetcher).not.toHaveBeenCalled();
		await client.list();
		await client.cancel(ownerId);
		await client.cancel('invalid');
		expect(fetcher).toHaveBeenCalledOnce();
		fetcher.mockResolvedValueOnce(Response.json({ receipt: cancelled }));
		expect(await client.cancel(receipt.id)).toMatchObject({
			mode: 'ready',
			receipts: [cancelled, older]
		});
		expect(fetcher.mock.calls[1][0]).toBe('/api/product-email/cancel');
		expect(JSON.parse(fetcher.mock.calls[1][1]!.body as string)).toEqual({ receiptId: receipt.id });
		await client.cancel(receipt.id);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
	it('requires explicit read-only reconciliation after an uncertain cancellation', async () => {
		const { client, fetcher } = setup();
		await client.list();
		fetcher.mockRejectedValueOnce(new Error('ack lost'));
		expect(await client.cancel(receipt.id)).toMatchObject({
			mode: 'unavailable',
			receipts: [],
			message: expect.stringContaining('não foi confirmado')
		});
		await client.cancel(receipt.id);
		await client.cancel(older.id);
		expect(fetcher).toHaveBeenCalledTimes(2);
		fetcher.mockResolvedValueOnce(response([cancelled, older]));
		expect((await client.list()).receipts[0]).toEqual(cancelled);
		await client.cancel(receipt.id);
		expect(fetcher).toHaveBeenCalledTimes(3);
	});
	it.each([
		null,
		receipt,
		{ ...cancelled, id: ownerId },
		{ ...cancelled, runId: ownerId },
		{ ...cancelled, revision: 2 },
		{ ...cancelled, reviewDigest: 'b'.repeat(64) },
		{ ...cancelled, createdAt: '2026-09-28T09:59:00Z' }
	])('rejects a mismatched cancellation acknowledgement %j', async (result) => {
		const { client, fetcher } = setup();
		await client.list();
		fetcher.mockResolvedValueOnce(Response.json({ receipt: result }));
		expect(await client.cancel(receipt.id)).toMatchObject({ mode: 'unavailable', receipts: [] });
	});
	it.each([
		receipt,
		{ ...cancelled, id: ownerId },
		{ ...cancelled, reviewDigest: 'b'.repeat(64) },
		{ ...cancelled, createdAt: '2026-09-28T09:59:00Z' },
		{ ...cancelled, cancelledAt: '2026-09-28T10:02:00Z' }
	])('pins identity and terminal cancellation against stale discovery %j', async (changed) => {
		const { client, fetcher } = setup();
		fetcher.mockResolvedValueOnce(response([cancelled]));
		await client.list();
		fetcher.mockResolvedValueOnce(response([changed]));
		expect((await client.list()).mode).toBe('unavailable');
		await client.cancel(receipt.id);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
	it('returns detached snapshots and does not accept forged receipt IDs', async () => {
		const { client, fetcher } = setup();
		const state = await client.list();
		state.receipts[0].id = ownerId;
		client.inspect().receipts[0].state = 'CANCELLED';
		expect(client.inspect().receipts[0]).toEqual(receipt);
		await client.cancel(ownerId);
		expect(fetcher).toHaveBeenCalledOnce();
	});
	it('allows only one pending action and exposes no actionable stale rows while waiting', async () => {
		const { client, fetcher } = setup();
		await client.list();
		let finish!: (response: Response) => void;
		fetcher.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				})
		);
		const pending = client.cancel(receipt.id);
		expect(client.inspect().receipts).toEqual([]);
		await client.list();
		await client.cancel(older.id);
		expect(fetcher).toHaveBeenCalledTimes(2);
		finish(Response.json({ receipt: cancelled }));
		expect((await pending).mode).toBe('ready');
	});
	it('accepts empty history after deletion without reactivating a known cancellation', async () => {
		const { client, fetcher } = setup();
		fetcher
			.mockResolvedValueOnce(response([cancelled]))
			.mockResolvedValueOnce(response([]))
			.mockResolvedValueOnce(response([receipt]));
		await client.list();
		expect((await client.list()).mode).toBe('ready');
		expect((await client.list()).mode).toBe('unavailable');
	});
});
