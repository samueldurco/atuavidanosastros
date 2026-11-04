type Settings = Record<string, unknown>;

// An operational assertion is recorded only after a real inbound/reply test.
// Expiry closes stale entry links even if a page was cached before deactivation.
export function whatsappEntry(settings: Settings, now = Date.now()): string | null {
	const number = String(settings.WHATSAPP_COMMERCIAL_NUMBER ?? '');
	const verified = Date.parse(String(settings.WHATSAPP_CONSULTATION_VERIFIED_AT ?? ''));
	if (
		settings.FEATURE_WHATSAPP_WEBHOOK !== 'true' ||
		settings.FEATURE_WHATSAPP_CONSULTATION !== 'true' ||
		settings.FEATURE_WHATSAPP_PUBLIC_ENTRY !== 'true' ||
		settings.WHATSAPP_CONSULTATION_FREE_REPLY_VERIFIED !== 'true' ||
		settings.AUTOMATIC_SPEND_CAP_BRL !== '0' ||
		String(settings.WHATSAPP_APP_SECRET ?? '').length < 16 ||
		String(settings.WHATSAPP_CONSULTATION_SUBJECT_SECRET ?? '').length < 32 ||
		!/^\d{1,32}$/.test(String(settings.WHATSAPP_WABA_ID ?? '')) ||
		!/^\d{1,32}$/.test(String(settings.WHATSAPP_PHONE_NUMBER_ID ?? '')) ||
		!/^v\d{2,3}\.0$/.test(String(settings.WHATSAPP_GRAPH_VERSION ?? '')) ||
		String(settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? '').length < 16 ||
		String(settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? '').length > 512 ||
		!/^55\d{10,11}$/.test(number) ||
		!Number.isFinite(verified) ||
		verified > now ||
		now - verified > 7 * 86_400_000 ||
		![
			'WHATSAPP_ACCESS_TOKEN',
			'WHATSAPP_APP_SECRET',
			'WHATSAPP_WABA_ID',
			'WHATSAPP_PHONE_NUMBER_ID',
			'WHATSAPP_GRAPH_VERSION',
			'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
			'WHATSAPP_CONSULTATION_SUBJECT_SECRET',
			'PUBLIC_SUPABASE_URL',
			'SUPABASE_SERVICE_ROLE_KEY'
		].every((key) => typeof settings[key] === 'string' && String(settings[key]).trim().length > 0)
	)
		return null;
	const text = 'Olá! Quero conhecer a assistente virtual da ATVNA.';
	return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
