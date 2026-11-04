import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';

const runtime = vi.hoisted(() => ({ evaluate: vi.fn(), digest: vi.fn() }));
vi.mock('$lib/server/launch-runtime-contract', () => ({ launchRuntimeDigest: runtime.digest }));
vi.mock('$lib/server/launch-runtime', () => ({
	runLaunchRuntime: async (
		_event: unknown,
		request: { input: unknown; calculation: unknown; reading: unknown }
	) => ({
		operation: 'launch-verify',
		review: await runtime.evaluate(request.input, request.calculation, request.reading)
	})
}));
const ownerId = 'c05bf322-0bfd-4ef6-af90-3ec0da139e52';
const preparationId = '8c6d9da2-d296-4b63-a30c-42ec8762f48f';
// Repeated UUID is synthetic; letters also exercise uppercase normalization.
const requestKey = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const feedbackId = '67831b76-81b4-4129-bb48-f3f83c72bbec';
const preparationRead = vi.fn(),
	readingRead = vi.fn(),
	feedbackRead = vi.fn(),
	insert = vi.fn();
const query = (read: typeof preparationRead) => ({
	select: vi.fn().mockReturnThis(),
	eq: vi.fn().mockReturnThis(),
	maybeSingle: read
});
const preparationQuery = query(preparationRead),
	readingQuery = query(readingRead);
const feedbackQuery = { ...query(feedbackRead), insert };
const client = {
	auth: { getClaims: vi.fn() },
	rpc: vi.fn(),
	from: vi.fn((table: string) => {
		if (table === 'atv_launch_preparations') return preparationQuery;
		if (table === 'atv_launch_readings') return readingQuery;
		if (table === 'atv_launch_feedback') return feedbackQuery;
		throw new Error(`Unexpected table ${table}`);
	})
};
let preparation: Record<string, unknown>,
	savedReading: Record<string, unknown>,
	row: Record<string, unknown>;
const body = (extra = {}) =>
	JSON.stringify({
		request_key: requestKey,
		decision: 'approved',
		comment: 'A leitura fez sentido.',
		...extra
	});
function event(text = body(), origin: string | null = 'https://atv.synthetic.test') {
	const url = new URL(
		`https://atv.synthetic.test/api/launch-preparations/${preparationId}/feedback`
	);
	const headers = new Headers({ 'content-type': 'application/json' });
	if (origin !== null) headers.set('origin', origin);
	return {
		request: new Request(url, { method: 'POST', headers, body: text }),
		url,
		params: { id: preparationId },
		locals: { supabase: client }
	} as unknown as Parameters<typeof POST>[0];
}
beforeEach(() => {
	vi.clearAllMocks();
	client.auth.getClaims
		.mockReset()
		.mockResolvedValue({ data: { claims: { sub: ownerId } }, error: null });
	client.rpc.mockReset().mockResolvedValue({ data: true, error: null });
	const calculation = { synthetic: 'persisted-facts' };
	const reading = { synthetic: 'persisted-edition' };
	const review = {
		status: 'APPROVED_FOR_PRIVATE_TEST',
		policyVersion: 'synthetic-policy/1',
		digest: 'review-digest'
	};
	preparation = {
		id: preparationId,
		owner_id: ownerId,
		product_id: 'ex-tarot',
		input: { synthetic: 'persisted-input' },
		input_digest: 'input-digest',
		status: 'FACTS_READY_AWAITING_REVIEW',
		evidence: calculation
	};
	savedReading = {
		preparation_id: preparationId,
		owner_id: ownerId,
		product_id: 'ex-tarot',
		input_digest: 'input-digest',
		calculation_digest: 'facts-digest',
		reading_digest: 'a'.repeat(64),
		reading,
		review
	};
	row = {
		id: feedbackId,
		request_key: requestKey,
		preparation_id: preparationId,
		owner_id: ownerId,
		reading_digest: 'a'.repeat(64),
		decision: 'approved',
		comment: 'A leitura fez sentido.',
		created_at: '2026-11-04T11:00:00Z'
	};
	preparationRead.mockReset().mockResolvedValue({ data: preparation, error: null });
	readingRead.mockReset().mockResolvedValue({ data: savedReading, error: null });
	feedbackRead
		.mockReset()
		.mockResolvedValueOnce({ data: null, error: null })
		.mockResolvedValue({ data: row, error: null });
	insert.mockReset().mockResolvedValue({ error: null });
	runtime.evaluate.mockReset().mockResolvedValue(review);
	runtime.digest
		.mockReset()
		.mockImplementation(async (value) => (value === calculation ? 'facts-digest' : 'a'.repeat(64)));
});

