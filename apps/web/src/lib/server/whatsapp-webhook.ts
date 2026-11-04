const encoder = new TextEncoder();

export const WHATSAPP_WEBHOOK_MAX_BODY_BYTES = 1024 * 1024;
export const WHATSAPP_WEBHOOK_MAX_EVENTS = 100;

type WebhookErrorCode =
	| 'invalid_challenge'
	| 'invalid_verify_token'
	| 'payload_too_large'
	| 'invalid_json'
	| 'invalid_payload'
	| 'unexpected_account'
	| 'event_id_conflict';

export class WhatsAppWebhookError extends Error {
	constructor(
		readonly code: WebhookErrorCode,
		readonly status: number
	) {
		super(code);
	}
}

export interface WhatsAppWebhookIdentity {
	wabaId: string;
	phoneNumberId: string;
}

export interface WhatsAppWebhookInboxRow {
	provider: 'whatsapp';
	external_event_id: string;
	event_type: string;
	signature_verified: true;
	payload_hash: string;
	payload: {
		version: 1;
		receiverOnly: true;
		kind: 'message' | 'status';
		wabaId: string;
		phoneNumberId: string;
		messageIdSHA256: string;
		timestamp: string;
		type: string;
		eventSHA256: string;
		rawBodySHA256: string;
		errorCodes: number[];
	};
	processing_state: 'RECEIVED';
}

function invalidPayload(): never {
	throw new WhatsAppWebhookError('invalid_payload', 400);
}

function object(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return invalidPayload();
	return value as Record<string, unknown>;
}

function nonempty(value: unknown, max = 512): string {
	if (typeof value !== 'string' || !value.trim() || value.length > max) return invalidPayload();
	return value;
}

function digits(value: unknown): string {
	const result = nonempty(value, 32);
	if (!/^\d+$/.test(result)) return invalidPayload();
	return result;
}

function eventType(value: unknown): string {
	const result = nonempty(value, 64);
	if (!/^[a-z][a-z0-9_]*$/.test(result)) return invalidPayload();
	return result;
}

function list(value: unknown, required = false): unknown[] {
	if (value === undefined && !required) return [];
	if (!Array.isArray(value) || value.length > WHATSAPP_WEBHOOK_MAX_EVENTS) return invalidPayload();
	if (required && !value.length) return invalidPayload();
	return value;
}

