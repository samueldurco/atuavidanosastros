import { describe, expect, it, vi } from 'vitest';
import { createProductEmailRequest } from './product-email-request';

const owner = '20000000-0000-4000-8000-000000000001';
const run = '20000000-0000-4000-8000-000000000002';
const key = '20000000-0000-4000-8000-000000000003';
const id = '20000000-0000-4000-8000-000000000004';
const name = `atv-email:${owner}:${run}:4`;
const receipt = {
	id,
	runId: run,
	revision: 4,
	reviewDigest: 'a'.repeat(64),
	state: 'REQUESTED',
	createdAt: '2026-09-28T10:00:00Z',
	cancelledAt: null
};
const cancelled = { ...receipt, state: 'CANCELLED', cancelledAt: '2026-09-28T10:01:00Z' };
const json = (value: unknown, status = 200) => Response.json(value, { status });
function setup(previous?: string) {
	const values = new Map<string, string>(previous === undefined ? [] : [[name, previous]]);
	const storage = {
		getItem: vi.fn((name: string) => values.get(name) ?? null),
		setItem: vi.fn((name: string, value: string) => {
			values.set(name, value);
		}),
		removeItem: vi.fn((name: string) => {
			values.delete(name);
		})
	};
	const fetcher = vi.fn<typeof fetch>();
	const randomUUID = vi.fn(() => key);
	const options = {
		ownerId: owner,
		runId: run,
		revision: 4,
		reviewDigest: receipt.reviewDigest,
		storage,
		fetch: fetcher,
		randomUUID
	};
	return {
		values,
		storage,
		fetcher,
		randomUUID,
		options,
		client: createProductEmailRequest(options)
	};
}

