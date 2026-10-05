import { defineConfig } from '@playwright/test';
export default defineConfig({
	use: { baseURL: 'http://127.0.0.1:4273', trace: 'retain-on-failure' },
	webServer: {
		command: 'pnpm build && pnpm exec wrangler pages dev .svelte-kit/cloudflare --port 4273',
		port: 4273,
		reuseExistingServer: false,
		timeout: 120000
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
	workers: 2,
	testMatch: '**/*.e2e.{ts,js}'
});
