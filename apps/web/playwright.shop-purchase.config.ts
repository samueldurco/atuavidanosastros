import { testShopSeller } from './tests/fixtures/shop-seller';
import { defineConfig } from '@playwright/test';
import base from './playwright.shop.config';

// Synthetic, browser-intercepted contracts only; no supplier or payment calls.
export default defineConfig({
	...base,
	use: { ...base.use, baseURL: 'http://127.0.0.1:4187' },
	testMatch: '**/shop-purchase.e2e.ts',
	webServer: {
		command: 'pnpm exec vite dev --host 127.0.0.1 --port 4187 --strictPort',
		env: {
			FEATURE_PHYSICAL_CHECKOUT: 'true',
			SHOP_ARIES_SINGLE_UNIT_ONLY: 'false',
			SHOP_SELLER_DISCLOSURE_APPROVED: 'true',
			SHOP_DELIVERY_MAX_BUSINESS_DAYS: '40',
			SHOP_VERIFIED_FLAT_SHIPPING_BRL: '29.90',
			...testShopSeller
		},
		port: 4187,
		reuseExistingServer: false,
		timeout: 360_000
	}
});
