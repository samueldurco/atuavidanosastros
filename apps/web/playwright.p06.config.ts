import { defineConfig } from '@playwright/test';

export default defineConfig({
	testMatch: '**/whatsapp-consultation.e2e.ts',
	timeout: 60_000,
	use: { baseURL: 'http://127.0.0.1:4196', trace: 'retain-on-failure' },
	webServer: {
		command: `node ../../scripts/whatsapp-e2e-server.mjs${process.env.P06_E2E_SKIP_BUILD === 'true' ? ' --skip-build' : ''}`,
		url: 'http://127.0.0.1:4196',
		reuseExistingServer: false,
		timeout: 600_000
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
