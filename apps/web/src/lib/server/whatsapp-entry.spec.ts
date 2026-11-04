import { describe, expect, it } from 'vitest';
import { whatsappEntry } from './whatsapp-entry';

const now = Date.parse('2026-11-04T12:00:00Z');
const settings = {
	FEATURE_WHATSAPP_WEBHOOK: 'true',
	FEATURE_WHATSAPP_CONSULTATION: 'true',
	FEATURE_WHATSAPP_PUBLIC_ENTRY: 'true',
	AUTOMATIC_SPEND_CAP_BRL: '0',
	WHATSAPP_CONSULTATION_FREE_REPLY_VERIFIED: 'true',
	WHATSAPP_COMMERCIAL_NUMBER: '5511999999999',
	WHATSAPP_CONSULTATION_VERIFIED_AT: new Date(now).toISOString(),
	WHATSAPP_ACCESS_TOKEN: 'synthetic',
	WHATSAPP_APP_SECRET: 'synthetic-app-secret',
	WHATSAPP_WABA_ID: '0000000000000001',
	WHATSAPP_PHONE_NUMBER_ID: '0000000000000002',
	WHATSAPP_GRAPH_VERSION: 'v24.0',
	WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'synthetic-verify-token',
	WHATSAPP_CONSULTATION_SUBJECT_SECRET: 'synthetic-subject-secret-at-least-32-characters',
	PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
	SUPABASE_SERVICE_ROLE_KEY: 'synthetic'
};
describe('public WhatsApp entry', () => {
	it('closes by default and requires a recent verified, cost-free channel', () => {
		expect(whatsappEntry({}, now)).toBeNull();
		for (const key of Object.keys(settings)) {
			const incomplete = { ...settings, [key]: '' };
			expect(whatsappEntry(incomplete, now), key).toBeNull();
		}
	});
	it('opens only the dedicated Brazilian number with a fixed non-sensitive greeting', () => {
		const url = new URL(whatsappEntry(settings, now)!);
		expect(url.origin).toBe('https://wa.me');
		expect(url.pathname).toBe('/5511999999999');
		expect(url.searchParams.get('text')).toBe('Olá! Quero conhecer a assistente virtual da ATVNA.');
	});
	it('rejects expired/future proof, paid budget, test sender and URL injection', () => {
		for (const change of [
			{ WHATSAPP_CONSULTATION_VERIFIED_AT: new Date(now - 8 * 86_400_000).toISOString() },
			{ WHATSAPP_CONSULTATION_VERIFIED_AT: new Date(now + 1).toISOString() },
			{ AUTOMATIC_SPEND_CAP_BRL: '1' },
			{ WHATSAPP_GRAPH_VERSION: '../injected' },
			{ WHATSAPP_WABA_ID: 'invalid' },
			{ WHATSAPP_APP_SECRET: 'short' },
			{ WHATSAPP_CONSULTATION_SUBJECT_SECRET: 'short' },
			{ WHATSAPP_COMMERCIAL_NUMBER: '15551657786' },
			{ WHATSAPP_COMMERCIAL_NUMBER: '5511999999999?text=secret' }
		])
			expect(whatsappEntry({ ...settings, ...change }, now)).toBeNull();
	});
});
