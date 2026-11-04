import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import {
	isWhatsAppWebhookSignature,
	normalizeWhatsAppWebhookEvents,
	readWhatsAppWebhookBody,
	verifyWhatsAppWebhookChallenge,
	verifyWhatsAppWebhookSignature,
	WhatsAppWebhookError
} from '$lib/server/whatsapp-webhook';
import { extractWhatsAppInboundMessages } from '$lib/server/whatsapp-webhook';
import { loadConsultationCatalogue } from '$lib/server/whatsapp-catalogue';
import { commercialCheckoutEnabled } from '$lib/server/atv-plus-commercial-page';
import {
	createCloudApiConsultationSender,
	createConsultationStore,
	handleConsultationMessage
} from '$lib/server/whatsapp-commercial';
import type { RequestHandler } from './$types';

const headers = {
	'cache-control': 'no-store',
	'referrer-policy': 'no-referrer',
	'x-content-type-options': 'nosniff',
	'x-robots-tag': 'noindex, nofollow'
};

function setting(event: Parameters<RequestHandler>[0], key: string): string {
	const bindings = event.platform?.env as unknown as Record<string, unknown> | undefined;
	if (typeof bindings?.[key] === 'string') return bindings[key];
	if (key === 'PUBLIC_SUPABASE_URL') return publicEnv.PUBLIC_SUPABASE_URL ?? '';
	return (privateEnv as Record<string, string | undefined>)[key] ?? '';
}

function reject(code: string, status: number): Response {
	return json({ accepted: false, code }, { status, headers });
}

export const GET: RequestHandler = async (event) => {
	if (setting(event, 'FEATURE_WHATSAPP_WEBHOOK') !== 'true')
		return reject('integration_disabled', 503);
	const verifyToken = setting(event, 'WHATSAPP_WEBHOOK_VERIFY_TOKEN');
	if (verifyToken.length < 16 || verifyToken.length > 512)
		return reject('configuration_unavailable', 503);
	try {
		const challenge = await verifyWhatsAppWebhookChallenge(event.url, verifyToken);
		return new Response(challenge, {
			status: 200,
			headers: { ...headers, 'content-type': 'text/plain; charset=utf-8' }
		});
	} catch (error) {
		return error instanceof WhatsAppWebhookError
			? reject(error.code, error.status)
			: reject('verification_unavailable', 503);
	}
};

export const POST: RequestHandler = async (event) => {
	if (setting(event, 'FEATURE_WHATSAPP_WEBHOOK') !== 'true')
		return reject('integration_disabled', 503);
	const appSecret = setting(event, 'WHATSAPP_APP_SECRET');
	const wabaId = setting(event, 'WHATSAPP_WABA_ID');
	const phoneNumberId = setting(event, 'WHATSAPP_PHONE_NUMBER_ID');
	if (appSecret.length < 16 || !/^\d{1,32}$/.test(wabaId) || !/^\d{1,32}$/.test(phoneNumberId))
		return reject('configuration_unavailable', 503);
	const signature = event.request.headers.get('x-hub-signature-256');
	if (!isWhatsAppWebhookSignature(signature)) return reject('invalid_signature', 401);
	try {
		const raw = await readWhatsAppWebhookBody(event.request);
		if (!(await verifyWhatsAppWebhookSignature(raw, signature, appSecret)))
			return reject('invalid_signature', 401);
		const rows = await normalizeWhatsAppWebhookEvents(raw, { wabaId, phoneNumberId });
		const messages = await extractWhatsAppInboundMessages(raw, { wabaId, phoneNumberId });
		const url = setting(event, 'PUBLIC_SUPABASE_URL');
		const serviceRole = setting(event, 'SUPABASE_SERVICE_ROLE_KEY');
		if (!url || !serviceRole) return reject('storage_unavailable', 503);
		const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });
		for (const row of rows) {
			const { error } = await supabase.from('webhook_inbox').upsert(row, {
				onConflict: 'provider,external_event_id',
				ignoreDuplicates: true
			});
			if (error) return reject('storage_error', 503);
			const { data: stored, error: readError } = await supabase
				.from('webhook_inbox')
				.select('event_type,payload_hash')
				.eq('provider', 'whatsapp')
				.eq('external_event_id', row.external_event_id)
				.single();
			if (readError || !stored) return reject('storage_error', 503);
			if (stored.event_type !== row.event_type || stored.payload_hash !== row.payload_hash)
				return reject('event_id_conflict', 409);
		}
		if (messages.length && setting(event, 'FEATURE_WHATSAPP_CONSULTATION') === 'true') {
			const verifiedAt = Date.parse(setting(event, 'WHATSAPP_CONSULTATION_VERIFIED_AT'));
			const subjectSecret = setting(event, 'WHATSAPP_CONSULTATION_SUBJECT_SECRET');
			const accessToken = setting(event, 'WHATSAPP_ACCESS_TOKEN');
			const graphVersion = setting(event, 'WHATSAPP_GRAPH_VERSION');
			if (
				setting(event, 'AUTOMATIC_SPEND_CAP_BRL') !== '0' ||
				setting(event, 'WHATSAPP_CONSULTATION_FREE_REPLY_VERIFIED') !== 'true' ||
				!Number.isFinite(verifiedAt) ||
				verifiedAt > Date.now() ||
				Date.now() - verifiedAt > 7 * 86_400_000 ||
				subjectSecret.length < 32 ||
				!accessToken ||
				!/^v\d{2,3}\.0$/.test(graphVersion)
			)
				return reject('consultation_configuration_unavailable', 503);
			const store = createConsultationStore(supabase);
			const sender = createCloudApiConsultationSender({ accessToken, phoneNumberId, graphVersion });
			const catalogue = await loadConsultationCatalogue({
				client: supabase,
				checkoutEnabled: commercialCheckoutEnabled(event.platform),
				verifiedFreeToolIds: setting(event, 'WHATSAPP_CONSULTATION_VERIFIED_FREE_TOOLS')
					.split(',')
					.map((id) => id.trim())
					.filter(Boolean)
			});
			for (const message of messages.sort((a, b) => a.timestamp - b.timestamp)) {
				const result = await handleConsultationMessage({
					message,
					subjectSecret,
					phoneNumberId,
					store,
					sender,
					catalogue
				});
				if (result === 'busy') return reject('conversation_busy', 503);
			}
		}
		// Only acknowledge after all events are durable. A failed partial batch can be replayed safely.
		return json({ accepted: true, eventCount: rows.length }, { status: 200, headers });
	} catch (error) {
		return error instanceof WhatsAppWebhookError
			? reject(error.code, error.status)
			: reject('storage_error', 503);
	}
};
