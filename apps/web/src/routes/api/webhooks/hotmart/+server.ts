import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { parseHotmartNotification, sha256Hex, verifyHotmartHottok } from '@atv/integrations';
import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	if (privateEnv.FEATURE_HOTMART_LIVE !== 'true')
		return json({ accepted: false, code: 'integration_disabled' }, { status: 503 });
	const hottok = request.headers.get('x-hotmart-hottok') ?? request.headers.get('hottok');
	if (!(await verifyHotmartHottok(hottok, privateEnv.HOTMART_HOTTOK ?? '')))
		return json({ accepted: false, code: 'invalid_signature' }, { status: 401 });

	const raw = await request.text();
	let payload: unknown;
	try {
		payload = JSON.parse(raw);
	} catch {
		return json({ accepted: false, code: 'invalid_json' }, { status: 400 });
	}
	const notification = parseHotmartNotification(payload);
	if (!notification) return json({ accepted: false, code: 'invalid_payload' }, { status: 400 });

	const key = publicEnv.PUBLIC_SUPABASE_URL;
	const serviceRole = privateEnv.SUPABASE_SERVICE_ROLE_KEY;
	if (!key || !serviceRole)
		return json({ accepted: false, code: 'storage_unavailable' }, { status: 503 });
	const supabase = createClient(key, serviceRole, { auth: { persistSession: false } });
	const { error } = await supabase.from('webhook_inbox').upsert(
		{
			provider: 'hotmart',
			external_event_id: notification.id,
			event_type: notification.event,
			signature_verified: true,
			payload_hash: await sha256Hex(raw),
			payload,
			processing_state: 'RECEIVED'
		},
		{ onConflict: 'provider,external_event_id', ignoreDuplicates: true }
	);
	if (error) return json({ accepted: false, code: 'storage_error' }, { status: 503 });
	return json({ accepted: true }, { status: 202 });
};
