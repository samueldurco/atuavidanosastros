import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LAUNCH_INPUT_VERSION, prepareLaunchEvidence, type LaunchInput } from '@atv/domain';
import { POST } from './+server';

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), calculate: vi.fn(), supported: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('$lib/server/runtime-bindings', () => ({
	trialServiceBindings: () => ({ url: 'https://synthetic.test', serviceRoleKey: 'synthetic-only' })
}));
vi.mock('$lib/server/launch-runtime', () => ({
	runLaunchRuntime: async (
		event: { request: Request },
		request: { input: unknown; executionId: string }
	) => ({
		operation: 'launch-calculation',
		calculation: await mocks.calculate(request.input, request.executionId, event.request.signal)
	})
}));

const ownerId = 'c05bf322-0bfd-4ef6-af90-3ec0da139e52';
const preparationId = '8c6d9da2-d296-4b63-a30c-42ec8762f48f';
const input: LaunchInput = {
	version: LAUNCH_INPUT_VERSION,
	productId: 'ex-tarot',
	consent: { storage: true, policyVersion: 'atv-launch-consent/1' },
	answers: {
		episode: 'Uma mensagem depois de meses.',
		observedActions: 'Perguntou como estou.',
		question: 'Responder ou esperar?',
		boundaries: 'Não aceitar insistência.'
	}
};
const read = vi.fn();
const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: read };
const client = { auth: { getClaims: vi.fn() }, rpc: vi.fn(), from: vi.fn(() => query) };
const writeResult = vi.fn();
const writeFilters: [string, unknown][] = [];
const mutation = {
	eq: vi.fn((key: string, value: unknown) => {
		writeFilters.push([key, value]);
		return mutation;
	}),
	then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
		writeResult().then(resolve, reject)
};
const update = vi.fn(() => mutation);
const writer = { from: vi.fn(() => ({ update })) };
let stored: Record<string, unknown>;
let facts: Record<string, unknown>;

function event(origin: string | null = 'https://atv.synthetic.test') {
	const url = new URL(
		`https://atv.synthetic.test/api/launch-preparations/${preparationId}/calculate`
	);
	const headers = new Headers({ 'content-type': 'application/json' });
	if (origin !== null) headers.set('origin', origin);
	return {
		request: new Request(url, { method: 'POST', headers, body: '{}' }),
		url,
		params: { id: preparationId },
		locals: { supabase: client }
	} as unknown as Parameters<typeof POST>[0];
}

beforeEach(async () => {
	vi.clearAllMocks();
	writeFilters.length = 0;
	client.auth.getClaims
		.mockReset()
		.mockResolvedValue({ data: { claims: { sub: ownerId } }, error: null });
	client.rpc.mockReset().mockResolvedValue({ data: true, error: null });
	const evidence = await prepareLaunchEvidence(input, preparationId);
	stored = {
		id: preparationId,
		owner_id: ownerId,
		request_key: preparationId,
		input,
		product_id: input.productId,
		input_digest: evidence.inputDigest,
		evidence,
		status: evidence.state
	};
	facts = {
		version: 'atv-launch-calculation/1',
		executionId: preparationId,
		productId: input.productId,
		inputDigest: evidence.inputDigest,
		state: 'FACTS_READY_AWAITING_REVIEW',
		facts: [],
		data: { draw: 'calculated-synthetic' },
		limits: ['Sem aprovação editorial.'],
		provenance: {
			editorial: 'not-reviewed',
			persistence: 'required-before-reading',
			calculation: 'deterministic-tarot'
		}
	};
	read
		.mockReset()
		.mockResolvedValueOnce({ data: stored, error: null })
		.mockResolvedValue({ data: { ...stored, status: facts.state, evidence: facts }, error: null });
	writeResult.mockReset().mockResolvedValue({ error: null });
	mocks.calculate.mockReset().mockResolvedValue(facts);
	mocks.supported.mockReset().mockReturnValue(true);
	mocks.createClient.mockReturnValue(writer);
});

