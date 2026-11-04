import { createHmac } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';
import {
	normalizeWhatsAppWebhookEvents,
	WHATSAPP_WEBHOOK_MAX_BODY_BYTES
} from '$lib/server/whatsapp-webhook';
import { GET, POST } from './+server';

const mocks = vi.hoisted(() => ({
	env: {} as Record<string, string>,
	publicEnv: {} as Record<string, string>,
	createClient: vi.fn(),
	from: vi.fn(),
	upsert: vi.fn(),
	select: vi.fn(),
	rpc: vi.fn(),
	query: { eq: vi.fn(), single: vi.fn() }
}));

vi.mock('$env/dynamic/private', () => ({ env: mocks.env }));
vi.mock('$env/dynamic/public', () => ({ env: mocks.publicEnv }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));

const appSecret = 'synthetic-app-secret-never-a-real-credential';
const verifyToken = 'synthetic-verify-token-never-a-real-credential';
const baseEnv = {
	FEATURE_WHATSAPP_WEBHOOK: 'true',
	WHATSAPP_APP_SECRET: appSecret,
	WHATSAPP_WEBHOOK_VERIFY_TOKEN: verifyToken,
	WHATSAPP_WABA_ID: '100000000000001',
	WHATSAPP_PHONE_NUMBER_ID: '100000000000002',
	PUBLIC_SUPABASE_URL: 'https://synthetic.example',
	SUPABASE_SERVICE_ROLE_KEY: 'synthetic-role'
};
const identity = {
	wabaId: baseEnv.WHATSAPP_WABA_ID,
	phoneNumberId: baseEnv.WHATSAPP_PHONE_NUMBER_ID
};
const message = {
	id: 'wamid.synthetic.message.1',
	from: '15550000001',
	timestamp: '1791806400',
	type: 'text',
	text: { body: 'Synthetic private text — must never be stored or returned.' }
};
const status = {
	id: 'wamid.synthetic.outbound.1',
	recipient_id: '15550000001',
	timestamp: '1791806401',
	status: 'failed',
	errors: [{ code: 130497, title: 'Synthetic restricted delivery.' }]
};

function batch(messages: unknown[] = [message], statuses: unknown[] = []) {
	return {
		object: 'whatsapp_business_account',
		entry: [
			{
				id: identity.wabaId,
				changes: [
					{
						field: 'messages',
						value: {
							messaging_product: 'whatsapp',
							metadata: {
								phone_number_id: identity.phoneNumberId,
								display_phone_number: '15550000002'
							},
							contacts: [{ profile: { name: 'Synthetic private name' }, wa_id: message.from }],
							messages,
							statuses
						}
					}
				]
			}
		]
	};
}

