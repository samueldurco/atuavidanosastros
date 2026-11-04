import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LAUNCH_INPUT_VERSION, prepareLaunchEvidence, type LaunchInput } from '@atv/domain';
import { POST } from './+server';

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('$lib/server/runtime-bindings', () => ({
	trialServiceBindings: () => ({ url: 'https://synthetic.test', serviceRoleKey: 'synthetic-only' })
}));

const ownerId = 'c05bf322-0bfd-4ef6-af90-3ec0da139e52';
const preparationId = '8c6d9da2-d296-4b63-a30c-42ec8762f48f';
// Repeated UUID is a synthetic idempotency fixture, never a credential.
const requestKey = '11111111-1111-4111-8111-111111111111';
const input: LaunchInput = {
	version: LAUNCH_INPUT_VERSION,
	productId: 'ex-tarot',
	consent: { storage: true, policyVersion: 'atv-launch-consent/1' },
	answers: {
		episode: 'Recebi uma mensagem depois de meses.',
		observedActions: 'Perguntou como estou.',
		question: 'Responder ou esperar?',
		boundaries: 'Não aceitar insistência.'
	}
};
const read = vi.fn();
const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: read };
const client = {
	auth: { getClaims: vi.fn() },
	rpc: vi.fn(),
	from: vi.fn(() => query)
};
const upsert = vi.fn();
const writer = { from: vi.fn(() => ({ upsert })) };
let stored: Record<string, unknown>;

function event(
	body: unknown = { input, requestKey },
	origin: string | null = 'https://atv.synthetic.test'
) {
	const headers = new Headers({ 'content-type': 'application/json' });
	if (origin !== null) headers.set('origin', origin);
	return {
		request: new Request('https://atv.synthetic.test/api/launch-preparations', {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		}),
		url: new URL('https://atv.synthetic.test/api/launch-preparations'),
		locals: { supabase: client },
		params: {}
	} as unknown as Parameters<typeof POST>[0];
}

beforeEach(async () => {
	vi.clearAllMocks();
	client.auth.getClaims.mockResolvedValue({ data: { claims: { sub: ownerId } }, error: null });
	client.rpc.mockResolvedValue({ data: true, error: null });
	const evidence = await prepareLaunchEvidence(input, preparationId);
	stored = {
		id: preparationId,
		owner_id: ownerId,
		request_key: requestKey,
		input,
		product_id: input.productId,
		input_digest: evidence.inputDigest,
		evidence,
		status: evidence.state
	};
	read.mockReset().mockResolvedValue({ data: stored, error: null });
	upsert.mockReset().mockResolvedValue({ error: null });
	mocks.createClient.mockReturnValue(writer);
});

