import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/** Local integration QA against the already-running development server. */
export default defineConfig({
	...base,
	webServer: undefined,
	workers: 1,
	use: { ...base.use, baseURL: process.env.ATV_HOME_QA_URL ?? 'http://127.0.0.1:4330' },
	reporter: [['list'], ['json', { outputFile: 'test-results/home-integration.json' }]]
});