describe('P02 human feedback API access, edition binding and append-only retries', () => {
	it('inserts exactly six authenticated columns and confirms the owner-visible record', async () => {
		const response = await POST(
			event(
				body({ owner_id: 'forged', reading_digest: 'forged', id: 'forged', created_at: 'forged' })
			)
		);
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(await response.json()).toEqual({
			id: feedbackId,
			decision: row.decision,
			comment: row.comment,
			created_at: row.created_at
		});
		expect(insert).toHaveBeenCalledWith({
			request_key: requestKey,
			preparation_id: preparationId,
			owner_id: ownerId,
			reading_digest: 'a'.repeat(64),
			decision: 'approved',
			comment: 'A leitura fez sentido.'
		});
		expect(feedbackQuery.eq).toHaveBeenCalledWith('owner_id', ownerId);
		expect(feedbackQuery.eq).toHaveBeenCalledWith('request_key', requestKey);
		expect(runtime.evaluate).toHaveBeenCalledWith(
			preparation.input,
			preparation.evidence,
			savedReading.reading
		);
		expect(client.rpc.mock.calls.length).toBeGreaterThanOrEqual(5);
	});
	it.each([null, 'https://other.synthetic.test'])(
		'rejects missing or foreign origin %s',
		async (origin) => {
			await expect(POST(event(body(), origin))).rejects.toMatchObject({ status: 403 });
			expect(client.from).not.toHaveBeenCalled();
		}
	);
	it('rejects invalid JSON and oversized input', async () => {
		await expect(POST(event('{'))).rejects.toMatchObject({ status: 400 });
		await expect(POST(event('x'.repeat(35001)))).rejects.toMatchObject({ status: 413 });
		expect(insert).not.toHaveBeenCalled();
	});
	it.each([
		{ request_key: 'invalid' },
		{ decision: 'maybe' },
		{ comment: 10 },
		{ comment: 'x'.repeat(3001) },
		{ decision: 'rejected', comment: '  ' }
	])('rejects invalid feedback %j', async (extra) => {
		await expect(POST(event(body(extra)))).rejects.toMatchObject({ status: 400 });
		expect(client.from).not.toHaveBeenCalled();
	});
	it('requires authentication', async () => {
		client.auth.getClaims.mockResolvedValue({ data: null, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 401 });
		expect(insert).not.toHaveBeenCalled();
	});
	it('requires a current private grant', async () => {
		client.rpc.mockResolvedValue({ data: false, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 403 });
		expect(insert).not.toHaveBeenCalled();
	});
	it('hides another owner preparation through the owner query', async () => {
		preparationRead.mockResolvedValue({ data: null, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 404 });
		expect(preparationQuery.eq).toHaveBeenCalledWith('owner_id', ownerId);
		expect(insert).not.toHaveBeenCalled();
	});
	it('requires a saved approved reading', async () => {
		readingRead.mockResolvedValue({ data: null, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 409 });
		expect(insert).not.toHaveBeenCalled();
	});
	it('refuses a saved edition whose current review is rejected', async () => {
		runtime.evaluate.mockResolvedValue({
			status: 'REJECTED',
			policyVersion: 'synthetic-policy/1',
			digest: 'review-digest'
		});
		await expect(POST(event())).rejects.toMatchObject({ status: 409 });
		expect(insert).not.toHaveBeenCalled();
	});
	it('refuses a reading digest mismatch', async () => {
		savedReading.reading_digest = 'b'.repeat(64);
		await expect(POST(event())).rejects.toMatchObject({ status: 409 });
		expect(insert).not.toHaveBeenCalled();
	});
	it('returns a matching retry without another insert', async () => {
		feedbackRead.mockReset().mockResolvedValue({ data: row, error: null });
		expect((await POST(event())).status).toBe(200);
		expect(insert).not.toHaveBeenCalled();
	});
	it('normalizes an uppercase UUID before saving and confirming its retry', async () => {
		const uppercase = requestKey.toUpperCase();
		expect((await POST(event(body({ request_key: uppercase })))).status).toBe(200);
		expect(insert).toHaveBeenCalledWith(expect.objectContaining({ request_key: requestKey }));
		expect(feedbackQuery.eq).toHaveBeenCalledWith('request_key', requestKey);
		insert.mockClear();
		feedbackRead.mockReset().mockResolvedValue({ data: row, error: null });
		expect((await POST(event(body({ request_key: uppercase })))).status).toBe(200);
		expect(insert).not.toHaveBeenCalled();
	});
	it.each(['request_key', 'preparation_id', 'owner_id', 'reading_digest', 'decision', 'comment'])(
		'rejects a reused key with a different %s',
		async (field) => {
			feedbackRead
				.mockReset()
				.mockResolvedValue({ data: { ...row, [field]: 'conflicting-value' }, error: null });
			await expect(POST(event())).rejects.toMatchObject({ status: 409 });
			expect(insert).not.toHaveBeenCalled();
		}
	);
	it('confirms the winner of a same-payload unique race', async () => {
		insert.mockResolvedValue({ error: { code: '23505' } });
		expect((await POST(event())).status).toBe(200);
		expect(insert).toHaveBeenCalledTimes(1);
	});
	it('refuses the winner of a different-payload race', async () => {
		insert.mockResolvedValue({ error: { code: '23505' } });
		feedbackRead
			.mockReset()
			.mockResolvedValueOnce({ data: null, error: null })
			.mockResolvedValue({ data: { ...row, decision: 'rejected' }, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 409 });
	});
	it('does not report success when the write fails', async () => {
		insert.mockResolvedValue({ error: { code: '08006' } });
		await expect(POST(event())).rejects.toMatchObject({ status: 503 });
	});
	it('does not report success when a written record is hidden by RLS', async () => {
		feedbackRead.mockReset().mockResolvedValue({ data: null, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 503 });
	});
	it.each([1, 2])('does not report success on feedback read failure %s', async (readNumber) => {
		feedbackRead.mockReset();
		if (readNumber === 2) feedbackRead.mockResolvedValueOnce({ data: null, error: null });
		feedbackRead.mockResolvedValue({ data: null, error: { code: '08006' } });
		await expect(POST(event())).rejects.toMatchObject({ status: 503 });
		if (readNumber === 1) expect(insert).not.toHaveBeenCalled();
	});
	it('blocks a grant revoked before writing', async () => {
		client.rpc
			.mockReset()
			.mockResolvedValueOnce({ data: true, error: null })
			.mockResolvedValueOnce({ data: true, error: null })
			.mockResolvedValue({ data: false, error: null });
		await expect(POST(event())).rejects.toMatchObject({ status: 403 });
		expect(insert).not.toHaveBeenCalled();
	});
	it('does not acknowledge feedback after a grant is revoked during writing', async () => {
		insert.mockImplementation(async () => {
			client.rpc.mockResolvedValue({ data: false, error: null });
			return { error: null };
		});
		await expect(POST(event())).rejects.toMatchObject({ status: 403 });
	});
	it('accepts and normalizes a substantive rejection reason', async () => {
		feedbackRead
			.mockReset()
			.mockResolvedValueOnce({ data: null, error: null })
			.mockResolvedValue({
				data: { ...row, decision: 'rejected', comment: 'Quero mais clareza no próximo passo.' },
				error: null
			});
		expect(
			(
				await POST(
					event(body({ decision: 'rejected', comment: '  Quero mais clareza no próximo passo.  ' }))
				)
			).status
		).toBe(200);
		expect(insert.mock.calls[0][0].comment).toBe('Quero mais clareza no próximo passo.');
	});
});
