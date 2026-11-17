import { createClient } from '@supabase/supabase-js';
import { fail, type RequestEvent } from '@sveltejs/kit';
import { trialServiceBindings } from './runtime-bindings';

const emailPattern = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u;
const consentVersion = 'revista-boletim-v1';

export async function subscribeToMagazineBulletin(event: RequestEvent) {
	const form = await event.request.formData();
	if (form.get('website')) return { bulletin: 'received' as const };

	const input = form.get('email');
	const email = typeof input === 'string' ? input.trim().toLowerCase() : '';
	if (email.length > 254 || !emailPattern.test(email)) {
		return fail(400, { bulletin: 'invalid-email' as const });
	}
	if (form.get('consent') !== 'yes') {
		return fail(400, { bulletin: 'missing-consent' as const });
	}

	const { url, serviceRoleKey } = trialServiceBindings(event);
	if (!url || !serviceRoleKey?.trim()) {
		return fail(503, { bulletin: 'unavailable' as const });
	}
	const client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
	const { error } = await client
		.from('magazine_bulletin_signups')
		.upsert(
			{ email, consent_version: consentVersion },
			{ onConflict: 'email', ignoreDuplicates: true }
		);
	if (error) return fail(503, { bulletin: 'unavailable' as const });
	return { bulletin: 'received' as const };
}
