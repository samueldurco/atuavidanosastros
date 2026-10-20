import { expect, test } from '@playwright/test';

test('a apresentação pós-compra não fica acessível como página pública', async ({ page }) => {
	const response = await page.goto('/ofertas/upsell-birth-chart-life-atlas-post-purchase');
	expect(response?.status()).toBe(404);
	expect(response?.headers()['cache-control']).toBe('private, no-store');
	expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
	await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);
	await expect(page.locator('a[href="/leituras"]')).toHaveCount(0);
});
