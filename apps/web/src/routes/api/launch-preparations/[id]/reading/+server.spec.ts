import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LAUNCH_INPUT_VERSION, prepareLaunchEvidence, type LaunchInput } from '@atv/domain';
import { POST } from './+server';

const mocks = vi.hoisted(() => ({
	createClient: vi.fn(),
	compose: vi.fn(),
	evaluate: vi.fn(),
	digest: vi.fn()
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('$lib/server/runtime-bindings', () => ({
	trialServiceBindings: () => ({ url: 'https://synthetic.test', serviceRoleKey: 'synthetic-only' })
}));
vi.mock('$lib/trials/launch-reading', () => ({
	composeLaunchReading: mocks.compose,
	evaluateLaunchReading: mocks.evaluate,
	launchReadingDigest: mocks.digest
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
const preparationRead = vi.fn();
const readingRead = vi.fn();
const preparationQuery = {
	select: vi.fn().mockReturnThis(),
	eq: vi.fn().mockReturnThis(),
	maybeSingle: preparationRead
};
const readingQuery = {
	select: vi.fn().mockReturnThis(),
	eq: vi.fn().mockReturnThis(),
	maybeSingle: readingRead
};
const client = {
	auth: { getClaims: vi.fn() },
	rpc: vi.fn(),
	from: vi.fn((table: string) =>
		table === 'atv_launch_preparations' ? preparationQuery : readingQuery
	)
};
const upsert = vi.fn();
const writer = { from: vi.fn(() => ({ upsert })) };
let preparation: Record<string, unknown>;
let facts: Record<string, unknown>;
let reading: Record<string, unknown>;
let approvedReview: Record<string, unknown>;
let saved: Record<string, unknown>;
const digest = (value: unknown) => `synthetic-digest:${JSON.stringify(value)}`;

function event(origin: string | null = 'https://atv.synthetic.test', body = '{}') {
	const url = new URL(
		`https://atv.synthetic.test/api/launch-preparations/${preparationId}/reading`
	);
	const headers = new Headers({ 'content-type': 'application/json' });
	if (origin !== null) headers.set('origin', origin);
	return {
		request: new Request(url, { method: 'POST', headers, body }),
		url,
		params: { id: preparationId },
		locals: { supabase: client }
	} as unknown as Parameters<typeof POST>[0];
}

beforeEach(async () => {
	vi.clearAllMocks();
	client.auth.getClaims
		.mockReset()
		.mockResolvedValue({ data: { claims: { sub: ownerId } }, error: null });
	client.rpc.mockReset().mockResolvedValue({ data: true, error: null });
	const evidence = await prepareLaunchEvidence(input, preparationId);
	facts = {
		version: 'atv-launch-calculation/1',
		executionId: preparationId,
		productId: input.productId,
		inputDigest: evidence.inputDigest,
		state: 'FACTS_READY_AWAITING_REVIEW',
		facts: [],
		data: { draw: 'synthetic-calculated-facts' },
		limits: [],
		provenance: {
			editorial: 'not-reviewed',
			persistence: 'required-before-reading',
			calculation: 'deterministic-tarot'
		}
	};
	preparation = {
		id: preparationId,
		owner_id: ownerId,
		request_key: preparationId,
		input,
		product_id: input.productId,
		input_digest: evidence.inputDigest,
		evidence: facts,
		status: facts.state
	};
	reading = { title: 'Leitura sintética para teste do contrato de persistência.' };
	approvedReview = {
		status: 'APPROVED_FOR_PRIVATE_TEST',
		policyVersion: 'synthetic-private-policy/1',
		digest: 'synthetic-review-digest',
		reasons: []
	};
	saved = {
		preparation_id: preparationId,
		owner_id: ownerId,
		product_id: input.productId,
		input_digest: evidence.inputDigest,
		calculation_digest: digest(facts),
		reading_digest: digest(reading),
		reading,
		review: approvedReview
	};
	preparationRead.mockReset().mockResolvedValue({ data: preparation, error: null });
	readingRead
		.mockReset()
		.mockResolvedValueOnce({ data: null, error: null })
		.mockResolvedValue({ data: saved, error: null });
	upsert.mockReset().mockResolvedValue({ error: null });
	mocks.createClient.mockReturnValue(writer);
	mocks.compose.mockReset().mockResolvedValue(reading);
	mocks.evaluate.mockReset().mockResolvedValue(approvedReview);
	mocks.digest.mockReset().mockImplementation(async (value: unknown) => digest(value));
});

describe('P02 reading API private review and persistence boundary', () => {
	it('uses only persisted input and facts, then confirms the approved edition through owner RLS', async () => {
		const response = await POST(
			event(
				undefined,
				JSON.stringify({
					input: 'forged',
					facts: 'forged',
					reading: 'forged',
					review: 'forged',
					owner_id: 'attacker'
				})
			)
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: preparationId });
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(mocks.compose).toHaveBeenCalledExactlyOnceWith(input, facts);
		expect(mocks.evaluate).toHaveBeenNthCalledWith(1, input, facts, reading);
		expect(writer.from).toHaveBeenCalledExactlyOnceWith('atv_launch_readings');
		expect(upsert).toHaveBeenCalledExactlyOnceWith(
			{
				preparation_id: preparationId,
				owner_id: ownerId,
				product_id: input.productId,
				input_digest: preparation.input_digest,
				calculation_digest: digest(facts),
				reading_digest: digest(reading),
				reading,
				review: approvedReview
			},
			{ onConflict: 'preparation_id', ignoreDuplicates: true }
		);
		expect(preparationQuery.eq.mock.calls).toEqual([
			['owner_id', ownerId],
			['id', preparationId]
		]);
		expect(readingQuery.eq.mock.calls).toEqual([
			['preparation_id', preparationId],
			['owner_id', ownerId],
			['preparation_id', preparationId],
			['owner_id', ownerId]
		]);
	});

	it('reopens an already saved and revalidated edition without composing or writing again', async () => {
		readingRead.mockReset().mockResolvedValue({ data: saved, error: null });
		const response = await POST(event());
		expect(await response.json()).toEqual({ id: preparationId });
		expect(mocks.evaluate).toHaveBeenCalledExactlyOnceWith(input, facts, reading);
		expect(mocks.compose).not.toHaveBeenCalled();
		expect(upsert).not.toHaveBeenCalled();
	});

	it('requires persisted facts before querying or composing a reading', async () => {
		preparationRead.mockResolvedValueOnce({
			data: { ...preparation, status: 'AWAITING_CALCULATION' },
			error: null
		});
		await expect(POST(event())).rejects.toMatchObject({ status: 409 });
		expect(readingRead).not.toHaveBeenCalled();
		expect(mocks.compose).not.toHaveBeenCalled();
		expect(upsert).not.toHaveBeenCalled();
	});

	it('returns rejected review reasons with 422 and does not persist a reading', async () => {
		mocks.evaluate.mockResolvedValueOnce({
			...approvedReview,
			status: 'REJECTED',
			reasons: ['missing-product-specific-grounding']
		});
		const response = await POST(event());
		expect(response.status).toBe(422);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(await response.json()).toMatchObject({
			reasons: ['missing-product-specific-grounding']
		});
		expect(upsert).not.toHaveBeenCalled();
	});

	it('preserves facts when composition fails before review', async () => {
		mocks.compose.mockRejectedValueOnce(new Error('synthetic-product-not-ready'));
		await expect(POST(event())).rejects.toMatchObject({ status: 422 });
		expect(mocks.evaluate).not.toHaveBeenCalled();
		expect(upsert).not.toHaveBeenCalled();
	});

	it('accepts an approved concurrent winner only after checking its persisted edition', async () => {
		const winnerReading = { title: 'Edição concorrente persistida.' };
		const winner = { ...saved, reading: winnerReading, reading_digest: digest(winnerReading) };
		readingRead
			.mockReset()
			.mockResolvedValueOnce({ data: null, error: null })
			.mockResolvedValueOnce({ data: winner, error: null });
		upsert.mockResolvedValueOnce({ data: null, error: null, count: 0 });
		const response = await POST(event());
		expect(await response.json()).toEqual({ id: preparationId });
		expect(mocks.evaluate).toHaveBeenLastCalledWith(input, facts, winnerReading);
		expect(readingRead).toHaveBeenCalledTimes(2);
	});

	it.each([
		'product',
		'input',
		'calculation',
		'reading',
		'policy',
		'review-digest',
		'review-status'
	])('rejects a conflicting persisted concurrent edition: %s', async (conflict) => {
		const conflicting: Record<string, unknown> & { review: Record<string, unknown> } = {
			...saved,
			review: { ...approvedReview }
		};
		if (conflict === 'product') conflicting.product_id = 'sexuality-map';
		if (conflict === 'input') conflicting.input_digest = 'different-input';
		if (conflict === 'calculation') conflicting.calculation_digest = 'different-facts';
		if (conflict === 'reading') conflicting.reading_digest = 'different-reading';
		if (conflict === 'policy') conflicting.review.policyVersion = 'old-policy';
		if (conflict === 'review-digest') conflicting.review.digest = 'different-review';
		if (conflict === 'review-status') conflicting.review.status = 'REJECTED';
		readingRead
			.mockReset()
			.mockResolvedValueOnce({ data: null, error: null })
			.mockResolvedValueOnce({ data: conflicting, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 409 });
		expect(upsert).toHaveBeenCalledOnce();
	});

	it('rejects a saved edition that fails the current editorial evaluation', async () => {
		readingRead.mockReset().mockResolvedValue({ data: saved, error: null });
		mocks.evaluate.mockResolvedValueOnce({ ...approvedReview, status: 'REJECTED' });
		await expect(POST(event())).rejects.toMatchObject({ status: 409 });
		expect(mocks.compose).not.toHaveBeenCalled();
		expect(upsert).not.toHaveBeenCalled();
	});

	it('rechecks a revoked grant after review and before service-role persistence', async () => {
		client.rpc
			.mockResolvedValueOnce({ data: true, error: null })
			.mockResolvedValueOnce({ data: true, error: null })
			.mockResolvedValueOnce({ data: false, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 403 });
		expect(mocks.compose).toHaveBeenCalledOnce();
		expect(upsert).not.toHaveBeenCalled();
	});

	it('does not expose a persisted reading if access is revoked before the final read', async () => {
		client.rpc
			.mockResolvedValueOnce({ data: true, error: null })
			.mockResolvedValueOnce({ data: true, error: null })
			.mockResolvedValueOnce({ data: true, error: null })
			.mockResolvedValueOnce({ data: false, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 403 });
		expect(upsert).toHaveBeenCalledOnce();
		expect(readingRead).toHaveBeenCalledOnce();
	});

	it.each([
		'preparation-read',
		'existing-read',
		'write',
		'confirmation-read',
		'confirmation-missing'
	])('never reports success without confirmed persistence: %s', async (stage) => {
		if (stage === 'preparation-read')
			preparationRead.mockResolvedValueOnce({ data: null, error: { message: 'db-down' } });
		if (stage === 'existing-read')
			readingRead.mockReset().mockResolvedValueOnce({ data: null, error: { message: 'db-down' } });
		if (stage === 'write') upsert.mockResolvedValueOnce({ error: { message: 'db-down' } });
		if (stage.startsWith('confirmation-'))
			readingRead
				.mockReset()
				.mockResolvedValueOnce({ data: null, error: null })
				.mockResolvedValueOnce({
					data: null,
					error: stage === 'confirmation-read' ? { message: 'db-down' } : null
				});
		await expect(POST(event())).rejects.toMatchObject({ status: 503 });
	});

	it.each([null, 'https://outside.synthetic.test'])(
		'rejects missing or foreign origin (%s) before accessing private state',
		async (origin) => {
			await expect(POST(event(origin))).rejects.toMatchObject({ status: 403 });
			expect(client.auth.getClaims).not.toHaveBeenCalled();
			expect(client.from).not.toHaveBeenCalled();
			expect(upsert).not.toHaveBeenCalled();
		}
	);

	it.each(['missing-client', 'anonymous', 'claims-error', 'no-grant', 'grant-error'])(
		'blocks unauthorized reading generation: %s',
		async (kind) => {
			const request = event();
			if (kind === 'missing-client') request.locals.supabase = undefined;
			if (kind === 'anonymous')
				client.auth.getClaims.mockResolvedValueOnce({ data: null, error: null });
			if (kind === 'claims-error')
				client.auth.getClaims.mockResolvedValueOnce({
					data: null,
					error: { message: 'unavailable' }
				});
			if (kind === 'no-grant') client.rpc.mockResolvedValueOnce({ data: false, error: null });
			if (kind === 'grant-error')
				client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'unavailable' } });
			await expect(POST(request)).rejects.toMatchObject({
				status:
					kind === 'missing-client'
						? 503
						: kind === 'anonymous' || kind === 'claims-error'
							? 401
							: 403
			});
			expect(mocks.compose).not.toHaveBeenCalled();
			expect(upsert).not.toHaveBeenCalled();
		}
	);

	it('does not expose a preparation absent from the authenticated owner scope', async () => {
		preparationRead.mockResolvedValueOnce({ data: null, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 404 });
		expect(preparationQuery.eq).toHaveBeenCalledWith('owner_id', ownerId);
		expect(mocks.compose).not.toHaveBeenCalled();
	});

	it('rejects an invalid preparation ID before loading private data', async () => {
		const request = event();
		request.params.id = 'invalid-id';
		await expect(POST(request)).rejects.toMatchObject({ status: 404 });
		expect(client.from).not.toHaveBeenCalled();
		expect(upsert).not.toHaveBeenCalled();
	});

	it('rejects malformed JSON before reading a saved preparation', async () => {
		await expect(POST(event(undefined, '{'))).rejects.toMatchObject({ status: 400 });
		expect(client.from).not.toHaveBeenCalled();
		expect(upsert).not.toHaveBeenCalled();
	});
});
