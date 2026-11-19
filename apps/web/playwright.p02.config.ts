import { defineConfig } from '@playwright/test';

export default defineConfig({
	timeout: 60_000,
	workers: 1,
	testMatch: '**/p02.e2e.ts',
	outputDir: '../../../evidencias/api-08/playwright',
	use: { baseURL: 'http://127.0.0.1:4197', trace: 'retain-on-failure' },
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
	webServer: {
		command: 'pnpm exec vite dev --host 127.0.0.1 --port 4197 --strictPort',
		port: 4197,
		reuseExistingServer: false,
		timeout: 180_000
	}
});
