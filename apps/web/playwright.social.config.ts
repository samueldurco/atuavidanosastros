import { defineConfig } from '@playwright/test';

// Separate port keeps social preparation isolated from other local WUs.
export default defineConfig({
	workers: 1,
	use: { baseURL: 'http://127.0.0.1:4187', trace: 'retain-on-failure' },
	webServer: {
		command: 'pnpm build && pnpm exec wrangler pages dev .svelte-kit/cloudflare --port 4187',
		port: 4187,
		reuseExistingServer: false,
		timeout: 180_000
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
	testMatch: '**/legal.e2e.ts'
});
