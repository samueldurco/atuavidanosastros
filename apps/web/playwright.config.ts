import { defineConfig } from '@playwright/test';

export default defineConfig({
	use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
	webServer: { command: 'pnpm build && pnpm preview', port: 4173, reuseExistingServer: false },
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
	testMatch: '**/*.e2e.{ts,js}'
});