describe('P02 preparation API with real identity, origin, input and digest helpers', () => {
	it('saves only validated input and returns the persisted row with a private response', async () => {
		read.mockResolvedValueOnce({ data: null, error: null });
		const response = await POST(
			event({ input, requestKey, owner_id: 'attacker', evidence: 'forged' })
		);
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(await response.json()).toEqual({ id: preparationId });
		expect(upsert).toHaveBeenCalledOnce();
		const [payload, options] = upsert.mock.calls[0];
		expect(payload).toMatchObject({
			owner_id: ownerId,
			request_key: requestKey,
			product_id: input.productId,
			input,
			input_digest: stored.input_digest,
			status: 'AWAITING_CALCULATION'
		});
		expect(payload.evidence).toMatchObject({
			inputDigest: stored.input_digest,
			state: 'AWAITING_CALCULATION'
		});
		expect(options).toEqual({ onConflict: 'owner_id,request_key', ignoreDuplicates: true });
		expect(query.eq.mock.calls).toEqual([
			['owner_id', ownerId],
			['request_key', requestKey],
			['owner_id', ownerId],
			['request_key', requestKey]
		]);
	});

	it('reopens an identical request without writing a second preparation', async () => {
		const response = await POST(event());
		expect(await response.json()).toEqual({ id: preparationId });
		expect(upsert).not.toHaveBeenCalled();
	});

	it('rejects reusing a request key for different input', async () => {
		read.mockResolvedValueOnce({ data: { ...stored, input_digest: 'other-input' }, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 409 });
		expect(upsert).not.toHaveBeenCalled();
	});

	it('returns the winning persisted ID after an identical concurrent insert', async () => {
		read.mockResolvedValueOnce({ data: null, error: null });
		const response = await POST(event());
		expect(await response.json()).toEqual({ id: preparationId });
		expect(upsert.mock.calls[0][0].id).not.toBe(preparationId);
	});

	it('rejects a concurrent winner with a different digest', async () => {
		read.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({
			data: { ...stored, input_digest: 'different-concurrent-input' },
			error: null
		});
		await expect(POST(event())).rejects.toMatchObject({ status: 409 });
		expect(upsert).toHaveBeenCalledOnce();
	});

	it('fails closed if RLS visibility is revoked before the confirming read', async () => {
		read
			.mockResolvedValueOnce({ data: null, error: null })
			.mockResolvedValueOnce({ data: null, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 503 });
		expect(read).toHaveBeenCalledTimes(2);
	});

	it.each(['initial-read', 'write', 'confirmation-read'])(
		'never returns success when persistence fails at %s',
		async (stage) => {
			if (stage === 'initial-read')
				read.mockResolvedValueOnce({ data: null, error: { message: 'db-down' } });
			else {
				read.mockResolvedValueOnce({ data: null, error: null });
				if (stage === 'write') upsert.mockResolvedValueOnce({ error: { message: 'db-down' } });
				else read.mockResolvedValueOnce({ data: null, error: { message: 'db-down' } });
			}
			await expect(POST(event())).rejects.toMatchObject({ status: 503 });
		}
	);

	it.each([null, 'https://outside.synthetic.test'])(
		'rejects absent or foreign origin (%s) before any database read',
		async (origin) => {
			await expect(POST(event(undefined, origin))).rejects.toMatchObject({ status: 403 });
			expect(client.from).not.toHaveBeenCalled();
			expect(upsert).not.toHaveBeenCalled();
		}
	);

	it.each([
		{
			input: { ...input, consent: { storage: false, policyVersion: 'atv-launch-consent/1' } },
			requestKey
		},
		{ input: { ...input, productId: 'unknown-product' }, requestKey },
		{ input, requestKey: 'not-a-uuid' },
		{ input: { ...input, answers: {} }, requestKey }
	])('rejects invalid intake without creating evidence: %j', async (body) => {
		await expect(POST(event(body))).rejects.toMatchObject({ status: 400 });
		expect(client.from).not.toHaveBeenCalled();
		expect(upsert).not.toHaveBeenCalled();
	});

	it('rejects malformed and oversized JSON using the real request helper', async () => {
		const original = event();
		const malformed = {
			...original,
			request: new Request(original.url, {
				method: 'POST',
				headers: { origin: original.url.origin },
				body: '{'
			})
		};
		await expect(POST(malformed)).rejects.toMatchObject({ status: 400 });
		await expect(POST(event({ value: 'x'.repeat(35001) }))).rejects.toMatchObject({ status: 413 });
		expect(client.from).not.toHaveBeenCalled();
	});

	it.each(['missing-client', 'anonymous', 'claims-error', 'no-grant', 'grant-error'])(
		'blocks unauthorized access: %s',
		async (kind) => {
			const request = event();
			if (kind === 'missing-client') request.locals.supabase = undefined;
			if (kind === 'anonymous')
				client.auth.getClaims.mockResolvedValueOnce({ data: null, error: null });
			if (kind === 'claims-error')
				client.auth.getClaims.mockResolvedValueOnce({ data: null, error: { message: 'invalid' } });
			if (kind === 'no-grant') client.rpc.mockResolvedValueOnce({ data: false, error: null });
			if (kind === 'grant-error')
				client.rpc.mockResolvedValueOnce({ data: true, error: { message: 'unavailable' } });
			await expect(POST(request)).rejects.toMatchObject({
				status: kind === 'missing-client' ? 503 : kind.includes('grant') ? 403 : 401
			});
			expect(client.from).not.toHaveBeenCalled();
			expect(upsert).not.toHaveBeenCalled();
		}
	);
});