describe('P02 calculation API authorization and durable fact boundary', () => {
	it('calculates from saved input and conditionally persists facts for the authenticated owner', async () => {
		const original = event();
		const request = {
			...original,
			request: new Request(original.url, {
				method: 'POST',
				headers: { origin: original.url.origin },
				body: JSON.stringify({ input: 'forged', owner_id: 'attacker', evidence: 'forged' })
			})
		};
		const response = await POST(request);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: preparationId });
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(mocks.calculate).toHaveBeenCalledExactlyOnceWith(
			input,
			preparationId,
			request.request.signal
		);
		expect(update).toHaveBeenCalledExactlyOnceWith({
			evidence: facts,
			status: 'FACTS_READY_AWAITING_REVIEW'
		});
		expect(writeFilters).toEqual([
			['id', preparationId],
			['owner_id', ownerId],
			['input_digest', stored.input_digest],
			['status', 'AWAITING_CALCULATION']
		]);
		expect(query.eq.mock.calls).toEqual([
			['owner_id', ownerId],
			['id', preparationId],
			['owner_id', ownerId],
			['id', preparationId]
		]);
	});

	it('reopens already persisted facts without recalculating or writing', async () => {
		read.mockReset().mockResolvedValue({
			data: { ...stored, status: facts.state, evidence: facts },
			error: null
		});
		const response = await POST(event());
		expect(await response.json()).toEqual({ id: preparationId });
		expect(mocks.calculate).not.toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
	});

	it('accepts a concurrent winner only after confirming its persisted ready status', async () => {
		const winningFacts = { ...facts, data: { draw: 'persisted-concurrent-winner' } };
		read
			.mockReset()
			.mockResolvedValueOnce({ data: stored, error: null })
			.mockResolvedValueOnce({
				data: { ...stored, status: facts.state, evidence: winningFacts },
				error: null
			});
		writeResult.mockResolvedValueOnce({ error: null, count: 0 });
		const response = await POST(event());
		expect(await response.json()).toEqual({ id: preparationId });
		expect(writeFilters).toContainEqual(['status', 'AWAITING_CALCULATION']);
		expect(read).toHaveBeenCalledTimes(2);
	});

	it.each(['write', 'confirmation-read', 'confirmation-not-ready', 'confirmation-not-visible'])(
		'never reports calculation success when persistence is unconfirmed: %s',
		async (stage) => {
			if (stage === 'write') writeResult.mockResolvedValueOnce({ error: { message: 'db-down' } });
			else {
				read
					.mockReset()
					.mockResolvedValueOnce({ data: stored, error: null })
					.mockResolvedValueOnce(
						stage === 'confirmation-read'
							? { data: null, error: { message: 'db-down' } }
							: stage === 'confirmation-not-visible'
								? { data: null, error: null }
								: { data: stored, error: null }
					);
			}
			await expect(POST(event())).rejects.toMatchObject({
				status: stage === 'confirmation-not-visible' ? 404 : 503
			});
		}
	);

	it('revalidates a revoked grant after calculation and before any service write', async () => {
		client.rpc
			.mockResolvedValueOnce({ data: true, error: null })
			.mockResolvedValueOnce({ data: false, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 403 });
		expect(mocks.calculate).toHaveBeenCalledOnce();
		expect(update).not.toHaveBeenCalled();
	});

	it('fails closed if access is revoked during the final owner-scoped read', async () => {
		client.rpc
			.mockResolvedValueOnce({ data: true, error: null })
			.mockResolvedValueOnce({ data: true, error: null })
			.mockResolvedValueOnce({ data: false, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 403 });
		expect(update).toHaveBeenCalledOnce();
	});

	it('does not persist if calculation fails or is aborted', async () => {
		mocks.calculate.mockRejectedValueOnce({ status: 503 });
		await expect(POST(event())).rejects.toMatchObject({ status: 503 });
		expect(update).not.toHaveBeenCalled();
	});

	it('does not invent a calculation for an unsupported product', async () => {
		read
			.mockReset()
			.mockResolvedValueOnce({ data: { ...stored, product_id: 'unsupported' }, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 409 });
		expect(mocks.calculate).not.toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
	});

	it('rejects malformed IDs before loading private data', async () => {
		const request = event();
		request.params.id = 'not-a-uuid';
		await expect(POST(request)).rejects.toMatchObject({ status: 404 });
		expect(client.from).not.toHaveBeenCalled();
		expect(update).not.toHaveBeenCalled();
	});

	it('does not expose a preparation absent from the authenticated owner scope', async () => {
		read.mockReset().mockResolvedValue({ data: null, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 404 });
		expect(query.eq).toHaveBeenCalledWith('owner_id', ownerId);
		expect(mocks.calculate).not.toHaveBeenCalled();
	});

	it.each([null, 'https://outside.synthetic.test'])(
		'rejects absent or foreign origin (%s) before private access',
		async (origin) => {
			await expect(POST(event(origin))).rejects.toMatchObject({ status: 403 });
			expect(client.auth.getClaims).not.toHaveBeenCalled();
			expect(mocks.calculate).not.toHaveBeenCalled();
		}
	);

	it.each(['missing-client', 'anonymous', 'no-grant', 'grant-error'])(
		'blocks unauthorized calculation: %s',
		async (kind) => {
			const request = event();
			if (kind === 'missing-client') request.locals.supabase = undefined;
			if (kind === 'anonymous')
				client.auth.getClaims.mockResolvedValueOnce({ data: null, error: null });
			if (kind === 'no-grant') client.rpc.mockResolvedValueOnce({ data: false, error: null });
			if (kind === 'grant-error')
				client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'unavailable' } });
			await expect(POST(request)).rejects.toMatchObject({
				status: kind === 'missing-client' ? 503 : kind === 'anonymous' ? 401 : 403
			});
			expect(mocks.calculate).not.toHaveBeenCalled();
			expect(update).not.toHaveBeenCalled();
		}
	);
});
