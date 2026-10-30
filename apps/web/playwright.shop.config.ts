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
		env: {
			SHOP_SELLER_PUBLIC_NAME: 'Responsável de exemplo',
			SHOP_SELLER_PUBLIC_ADDRESS: 'Endereço fictício para teste de layout, Brasil',
			SHOP_SELLER_PUBLIC_EMAIL: 'seller@example.test'
		},
		port: 4186,
		reuseExistingServer: false,
		timeout: 360_000
	}
});
