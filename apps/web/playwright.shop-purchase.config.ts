import { testShopSeller, testShopQuoteKey } from './tests/fixtures/shop-seller';
import { defineConfig } from '@playwright/test';
import base from './playwright.shop.config';

// Synthetic, browser-intercepted contracts only; no supplier or payment calls.
export default defineConfig({
	...base,
	timeout: 180_000,
	expect: { timeout: 30_000 },
	use: { ...base.use, baseURL: 'http://127.0.0.1:4187' },
	testMatch: '**/shop-purchase.e2e.ts',
	webServer: {
		command: 'node node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 4187 --strictPort',
		env: {
			FEATURE_PHYSICAL_CHECKOUT: 'true',
			SHOP_ARIES_SINGLE_UNIT_ONLY: 'false',
			SHOP_SELLER_DISCLOSURE_APPROVED: 'true',
			SHOP_DELIVERY_MAX_BUSINESS_DAYS: '40',
			SHOP_VERIFIED_FLAT_SHIPPING_BRL: '29.90',
			ATVNA_CHECKOUT_SIGNING_KEY: testShopQuoteKey,
			...testShopSeller
		},
		port: 4187,
		reuseExistingServer: false,
		timeout: 360_000
	}
});