describe('private owner email request controller', () => {
	it.each([
		[false, false],
		[false, true],
		[true, false]
	])('requires availability %s and fresh consent %s', async (available, consent) => {
		const s = setup();
		expect(await s.client.perform(available, consent)).toMatchObject({ mode: 'new' });
		expect(s.fetcher).not.toHaveBeenCalled();
		expect(s.storage.setItem).not.toHaveBeenCalled();
	});
	it('persists only UUID before one bounded same-origin POST and does not claim delivery', async () => {
		const s = setup();
		s.fetcher.mockImplementationOnce(async (url, init) => {
			expect([...s.values]).toEqual([[name, key]]);
			expect(url).toBe('/api/product-email/request');
			expect(init).toMatchObject({
				method: 'POST',
				credentials: 'same-origin',
				cache: 'no-store',
				redirect: 'error'
			});
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			expect(JSON.parse(String(init?.body))).toEqual({
				requestKey: key,
				command: {
					version: 'atv-email-request/1',
					runId: run,
					expectedRevision: 4,
					reviewDigest: receipt.reviewDigest,
					consent: {
						transactional: true,
						policyVersion: 'atv-email-delivery/1',
						recipient: 'account-owner'
					}
				}
			});
			return json({ receipt }, 202);
		});
		expect(await s.client.perform(true, true)).toMatchObject({
			mode: 'requested',
			message: expect.stringContaining('não confirma envio'),
			receipt
		});
		expect(s.client.inspect().mode).toBe('requested');
		expect(s.fetcher).toHaveBeenCalledTimes(1);
		expect(s.storage.removeItem).not.toHaveBeenCalled();
	});
	it('recovers a lost acknowledgement after remount without consent or replay', async () => {
		const s = setup();
		s.fetcher.mockRejectedValueOnce(new Error('lost response'));
		expect((await s.client.perform(true, true)).mode).toBe('recover');
		const restored = createProductEmailRequest(s.options);
		expect(restored.inspect().mode).toBe('recover');
		s.fetcher.mockResolvedValueOnce(json({ receipt }));
		expect((await restored.perform(false, false)).mode).toBe('requested');
		expect(s.fetcher.mock.calls.map(([path]) => path)).toEqual([
			'/api/product-email/request',
			'/api/product-email/recover'
		]);
		expect(s.randomUUID).toHaveBeenCalledTimes(1);
	});
	it('does not create on recover when no key exists', async () => {
		const s = setup();
		expect((await s.client.recover()).mode).toBe('new');
		expect(s.fetcher).not.toHaveBeenCalled();
	});
	it.each([
		null,
		{ ...receipt, runId: owner },
		{ ...receipt, revision: 5 },
		{ ...receipt, address: 'not-accepted' },
		{ ...receipt, state: 'SENT' }
	])('retains an unresolved key for absent or mismatched receipts %#', async (value) => {
		const s = setup(key);
		s.fetcher.mockResolvedValue(json({ receipt: value }));
		expect((await s.client.perform(true, true)).mode).toBe('recover');
		expect(s.values.get(name)).toBe(key);
		expect(s.randomUUID).not.toHaveBeenCalled();
	});
	it.each([400, 401, 403, 409, 429, 503])(
		'retains existing key after recovery status %s',
		async (status) => {
			const s = setup(key);
			s.fetcher.mockResolvedValue(json({ error: 'email_disabled' }, status));
			expect((await s.client.recover()).mode).toBe('recover');
			expect(s.values.get(name)).toBe(key);
		}
	);
	it.each([
		['auth_required', 401],
		['profile_unavailable', 403],
		['invalid_input', 400],
		['same_origin_required', 403],
		['email_disabled', 409],
		['email_unavailable', 409],
		['request_limit', 429]
	])('forgets only a fresh key on definitive pre-write %s', async (error, status) => {
		const s = setup();
		s.fetcher.mockResolvedValue(json({ error }, Number(status)));
		expect((await s.client.perform(true, true)).mode).toBe('new');
		expect(s.values.has(name)).toBe(false);
		expect(s.fetcher).toHaveBeenCalledTimes(1);
	});
	it.each([
		[{ error: 'email_already_requested' }, 409],
		[{ error: 'idempotency_conflict' }, 409],
		[{ error: 'email_disabled' }, 503],
		[{ error: 'email_disabled', extra: true }, 409],
		[{ error: 'unknown' }, 400],
		[{ receipt }, 200],
		[{ receipt: { ...receipt, reviewDigest: 'b'.repeat(64) } }, 202]
	])('never discards on conflicts or ambiguous response %#', async (payload, status) => {
		const s = setup();
		s.fetcher.mockResolvedValue(json(payload, Number(status)));
		expect((await s.client.perform(true, true)).mode).toBe('recover');
		expect(s.values.get(name)).toBe(key);
	});
	it('handles invalid JSON without retry or private error disclosure', async () => {
		const s = setup();
		s.fetcher.mockResolvedValue(new Response('private synthetic error', { status: 503 }));
		expect(await s.client.perform(true, true)).toEqual({
			mode: 'recover',
			message: expect.not.stringContaining('private synthetic')
		});
		expect(s.fetcher).toHaveBeenCalledTimes(1);
	});
	it.each(['getItem', 'setItem'] as const)(
		'fails closed when storage %s throws',
		async (method) => {
			const s = setup();
			s.storage[method].mockImplementation(() => {
				throw new Error('unavailable');
			});
			expect((await s.client.perform(true, true)).mode).toBe('blocked');
			expect(s.fetcher).not.toHaveBeenCalled();
		}
	);
	it('fails closed for silent storage writes and invalid UUIDs', async () => {
		const s = setup();
		s.storage.setItem.mockImplementation(() => {});
		expect((await s.client.perform(true, true)).mode).toBe('blocked');
		s.randomUUID.mockReturnValue('invalid');
		expect((await s.client.perform(true, true)).mode).toBe('blocked');
		expect(s.fetcher).not.toHaveBeenCalled();
	});
	it('blocks malformed stored keys and invalid reading pins', async () => {
		const s = setup('invalid');
		expect((await s.client.recover()).mode).toBe('blocked');
		for (const overrides of [
			{ ownerId: 'invalid' },
			{ runId: 'invalid' },
			{ revision: 9 },
			{ reviewDigest: 'bad' }
		]) {
			expect(
				(await createProductEmailRequest({ ...s.options, ...overrides }).perform(true, true)).mode
			).toBe('blocked');
		}
		expect(s.fetcher).not.toHaveBeenCalled();
	});
	it('blocks a replaced or removed key instead of creating another', async () => {
		const s = setup(key);
		s.client.inspect();
		s.values.delete(name);
		expect((await s.client.perform(true, true)).mode).toBe('blocked');
		s.values.set(name, id);
		expect((await s.client.recover()).mode).toBe('blocked');
		expect(s.fetcher).not.toHaveBeenCalled();
	});
	it('rejects acknowledgement after storage is replaced in flight', async () => {
		const s = setup();
		s.fetcher.mockImplementation(async () => {
			s.values.set(name, id);
			return json({ receipt }, 202);
		});
		expect((await s.client.perform(true, true)).mode).toBe('blocked');
	});
	it('keeps an uncertain key when definitive rejection cleanup fails', async () => {
		const s = setup();
		s.fetcher.mockResolvedValue(json({ error: 'email_disabled' }, 409));
		s.storage.removeItem.mockImplementation(() => {
			throw new Error('storage unavailable');
		});
		expect((await s.client.perform(true, true)).mode).toBe('recover');
		expect(s.values.get(name)).toBe(key);
	});
	it('cancels only an acknowledged receipt and never reactivates it', async () => {
		const s = setup(key);
		expect((await s.client.cancel()).mode).toBe('recover');
		expect(s.fetcher).not.toHaveBeenCalled();
		s.fetcher
			.mockResolvedValueOnce(json({ receipt }))
			.mockResolvedValueOnce(json({ receipt: cancelled }));
		await s.client.recover();
		expect((await s.client.cancel()).mode).toBe('cancelled');
		expect(s.fetcher.mock.calls[1][0]).toBe('/api/product-email/cancel');
		expect(JSON.parse(String(s.fetcher.mock.calls[1][1]?.body))).toEqual({ receiptId: id });
		expect((await s.client.cancel()).mode).toBe('cancelled');
		expect(s.fetcher).toHaveBeenCalledTimes(2);
		s.fetcher.mockResolvedValueOnce(json({ receipt }));
		expect((await s.client.perform(true, true)).mode).toBe('recover');
		expect(s.values.get(name)).toBe(key);
	});
	it('recovers cancellation with lost acknowledgement before another mutation', async () => {
		const s = setup(key);
		s.fetcher
			.mockResolvedValueOnce(json({ receipt }))
			.mockRejectedValueOnce(new Error('lost cancellation'));
		await s.client.recover();
		expect((await s.client.cancel()).mode).toBe('recover');
		expect((await s.client.cancel()).mode).toBe('recover');
		expect(s.fetcher).toHaveBeenCalledTimes(2);
		s.fetcher.mockResolvedValueOnce(json({ receipt: cancelled }));
		expect((await s.client.recover()).mode).toBe('cancelled');
	});
	it.each([receipt, { ...cancelled, id: owner }, null])(
		'does not accept unconfirmed cancellation %#',
		async (value) => {
			const s = setup(key);
			s.fetcher
				.mockResolvedValueOnce(json({ receipt }))
				.mockResolvedValueOnce(json({ receipt: value }));
			await s.client.recover();
			expect((await s.client.cancel()).mode).toBe('recover');
		}
	);
	it('permits read and cancellation of an older review without authorizing a new request', async () => {
		const s = setup(key);
		const client = createProductEmailRequest({ ...s.options, reviewDigest: 'b'.repeat(64) });
		s.fetcher
			.mockResolvedValueOnce(json({ receipt }))
			.mockResolvedValueOnce(json({ receipt: cancelled }));
		expect((await client.perform(false, false)).mode).toBe('requested');
		expect((await client.cancel()).mode).toBe('cancelled');
		expect(s.randomUUID).not.toHaveBeenCalled();
	});
	it('does not trust a changed receipt ID after acknowledgement or externally mutated state', async () => {
		const s = setup(key);
		s.fetcher.mockResolvedValueOnce(json({ receipt }));
		const state = await s.client.recover();
		state.receipt!.id = owner;
		expect(s.client.inspect().receipt?.id).toBe(id);
		s.fetcher.mockResolvedValueOnce(json({ receipt: { ...receipt, id: owner } }));
		expect((await s.client.recover()).mode).toBe('recover');
	});
	it('deduplicates concurrent actions within an instance', async () => {
		const s = setup();
		let resolve!: (value: Response) => void;
		s.fetcher.mockReturnValue(
			new Promise<Response>((done) => {
				resolve = done;
			})
		);
		const pending = s.client.perform(true, true);
		expect((await s.client.perform(true, true)).mode).toBe('recover');
		expect((await s.client.recover()).mode).toBe('recover');
		expect((await s.client.cancel()).mode).toBe('recover');
		expect(s.fetcher).toHaveBeenCalledTimes(1);
		resolve(json({ receipt }, 202));
		expect((await pending).mode).toBe('requested');
	});
	it('scopes storage to owner/run/revision and canonical UUID casing', () => {
		const s = setup(key);
		for (const overrides of [{ ownerId: id }, { runId: id }, { revision: 5 }]) {
			expect(createProductEmailRequest({ ...s.options, ...overrides }).inspect().mode).toBe('new');
		}
		expect(
			createProductEmailRequest({
				...s.options,
				ownerId: owner.toUpperCase(),
				runId: run.toUpperCase()
			}).inspect().mode
		).toBe('recover');
	});
});
