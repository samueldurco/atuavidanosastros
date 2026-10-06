import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Isolated preparatory UI QA; no provider credentials or paid operations.
export default defineConfig({
	...base,
	use: { ...base.use, baseURL: 'http://127.0.0.1:4186' },
	workers: 1,
	testMatch: '**/shop.e2e.ts',
	webServer: {
		command: 'pnpm exec vite dev --host 127.0.0.1 --port 4186 --strictPort',
		port: 4186,
		reuseExistingServer: false,
		timeout: 360_000
	}
});
