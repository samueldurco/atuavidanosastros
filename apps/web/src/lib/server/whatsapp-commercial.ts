import type { ConsultationState, ConsultationCatalogue } from './whatsapp-consultation';
import { replyToConsultation } from './whatsapp-consultation';
import type { WhatsAppInboundMessage } from './whatsapp-webhook';

export interface ConsultationStore {
	claim(
		eventId: string,
		subjectKey: string,
		timestamp: number
	): Promise<{
		result: 'claimed' | 'duplicate' | 'busy' | 'skipped';
		state?: ConsultationState;
	}>;
	complete(input: {
		eventId: string;
		subjectKey: string;
		outcome: 'SENT' | 'FAILED' | 'NEEDS_RECONCILIATION';
		state: ConsultationState;
		intent: string;
		productId?: string;
		providerMessageHash?: string;
	}): Promise<void>;
}

export interface ConsultationSender {
	send(
		to: string,
		reply: string
	): Promise<
		| { outcome: 'SENT'; providerMessageHash: string }
		| { outcome: 'FAILED' | 'NEEDS_RECONCILIATION' }
	>;
}

const bytes = new TextEncoder();
function hex(value: ArrayBuffer): string {
	return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function consultationSubjectKey(secret: string, phoneNumberId: string, from: string) {
	if (secret.length < 32 || !/^\d{1,32}$/.test(phoneNumberId) || !/^\d{1,32}$/.test(from))
		throw new Error('invalid_subject_configuration');
	const key = await crypto.subtle.importKey(
		'raw',
		bytes.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return hex(
		await crypto.subtle.sign(
			'HMAC',
			key,
			bytes.encode(JSON.stringify(['p06-subject-v1', phoneNumberId, from]))
		)
	);
}

export function createCloudApiConsultationSender(config: {
	accessToken: string;
	phoneNumberId: string;
	graphVersion: string;
	fetch?: typeof fetch;
}): ConsultationSender {
	if (
		!config.accessToken ||
		!/^\d{1,32}$/.test(config.phoneNumberId) ||
		!/^v\d{2,3}\.0$/.test(config.graphVersion)
	)
		throw new Error('invalid_sender_configuration');
	return {
		async send(to, reply) {
			if (!/^\d{1,32}$/.test(to) || !reply.trim() || reply.length > 4096)
				return { outcome: 'FAILED' };
			try {
				const response = await (config.fetch ?? fetch)(
					`https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`,
					{
						method: 'POST',
						redirect: 'error',
						signal: AbortSignal.timeout(10_000),
						headers: {
							authorization: `Bearer ${config.accessToken}`,
							'content-type': 'application/json'
						},
						body: JSON.stringify({
							messaging_product: 'whatsapp',
							recipient_type: 'individual',
							to,
							type: 'text',
							text: { preview_url: false, body: reply }
						})
					}
				);
				// Never retain provider payloads: they can contain recipient IDs and private data.
				if (!response.ok)
					return {
						outcome:
							response.status >= 400 && response.status < 500 ? 'FAILED' : 'NEEDS_RECONCILIATION'
					};
				const payload: unknown = await response.json();
				const value = payload as { messages?: { id?: unknown }[] };
				const id = value?.messages?.[0]?.id;
				if (typeof id !== 'string' || !id || id.length > 512)
					return { outcome: 'NEEDS_RECONCILIATION' };
				return {
					outcome: 'SENT',
					providerMessageHash: hex(await crypto.subtle.digest('SHA-256', bytes.encode(id)))
				};
			} catch {
				// A timeout or an invalid provider response may happen after delivery.
				return { outcome: 'NEEDS_RECONCILIATION' };
			}
		}
	};
}

export async function handleConsultationMessage(input: {
	message: WhatsAppInboundMessage;
	subjectSecret: string;
	phoneNumberId: string;
	store: ConsultationStore;
	sender: ConsultationSender;
	catalogue: ConsultationCatalogue;
	now?: number;
}): Promise<'sent' | 'duplicate' | 'busy' | 'skipped' | 'failed' | 'needs_reconciliation'> {
	const now = input.now ?? Date.now();
	const subjectKey = await consultationSubjectKey(
		input.subjectSecret,
		input.phoneNumberId,
		input.message.from
	);
	const claim = await input.store.claim(
		input.message.externalEventId,
		subjectKey,
		input.message.timestamp
	);
	if (claim.result !== 'claimed') return claim.result;
	// DB enforces the same window atomically; also guard immediately before any outbound request.
	if (
		input.message.timestamp * 1000 < now - 24 * 60 * 60 * 1000 ||
		input.message.timestamp * 1000 > now + 60_000
	) {
		await input.store.complete({
			eventId: input.message.externalEventId,
			subjectKey,
			outcome: 'FAILED',
			state: { step: 'menu' },
			intent: 'outside_response_window'
		});
		return 'skipped';
	}
	let result: ReturnType<typeof replyToConsultation>;
	try {
		result =
			input.message.text === null
				? {
						reply:
							'Sou a assistente virtual da ATVNA. Para esta orientação gratuita, envie sua dúvida em texto, sem dados de nascimento. Digite menu para ver as opções.',
						state: { step: 'question' },
						intent: 'unsupported_message'
					}
				: replyToConsultation({
						text: input.message.text,
						state: claim.state,
						catalogue: input.catalogue
					});
	} catch {
		await input.store.complete({
			eventId: input.message.externalEventId,
			subjectKey,
			outcome: 'FAILED',
			state: { step: 'menu' },
			intent: 'reply_unavailable'
		});
		return 'failed';
	}
	let sent: Awaited<ReturnType<ConsultationSender['send']>>;
	try {
		sent = await input.sender.send(input.message.from, result.reply);
	} catch {
		sent = { outcome: 'NEEDS_RECONCILIATION' };
	}
	await input.store.complete({
		eventId: input.message.externalEventId,
		subjectKey,
		outcome: sent.outcome,
		state: result.state,
		intent: result.intent,
		productId: result.productId,
		...(sent.outcome === 'SENT' ? { providerMessageHash: sent.providerMessageHash } : {})
	});
	return sent.outcome.toLowerCase() as 'sent' | 'failed' | 'needs_reconciliation';
}

interface RpcClient {
	rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

export function createConsultationStore(client: RpcClient): ConsultationStore {
	return {
		async claim(eventId, subjectKey, timestamp) {
			const { data, error } = await client.rpc('claim_whatsapp_consultation', {
				p_event_id: eventId,
				p_subject_key: subjectKey,
				p_timestamp: timestamp
			});
			if (error || !data || typeof data !== 'object')
				throw new Error('consultation_storage_unavailable');
			const value = data as { result?: unknown; state?: ConsultationState };
			if (!['claimed', 'duplicate', 'busy', 'skipped'].includes(String(value.result)))
				throw new Error('invalid_claim_result');
			return value as Awaited<ReturnType<ConsultationStore['claim']>>;
		},
		async complete(input) {
			const { error } = await client.rpc('complete_whatsapp_consultation', {
				p_event_id: input.eventId,
				p_subject_key: input.subjectKey,
				p_outcome: input.outcome,
				p_state: input.state,
				p_intent: input.intent,
				p_product_id: input.productId ?? null,
				p_provider_message_hash: input.providerMessageHash ?? null
			});
			if (error) throw new Error('consultation_storage_unavailable');
		}
	};
}