function sign(raw: string | Uint8Array, secret = appSecret): string {
	return `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
}

function postEvent(
	payload: unknown = batch(),
	options: {
		signature?: string | null;
		raw?: string | Uint8Array;
		contentLength?: string;
		bindings?: Record<string, string>;
	} = {}
) {
	const raw = options.raw ?? JSON.stringify(payload);
	const headers = new Headers({ 'content-type': 'application/json' });
	const signature = options.signature === undefined ? sign(raw) : options.signature;
	if (signature !== null) headers.set('x-hub-signature-256', signature);
	if (options.contentLength) headers.set('content-length', options.contentLength);
	const request = new Request('https://synthetic.example/api/webhooks/whatsapp', {
		method: 'POST',
		headers,
		body: typeof raw === 'string' ? raw : new Uint8Array(raw).buffer
	});
	return {
		request,
		url: new URL(request.url),
		...(options.bindings ? { platform: { env: options.bindings } } : {})
	} as Parameters<typeof POST>[0];
}

function getEvent(parameters: Record<string, string> = {}, bindings?: Record<string, string>) {
	const url = new URL('https://synthetic.example/api/webhooks/whatsapp');
	url.search = new URLSearchParams({
		'hub.mode': 'subscribe',
		'hub.verify_token': verifyToken,
		'hub.challenge': 'synthetic-challenge-123',
		...parameters
	}).toString();
	return {
		url,
		request: new Request(url),
		...(bindings ? { platform: { env: bindings } } : {})
	} as Parameters<typeof GET>[0];
}

const stored = new Map<string, Record<string, unknown>>();
let selectedKey = '';

beforeEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
	for (const key of Object.keys(mocks.env)) delete mocks.env[key];
	for (const key of Object.keys(mocks.publicEnv)) delete mocks.publicEnv[key];
	for (const [key, value] of Object.entries(baseEnv)) {
		if (key.startsWith('PUBLIC_')) mocks.publicEnv[key] = value;
		else mocks.env[key] = value;
	}
	stored.clear();
	selectedKey = '';
	mocks.upsert.mockImplementation(
		async (row: Record<string, unknown>, options: { ignoreDuplicates: boolean }) => {
			const key = String(row.external_event_id);
			if (!stored.has(key) || !options.ignoreDuplicates) stored.set(key, structuredClone(row));
			return { error: null };
		}
	);
	mocks.query.eq.mockImplementation((column: string, value: string) => {
		if (column === 'external_event_id') selectedKey = value;
		return mocks.query;
	});
	mocks.query.single.mockImplementation(async () => ({
		data: stored.get(selectedKey) ?? null,
		error: null
	}));
	mocks.select.mockReturnValue(mocks.query);
	mocks.from.mockReturnValue({ upsert: mocks.upsert, select: mocks.select });
	mocks.createClient.mockReturnValue({ from: mocks.from, rpc: mocks.rpc });
});

it('echoes only a verified GET challenge as uncached plain text without storage', async () => {
	const response = await GET(getEvent());
	expect(response.status).toBe(200);
	expect(await response.text()).toBe('synthetic-challenge-123');
	expect(response.headers.get('content-type')).toContain('text/plain');
	expect(response.headers.get('cache-control')).toBe('no-store');
	expect(response.headers.get('referrer-policy')).toBe('no-referrer');
	expect(mocks.createClient).not.toHaveBeenCalled();
});

it.each([
	[{ 'hub.verify_token': 'wrong-secret' }, 403],
	[{ 'hub.mode': 'wrong-mode' }, 400],
	[{ 'hub.challenge': '' }, 400],
	[{ 'hub.challenge': 'x'.repeat(257) }, 400]
])('rejects an invalid challenge without disclosing tokens', async (parameters, expectedStatus) => {
	const response = await GET(getEvent(parameters as Record<string, string>));
	expect(response.status).toBe(expectedStatus);
	expect(await response.text()).not.toContain(verifyToken);
	expect(mocks.createClient).not.toHaveBeenCalled();
});

it('rejects duplicate challenge query parameters', async () => {
	const event = getEvent();
	event.url.searchParams.append('hub.challenge', 'second');
	expect((await GET(event)).status).toBe(400);
	expect(mocks.createClient).not.toHaveBeenCalled();
});

it.each([
	'FEATURE_WHATSAPP_WEBHOOK',
	'WHATSAPP_APP_SECRET',
	'WHATSAPP_WABA_ID',
	'WHATSAPP_PHONE_NUMBER_ID'
])('fails closed before storage when POST configuration %s is absent', async (key) => {
	delete mocks.env[key];
	const response = await POST(postEvent());
	expect(response.status).toBe(503);
	expect(mocks.createClient).not.toHaveBeenCalled();
});

it('fails closed when GET verification configuration is absent or disabled', async () => {
	delete mocks.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
	expect((await GET(getEvent())).status).toBe(503);
	mocks.env.FEATURE_WHATSAPP_WEBHOOK = 'false';
	expect((await GET(getEvent())).status).toBe(503);
	expect(mocks.createClient).not.toHaveBeenCalled();
});

it('uses runtime Cloudflare bindings ahead of local dynamic env', async () => {
	mocks.env.FEATURE_WHATSAPP_WEBHOOK = 'false';
	const response = await POST(postEvent(batch(), { bindings: { ...baseEnv } }));
	expect(response.status).toBe(200);
	expect(mocks.createClient).toHaveBeenCalledWith(baseEnv.PUBLIC_SUPABASE_URL, 'synthetic-role', {
		auth: { persistSession: false }
	});
});

it.each([null, 'sha1=invalid', 'sha256=' + '0'.repeat(64)])(
	'rejects missing, malformed or invalid HMAC without reading storage',
	async (signature) => {
		const response = await POST(postEvent(batch(), { signature }));
		expect(response.status).toBe(401);
		expect(mocks.createClient).not.toHaveBeenCalled();
	}
);

it('verifies original UTF-8 bytes rather than reconstructing signed JSON', async () => {
	const raw = JSON.stringify(batch(), null, 2);
	expect((await POST(postEvent(batch(), { raw, signature: sign(raw) }))).status).toBe(200);
	const modified = raw.replace('Synthetic private text', 'Synthetic changed text');
	expect((await POST(postEvent(batch(), { raw: modified, signature: sign(raw) }))).status).toBe(
		401
	);
	expect(mocks.upsert).toHaveBeenCalledTimes(1);
});

it.each(['{broken-json', new Uint8Array([0xff, 0xfe])])(
	'rejects signed malformed JSON or UTF-8',
	async (raw) => {
		expect((await POST(postEvent(undefined, { raw }))).status).toBe(400);
		expect(mocks.createClient).not.toHaveBeenCalled();
	}
);

it('bounds the actual body even when the claimed content length is smaller', async () => {
	const raw = 'x'.repeat(WHATSAPP_WEBHOOK_MAX_BODY_BYTES + 1);
	const response = await POST(postEvent(undefined, { raw, contentLength: '1' }));
	expect(response.status).toBe(413);
	expect(mocks.createClient).not.toHaveBeenCalled();
});

it('rejects an oversized content length before consuming its body', async () => {
	const response = await POST(
		postEvent(batch(), { contentLength: String(WHATSAPP_WEBHOOK_MAX_BODY_BYTES + 1) })
	);
	expect(response.status).toBe(413);
	expect(mocks.createClient).not.toHaveBeenCalled();
});

it.each(['waba', 'phone'])('rejects authenticated events from another %s', async (kind) => {
	const payload = batch();
	if (kind === 'waba') payload.entry[0].id = '100000000000099';
	else payload.entry[0].changes[0].value.metadata.phone_number_id = '100000000000099';
	expect((await POST(postEvent(payload))).status).toBe(403);
	expect(mocks.createClient).not.toHaveBeenCalled();
});

it('stores messages and lifecycle statuses separately, omitting text, names, numbers and raw IDs', async () => {
	const response = await POST(postEvent(batch([message], [status])));
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ accepted: true, eventCount: 2 });
	expect(stored.size).toBe(2);
	const serialized = JSON.stringify([...stored.values()]);
	for (const privateValue of [
		message.text.body,
		message.from,
		message.id,
		status.id,
		'Synthetic private name',
		'15550000002'
	])
		expect(serialized).not.toContain(privateValue);
	for (const row of stored.values()) {
		expect(Object.keys(row.payload as Record<string, unknown>).sort()).toEqual(
			[
				'errorCodes',
				'eventSHA256',
				'kind',
				'messageIdSHA256',
				'phoneNumberId',
				'rawBodySHA256',
				'receiverOnly',
				'timestamp',
				'type',
				'version',
				'wabaId'
			].sort()
		);
	}
	expect([...stored.values()].map((row) => row.event_type)).toEqual([
		'whatsapp.message.text',
		'whatsapp.status.failed'
	]);
	expect(([...stored.values()][1].payload as { errorCodes: number[] }).errorCodes).toEqual([
		130497
	]);
	expect(mocks.upsert).toHaveBeenCalledWith(
		expect.objectContaining({ provider: 'whatsapp', processing_state: 'RECEIVED' }),
		{
			onConflict: 'provider,external_event_id',
			ignoreDuplicates: true
		}
	);
});

it('preserves an existing inbox state on an identical replay and on a different delivery batch', async () => {
	expect((await POST(postEvent())).status).toBe(200);
	const firstKey = [...stored.keys()][0];
	const first = stored.get(firstKey)!;
	first.processing_state = 'PROCESSED';
	const firstHash = first.payload_hash;
	const rebatch = batch([message], [status]);
	rebatch.entry[0].changes[0].value.contacts[0].profile.name = 'Different omitted contact';
	expect((await POST(postEvent(rebatch))).status).toBe(200);
	expect(stored.size).toBe(2);
	expect(stored.get(firstKey)?.processing_state).toBe('PROCESSED');
	expect(stored.get(firstKey)?.payload_hash).toBe(firstHash);
});

function enableConsultation() {
	Object.assign(mocks.env, {
		FEATURE_WHATSAPP_CONSULTATION: 'true',
		AUTOMATIC_SPEND_CAP_BRL: '0',
		WHATSAPP_CONSULTATION_FREE_REPLY_VERIFIED: 'true',
		WHATSAPP_CONSULTATION_VERIFIED_AT: new Date().toISOString(),
		WHATSAPP_CONSULTATION_SUBJECT_SECRET: 'synthetic-subject-secret-not-a-real-credential',
		WHATSAPP_ACCESS_TOKEN: 'synthetic-access-token-not-a-real-credential',
		WHATSAPP_GRAPH_VERSION: 'v24.0',
		WHATSAPP_CONSULTATION_VERIFIED_FREE_TOOLS: 'ascendente'
	});
}

it('keeps inbound durable but fails closed when free response authorization is missing', async () => {
	enableConsultation();
	delete mocks.env.WHATSAPP_CONSULTATION_FREE_REPLY_VERIFIED;
	const request = vi.fn();
	vi.stubGlobal('fetch', request);
	const response = await POST(postEvent());
	expect(response.status).toBe(503);
	expect(await response.json()).toEqual({
		accepted: false,
		code: 'consultation_configuration_unavailable'
	});
	expect(stored.size).toBe(1);
	expect(mocks.rpc).not.toHaveBeenCalled();
	expect(request).not.toHaveBeenCalled();
});

it('statuses never trigger a commercial reply, even when the responder is enabled', async () => {
	enableConsultation();
	delete mocks.env.WHATSAPP_CONSULTATION_FREE_REPLY_VERIFIED;
	const request = vi.fn();
	vi.stubGlobal('fetch', request);
	expect((await POST(postEvent(batch([], [status])))).status).toBe(200);
	expect(mocks.rpc).not.toHaveBeenCalled();
	expect(request).not.toHaveBeenCalled();
});

it('claims after durable inbox, sends one real-adapter text and suppresses delivery replays', async () => {
	enableConsultation();
	const currentMessage = {
		...message,
		timestamp: String(Math.floor(Date.now() / 1000)),
		text: { body: 'Qual é meu ascendente?' }
	};
	const claimed = new Set<string>();
	mocks.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
		if (name === 'claim_whatsapp_consultation') {
			expect(stored.has(String(args.p_event_id))).toBe(true);
			if (claimed.has(String(args.p_event_id)))
				return { data: { result: 'duplicate' }, error: null };
			claimed.add(String(args.p_event_id));
			return { data: { result: 'claimed', state: { step: 'menu' } }, error: null };
		}
		return { data: null, error: null };
	});
	const request = vi.fn(async () => Response.json({ messages: [{ id: 'wamid.synthetic.reply' }] }));
	vi.stubGlobal('fetch', request);
	expect((await POST(postEvent(batch([currentMessage])))).status).toBe(200);
	expect((await POST(postEvent(batch([currentMessage])))).status).toBe(200);
	expect(request).toHaveBeenCalledTimes(1);
	expect(
		mocks.rpc.mock.calls.filter(([name]) => name === 'complete_whatsapp_consultation')
	).toHaveLength(1);
	const durable = JSON.stringify({ inbox: [...stored.values()], rpc: mocks.rpc.mock.calls });
	for (const value of [
		message.from,
		currentMessage.text.body,
		'Synthetic private name',
		'wamid.synthetic.reply'
	])
		expect(durable).not.toContain(value);
});

it('does not collapse sent and delivered statuses for the same message ID', async () => {
	const statuses = [
		{ ...status, status: 'sent', errors: [] },
		{ ...status, status: 'delivered', timestamp: '1791806402', errors: [] }
	];
	expect((await POST(postEvent(batch([], statuses)))).status).toBe(200);
	expect(stored.size).toBe(2);
});

it('rejects a reused message ID with changed content without overwriting the durable event', async () => {
	expect((await POST(postEvent())).status).toBe(200);
	const before = JSON.stringify([...stored.values()]);
	const changed = { ...message, text: { body: 'different synthetic private text' } };
	const response = await POST(postEvent(batch([changed])));
	expect(response.status).toBe(409);
	expect(await response.json()).toEqual({ accepted: false, code: 'event_id_conflict' });
	expect(JSON.stringify([...stored.values()])).toBe(before);
});

it('rejects conflicting duplicate IDs within a batch before any storage', async () => {
	const changed = { ...message, text: { body: 'another synthetic body' } };
	expect((await POST(postEvent(batch([message, changed])))).status).toBe(409);
	expect(mocks.createClient).not.toHaveBeenCalled();
});

it('canonicalizes object key order for event-level hashes', async () => {
	const reversed = Object.fromEntries(Object.entries(message).reverse());
	const bytes = (payload: unknown) => new TextEncoder().encode(JSON.stringify(payload));
	const first = await normalizeWhatsAppWebhookEvents(bytes(batch()), identity);
	const second = await normalizeWhatsAppWebhookEvents(bytes(batch([reversed])), identity);
	expect(second[0].payload_hash).toBe(first[0].payload_hash);
	expect(second[0].external_event_id).toBe(first[0].external_event_id);
	expect(second[0].payload.rawBodySHA256).not.toBe(first[0].payload.rawBodySHA256);
});

it.each([
	batch([], []),
	batch([{ ...message, from: 'not-a-number' }]),
	batch([{ ...message, timestamp: 'not-a-timestamp' }]),
	batch([{ ...message, id: '' }]),
	batch(Array.from({ length: 101 }, () => message))
])('rejects malformed or unbounded events before storage', async (payload) => {
	expect((await POST(postEvent(payload))).status).toBe(400);
	expect(mocks.createClient).not.toHaveBeenCalled();
});

it('does not acknowledge storage failures and safely replays a partially stored batch', async () => {
	const normalUpsert = mocks.upsert.getMockImplementation()!;
	mocks.upsert
		.mockImplementationOnce(normalUpsert)
		.mockResolvedValueOnce({ error: { message: 'synthetic storage failure' } });
	const payload = batch([message], [status]);
	expect((await POST(postEvent(payload))).status).toBe(503);
	expect(stored.size).toBe(1);
	expect((await POST(postEvent(payload))).status).toBe(200);
	expect(stored.size).toBe(2);
});

it('requires durable readback before acknowledging and returns only fixed errors', async () => {
	mocks.query.single.mockResolvedValueOnce({
		data: null,
		error: { message: appSecret + message.from }
	});
	const response = await POST(postEvent());
	expect(response.status).toBe(503);
	expect(await response.json()).toEqual({ accepted: false, code: 'storage_error' });
});

it('has no outbound provider calls or raw payload logging', async () => {
	const fetch = vi
		.spyOn(globalThis, 'fetch')
		.mockRejectedValue(new Error('unexpected outbound request'));
	const log = vi.spyOn(console, 'log');
	const error = vi.spyOn(console, 'error');
	try {
		expect((await POST(postEvent())).status).toBe(200);
		expect(fetch).not.toHaveBeenCalled();
		expect(log).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
	} finally {
		fetch.mockRestore();
		log.mockRestore();
		error.mockRestore();
	}
});
