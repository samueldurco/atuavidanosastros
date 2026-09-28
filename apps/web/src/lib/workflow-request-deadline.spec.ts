import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WORKFLOW_VERSION } from '@atv/domain';
import { createWorkflowRequest } from './workflow-request';
import { NATAL_REQUEST_VERSION } from './natal-request';
import { DATE_REQUEST_VERSION } from './date-request';
import { PAIR_REQUEST_VERSION } from './pair-request';

const owner = '50000000-0000-4000-8000-000000000001';
const key = '50000000-0000-4000-8000-000000000002';
const id = '50000000-0000-4000-8000-000000000003';
const library = '50000000-0000-4000-8000-000000000004';
const parent = '50000000-0000-4000-8000-000000000005';
const consent = {
	storage: true,
	policyVersion: 'atv-input-consent/1',
	partner: false,
	continuity: false
};
const at = '2026-09-28T12:00:00Z';
const variants = [
	{
		kind: 'create',
		productId: 'daily-card',
		path: '/api/workflows',
		input: {
			version: WORKFLOW_VERSION,
			productId: 'daily-card',
			consent,
			questions: ['Como cuidar da atenção?']
		}
	},
	{
		kind: 'create-natal',
		productId: 'birth-chart',
		path: '/api/workflows/natal',
		input: {
			version: NATAL_REQUEST_VERSION,
			productId: 'birth-chart',
			expectedRevision: 2,
			consent
		}
	},
	{
		kind: 'create-date',
		productId: 'date-reading',
		path: '/api/workflows/date',
		input: {
			version: DATE_REQUEST_VERSION,
			productId: 'date-reading',
			expectedRevision: 2,
			targetDate: '2028-02-29',
			consent
		}
	},
	{
		kind: 'create-pair',
		productId: 'pair-preview',
		path: '/api/workflows/pair',
		input: {
			version: PAIR_REQUEST_VERSION,
			productId: 'pair-preview',
			expectedRevision: 2,
			consent: { ...consent, partner: true },
			partnerConsent: {
				storage: true,
				policyVersion: 'atv-partner-storage/1',
				permissionDeclared: true,
				sharing: false
			},
			partner: {
				localDateTime: '2000-02-29T10:00:00',
				utcInstant: '2000-02-29T10:00:00Z',
				timezone: 'UTC',
				latitude: 51.5,
				longitude: -0.12,
				locationSource: 'manual-partner/1',
				timePrecision: 'EXACT'
			}
		}
	},
	{
		kind: 'reprocess',
		productId: 'daily-card',
		path: `/api/workflows/${parent}/reprocess`,
		input: undefined
	}
] as const;

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
}
function setup(variant = variants[0] as (typeof variants)[number], previous = false) {
	const slot =
		variant.kind === 'reprocess'
			? `atv-reprocess:${parent}`
			: `atv-create:${owner}:${variant.productId}`;
	const values = new Map<string, string>(previous ? [[slot, key]] : []);
	const storage = {
		getItem: (name: string) => values.get(name) ?? null,
		setItem: (name: string, value: string) => {
			values.set(name, value);
		},
		removeItem: vi.fn((name: string) => {
			values.delete(name);
		})
	};
	const fetcher = vi.fn<typeof fetch>();
	const randomUUID = vi.fn(() => key);
	const client = createWorkflowRequest({
		operation:
			variant.kind === 'reprocess'
				? { kind: 'reprocess', runId: parent }
				: { kind: variant.kind, ownerId: owner },
		productId: variant.productId,
		storage,
		fetch: fetcher,
		randomUUID
	});
	const request = { runId: id, productId: variant.productId, libraryItemId: library };
	const run = {
		id,
		productId: variant.productId,
		parentId: variant.kind === 'reprocess' ? parent : null,
		libraryItemId: library,
		state: 'QUEUED',
		revision: 1,
		createdAt: at,
		updatedAt: at,
		released: false,
		canReprocess: false,
		calculation: null,
		editorial: null,
		history: [{ revision: 1, state: 'QUEUED', at }]
	};
	const found = () =>
		fetcher
			.mockResolvedValueOnce(Response.json({ request }))
			.mockResolvedValueOnce(Response.json({ run }));
	return { slot, values, storage, fetcher, randomUUID, client, request, run, found };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

for (const variant of variants) {
	it.each(['headers', 'body'] as const)(
		`${variant.kind}: timeout awaiting %s keeps UUID and permits reads only`,
		async (phase) => {
			const s = setup(variant);
			const lateHeaders = deferred<Response>();
			const lateBody = deferred<unknown>();
			const response = Response.json({ runId: id }, { status: 202 });
			const body = vi.spyOn(response, 'json').mockReturnValue(lateBody.promise);
			s.fetcher.mockImplementationOnce(() =>
				phase === 'headers' ? lateHeaders.promise : Promise.resolve(response)
			);
			const pending = s.client.perform(true, variant.input);
			await vi.advanceTimersByTimeAsync(14999);
			expect(s.fetcher).toHaveBeenCalledTimes(1);
			expect(s.fetcher.mock.calls[0][0]).toBe(variant.path);
			expect(s.fetcher.mock.calls[0][1]?.signal?.aborted).toBe(false);
			await vi.advanceTimersByTimeAsync(1);
			expect(await pending).toMatchObject({ mode: 'recover' });
			expect(s.fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
			expect([...s.values]).toEqual([[s.slot, key]]);
			expect(s.client.startAnother().mode).toBe('recover');
			s.found();
			expect((await s.client.perform(true, variant.input)).href).toBe(`/biblioteca/${library}`);
			// A late acknowledgement must neither run recovery nor unlock another submission.
			lateHeaders.resolve(response);
			lateBody.resolve({ runId: id });
			await vi.advanceTimersByTimeAsync(0);
			if (phase === 'headers') expect(body).not.toHaveBeenCalled();
			expect(s.fetcher.mock.calls.map(([url]) => url)).toEqual([
				variant.path,
				'/api/workflows/recover',
				`/api/workflows/${id}`
			]);
			expect(s.randomUUID).toHaveBeenCalledTimes(1);
			expect(s.storage.removeItem).not.toHaveBeenCalled();
			expect(vi.getTimerCount()).toBe(0);
		}
	);
}

it.each(['recover-headers', 'recover-body', 'reader-headers', 'reader-body'] as const)(
	'%s timeout cannot produce a link or discard a pending request',
	async (phase) => {
		const s = setup(variants[0], true);
		const late = deferred<Response>();
		const body = deferred<unknown>();
		const readerPhase = phase.startsWith('reader');
		if (readerPhase) s.fetcher.mockResolvedValueOnce(Response.json({ request: s.request }));
		const response = Response.json(readerPhase ? { run: s.run } : { request: s.request });
		vi.spyOn(response, 'json').mockReturnValue(body.promise);
		s.fetcher.mockImplementationOnce(() =>
			phase.endsWith('headers') ? late.promise : Promise.resolve(response)
		);
		const pending = s.client.perform(true);
		await vi.advanceTimersByTimeAsync(15000);
		const result = await pending;
		expect(result.mode).toBe('recover');
		expect(result.href).toBeUndefined();
		expect(s.client.startAnother().mode).toBe('recover');
		late.resolve(response);
		body.resolve(readerPhase ? { run: s.run } : { request: s.request });
		await vi.advanceTimersByTimeAsync(0);
		expect(s.fetcher).toHaveBeenCalledTimes(readerPhase ? 2 : 1);
		expect(s.storage.removeItem).not.toHaveBeenCalled();
		s.found();
		expect((await s.client.perform(false)).href).toBe(`/biblioteca/${library}`);
		expect(s.randomUUID).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
	}
);

it('headers and JSON share one deadline, and a late exact refusal cannot remove the UUID', async () => {
	const s = setup();
	const headers = deferred<Response>();
	const body = deferred<unknown>();
	const response = Response.json({ error: 'workflow_unreleased' }, { status: 409 });
	vi.spyOn(response, 'json').mockReturnValue(body.promise);
	s.fetcher.mockReturnValueOnce(headers.promise);
	const pending = s.client.perform(true, variants[0].input);
	await vi.advanceTimersByTimeAsync(10000);
	headers.resolve(response);
	await vi.advanceTimersByTimeAsync(5000);
	expect((await pending).mode).toBe('recover');
	body.resolve({ error: 'workflow_unreleased' });
	await vi.advanceTimersByTimeAsync(0);
	expect([...s.values]).toEqual([[s.slot, key]]);
	expect(s.storage.removeItem).not.toHaveBeenCalled();
});

it('deadline wins when an abort listener returns an exact refusal synchronously', async () => {
	const s = setup();
	s.fetcher.mockImplementationOnce(
		(_url, init) =>
			new Promise((resolve) => {
				init?.signal?.addEventListener(
					'abort',
					() => resolve(Response.json({ error: 'workflow_unreleased' }, { status: 409 })),
					{ once: true }
				);
			})
	);
	const pending = s.client.perform(true, variants[0].input);
	await vi.advanceTimersByTimeAsync(15000);
	expect((await pending).mode).toBe('recover');
	expect([...s.values]).toEqual([[s.slot, key]]);
	expect(s.storage.removeItem).not.toHaveBeenCalled();
	expect(vi.getTimerCount()).toBe(0);
});

it('late transport rejection is observed without side effects or an unhandled rejection', async () => {
	const s = setup();
	const late = deferred<Response>();
	s.fetcher.mockReturnValueOnce(late.promise);
	const pending = s.client.perform(true, variants[0].input);
	await vi.advanceTimersByTimeAsync(15000);
	expect((await pending).mode).toBe('recover');
	late.reject(new Error('synthetic_late_failure'));
	await vi.advanceTimersByTimeAsync(0);
	expect([...s.values]).toEqual([[s.slot, key]]);
	expect(vi.getTimerCount()).toBe(0);
});

it('fast refusal clears its timer and remains eligible for an explicit corrected submission', async () => {
	const s = setup();
	s.fetcher.mockResolvedValueOnce(Response.json({ error: 'workflow_unreleased' }, { status: 409 }));
	expect((await s.client.perform(true, variants[0].input)).mode).toBe('new');
	expect(s.values.size).toBe(0);
	expect(vi.getTimerCount()).toBe(0);
});

it('body-free recovery 401 still tells the user to sign in without reading the body', async () => {
	const s = setup(variants[0], true);
	const response = new Response(null, { status: 401 });
	const read = vi.spyOn(response, 'json');
	s.fetcher.mockResolvedValueOnce(response);
	expect((await s.client.perform(false)).message).toContain('Entre novamente');
	expect(read).not.toHaveBeenCalled();
	expect(vi.getTimerCount()).toBe(0);
});
