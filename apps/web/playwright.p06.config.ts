import { defineConfig } from '@playwright/test';

export default defineConfig({
	testMatch: '**/whatsapp-consultation.e2e.ts',
	timeout: 60_000,
	use: { baseURL: 'http://127.0.0.1:4196', trace: 'retain-on-failure' },
	webServer: {
		command: 'node ../../scripts/whatsapp-e2e-server.mjs',
		url: 'http://127.0.0.1:4196',
		reuseExistingServer: false,
		timeout: 120_000,
		env: {
			FEATURE_WHATSAPP_WEBHOOK: 'true',
			FEATURE_WHATSAPP_CONSULTATION: 'true',
			FEATURE_WHATSAPP_PUBLIC_ENTRY: 'true',
			AUTOMATIC_SPEND_CAP_BRL: '0',
			WHATSAPP_CONSULTATION_FREE_REPLY_VERIFIED: 'true',
			WHATSAPP_COMMERCIAL_NUMBER: '5511999999999',
			WHATSAPP_CONSULTATION_VERIFIED_AT: new Date().toISOString(),
			WHATSAPP_ACCESS_TOKEN: 'test-only-not-a-provider-token',
			WHATSAPP_APP_SECRET: 'test-only-app-secret',
			WHATSAPP_WABA_ID: '0000000000000001',
			WHATSAPP_PHONE_NUMBER_ID: '0000000000000002',
			WHATSAPP_GRAPH_VERSION: 'v24.0',
			WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'test-only-verification-token',
			WHATSAPP_CONSULTATION_SUBJECT_SECRET: 'test-only-subject-secret-at-least-32-characters',
			SUPABASE_SERVICE_ROLE_KEY: 'test-only-not-a-service-key'
		}
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
