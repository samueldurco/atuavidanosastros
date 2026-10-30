import { defineConfig } from '@playwright/test';
import base from './playwright.shop.config';

// Synthetic, browser-intercepted contracts only; no supplier or payment calls.
export default defineConfig({
	...base,
	use: { ...base.use, baseURL: 'http://127.0.0.1:4187' },
	testMatch: '**/shop-purchase.e2e.ts',
	webServer: {
		command: 'pnpm exec vite dev --host 127.0.0.1 --port 4187 --strictPort',
		env: { FEATURE_PHYSICAL_CHECKOUT: 'true' },
		port: 4187,
		reuseExistingServer: false,
		timeout: 360_000
	}
});
