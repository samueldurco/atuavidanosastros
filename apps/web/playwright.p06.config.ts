import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
	...base,
	workers: 1,
	use: { ...base.use, baseURL: 'http://127.0.0.1:4186' },
	testMatch: '**/p06.e2e.ts',
	outputDir: '../../test-results/p06',
	webServer: {
		command: 'pnpm exec vite dev --host 127.0.0.1 --port 4186 --strictPort',
		port: 4186,
		reuseExistingServer: false,
		timeout: 360_000,
		env: {
			ATV_P06_LOCAL_REVIEW: 'true',
			FEATURE_P06_CATALOG: 'false',
			FEATURE_PHYSICAL_CHECKOUT: 'false',
			FEATURE_HOTMART_LIVE: 'false'
		}
	}
});