// Hash one event, rather than its delivery batch: Meta can rebatch identical events.
function canonicalJSON(value: unknown, depth = 0): string {
	if (depth > 32) return invalidPayload();
	if (value === null || typeof value === 'string' || typeof value === 'boolean')
		return JSON.stringify(value);
	if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
	if (Array.isArray(value))
		return `[${value.map((item) => canonicalJSON(item, depth + 1)).join(',')}]`;
	const record = object(value);
	return `{${Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalJSON(record[key], depth + 1)}`)
		.join(',')}}`;
}

async function sha256(value: string | Uint8Array<ArrayBuffer>): Promise<string> {
	const bytes = typeof value === 'string' ? encoder.encode(value) : value;
	const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
	return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyWhatsAppWebhookChallenge(
	url: URL,
	expectedToken: string
): Promise<string> {
	for (const key of ['hub.mode', 'hub.verify_token', 'hub.challenge']) {
		if (url.searchParams.getAll(key).length !== 1)
			throw new WhatsAppWebhookError('invalid_challenge', 400);
	}
	const supplied = url.searchParams.get('hub.verify_token') ?? '';
	const challenge = url.searchParams.get('hub.challenge') ?? '';
	if (
		url.searchParams.get('hub.mode') !== 'subscribe' ||
		!challenge ||
		challenge.length > 256 ||
		!supplied ||
		supplied.length > 512
	)
		throw new WhatsAppWebhookError('invalid_challenge', 400);
	// Compare fixed-size digests without an early return on the first differing byte.
	const actualHash = new Uint8Array(
		await crypto.subtle.digest('SHA-256', encoder.encode(supplied))
	);
	const expectedHash = new Uint8Array(
		await crypto.subtle.digest('SHA-256', encoder.encode(expectedToken))
	);
	let difference = 0;
	for (let index = 0; index < actualHash.length; index++)
		difference |= actualHash[index] ^ expectedHash[index];
	if (!expectedToken || difference !== 0)
		throw new WhatsAppWebhookError('invalid_verify_token', 403);
	return challenge;
}

export function isWhatsAppWebhookSignature(value: string | null): value is string {
	return value !== null && /^sha256=[a-fA-F0-9]{64}$/.test(value);
}

export async function readWhatsAppWebhookBody(request: Request): Promise<Uint8Array<ArrayBuffer>> {
	const length = request.headers.get('content-length');
	if (length && /^\d+$/.test(length) && Number(length) > WHATSAPP_WEBHOOK_MAX_BODY_BYTES)
		throw new WhatsAppWebhookError('payload_too_large', 413);
	const reader = request.body?.getReader();
	if (!reader) return new Uint8Array(0);
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > WHATSAPP_WEBHOOK_MAX_BODY_BYTES) {
				await reader.cancel().catch(() => undefined);
				throw new WhatsAppWebhookError('payload_too_large', 413);
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const result = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return result;
}

export async function verifyWhatsAppWebhookSignature(
	raw: Uint8Array<ArrayBuffer>,
	signature: string | null,
	appSecret: string
): Promise<boolean> {
	if (!appSecret || !isWhatsAppWebhookSignature(signature)) return false;
	const signedBytes = new Uint8Array(32);
	for (let index = 0; index < signedBytes.length; index++)
		signedBytes[index] = Number.parseInt(signature.slice(7 + index * 2, 9 + index * 2), 16);
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(appSecret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['verify']
	);
	// WebCrypto performs the HMAC verification over the original bytes.
	return crypto.subtle.verify('HMAC', key, signedBytes, raw);
}

export async function normalizeWhatsAppWebhookEvents(
	raw: Uint8Array<ArrayBuffer>,
	identity: WhatsAppWebhookIdentity
): Promise<WhatsAppWebhookInboxRow[]> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
	} catch {
		throw new WhatsAppWebhookError('invalid_json', 400);
	}
	const root = object(parsed);
	if (root.object !== 'whatsapp_business_account') return invalidPayload();
	const rawBodySHA256 = await sha256(raw);
	const rows = new Map<string, WhatsAppWebhookInboxRow>();
	let eventCount = 0;
	for (const entryValue of list(root.entry, true)) {
		const entry = object(entryValue);
		if (digits(entry.id) !== identity.wabaId)
			throw new WhatsAppWebhookError('unexpected_account', 403);
		for (const changeValue of list(entry.changes, true)) {
			const change = object(changeValue);
			if (change.field !== 'messages') return invalidPayload();
			const value = object(change.value);
			if (value.messaging_product !== 'whatsapp') return invalidPayload();
			if (digits(object(value.metadata).phone_number_id) !== identity.phoneNumberId)
				throw new WhatsAppWebhookError('unexpected_account', 403);
			const messages = list(value.messages);
			const statuses = list(value.statuses);
			if (!messages.length && !statuses.length) return invalidPayload();
			for (const [kind, events] of [
				['message', messages],
				['status', statuses]
			] as const) {
				for (const item of events) {
					if (++eventCount > WHATSAPP_WEBHOOK_MAX_EVENTS) return invalidPayload();
					const event = object(item);
					const id = nonempty(event.id);
					const timestamp = digits(event.timestamp);
					const type = eventType(kind === 'message' ? event.type : event.status);
					digits(kind === 'message' ? event.from : event.recipient_id);
					const eventSHA256 = await sha256(canonicalJSON(event));
					const externalId = await sha256(
						canonicalJSON([
							'whatsapp-inbox-v1',
							identity.wabaId,
							identity.phoneNumberId,
							kind,
							id,
							...(kind === 'status' ? [type, timestamp] : [])
						])
					);
					const errorCodes = list(event.errors).map((error) => {
						const code = object(error).code;
						if (typeof code !== 'number' || !Number.isSafeInteger(code) || code < 0)
							return invalidPayload();
						return code;
					});
					const payloadHash = await sha256(
						canonicalJSON({
							wabaId: identity.wabaId,
							phoneNumberId: identity.phoneNumberId,
							kind,
							eventSHA256
						})
					);
					const row: WhatsAppWebhookInboxRow = {
						provider: 'whatsapp',
						external_event_id: externalId,
						event_type: `whatsapp.${kind}.${type}`,
						signature_verified: true,
						payload_hash: payloadHash,
						payload: {
							version: 1,
							receiverOnly: true,
							kind,
							wabaId: identity.wabaId,
							phoneNumberId: identity.phoneNumberId,
							messageIdSHA256: await sha256(canonicalJSON(['whatsapp-message-v1', id])),
							timestamp,
							type,
							eventSHA256,
							rawBodySHA256,
							errorCodes
						},
						processing_state: 'RECEIVED'
					};
					const previous = rows.get(externalId);
					if (previous && previous.payload_hash !== payloadHash)
						throw new WhatsAppWebhookError('event_id_conflict', 409);
					rows.set(externalId, row);
				}
			}
		}
	}
	return [...rows.values()];
}

// Request-scoped only: do not persist, return in HTTP responses, or log these fields.
export interface WhatsAppInboundMessage {
	externalEventId: string;
	from: string;
	timestamp: number;
	text: string | null;
}

export async function extractWhatsAppInboundMessages(
	raw: Uint8Array<ArrayBuffer>,
	identity: WhatsAppWebhookIdentity
): Promise<WhatsAppInboundMessage[]> {
	// Reuse all identity, size and event validation; callers must verify HMAC first.
	await normalizeWhatsAppWebhookEvents(raw, identity);
	const root = JSON.parse(new TextDecoder().decode(raw));
	const messages = new Map<string, WhatsAppInboundMessage>();
	for (const entry of root.entry) {
		for (const change of entry.changes) {
			for (const event of change.value.messages ?? []) {
				const timestamp = Number(event.timestamp);
				if (!Number.isSafeInteger(timestamp) || timestamp < 0) return invalidPayload();
				const externalEventId = await sha256(
					canonicalJSON([
						'whatsapp-inbox-v1',
						identity.wabaId,
						identity.phoneNumberId,
						'message',
						event.id
					])
				);
				const text = event.type === 'text' ? nonempty(object(event.text).body, 4096) : null;
				messages.set(externalEventId, { externalEventId, from: event.from, timestamp, text });
			}
		}
	}
	return [...messages.values()];
}
