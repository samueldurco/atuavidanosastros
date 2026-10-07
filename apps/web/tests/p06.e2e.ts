import { expect, test } from '@playwright/test';
import { scanAccessibility } from './fixtures/accessibility';
for (const width of [1440, 390, 320]) {
	test(
		'P06 private catalogue renders six products without checkout at ' + width + 'px',
		async ({ page }, testInfo) => {
			await page.setViewportSize({ width, height: 900 });
			const response = await page.goto('/loja/_revisao/p06');
			expect(response?.headers()['x-robots-tag']).toContain('noindex');
			await expect(page.locator('article.product')).toHaveCount(6);
			await expect(page.getByRole('button', { name: /Comprar na Hotmart/ })).toHaveCount(0);
			await expect(page.locator('.price').filter({ hasText: '399,00' })).toHaveCount(3);
			await expect(page.locator('.price').filter({ hasText: '249,00' })).toHaveCount(3);
			for (const image of await page.locator('article img').all()) {
				await image.scrollIntoViewIfNeeded();
				await expect
					.poll(() =>
						image.evaluate((el) => {
							const img = el as HTMLImageElement;
							return img.complete && img.naturalWidth > 0;
						})
					)
					.toBe(true);
			}
			const refuse = page.getByRole('button', { name: 'Recusar opcionais' });
			if (await refuse.isVisible()) await refuse.click();
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
			).toBe(false);
			await page.screenshot({ path: testInfo.outputPath('p06-' + width + '.png'), fullPage: true });
			if (width !== 320) await scanAccessibility(page, testInfo);
		}
	);
}
test('public catalogue remains empty and forged purchase is refused with live flags off', async ({
	page,
	request
}) => {
	await page.goto('/loja/mitos-emblemas');
	await expect(page.locator('article.product')).toHaveCount(0);
	await expect(page.getByText('Esta coleção está em preparação.', { exact: false })).toBeVisible();
	const response = await request.post('/loja/checkout', {
		headers: { origin: 'http://127.0.0.1:4186' },
		form: { sku: 'ATV-P06-ARI-EMB-A001-SWT01-PRE-M', quantity: '1' }
	});
	expect(response.status()).toBe(503);
	await page.goto('/loja');
	await expect(page.locator('#colecoes')).toBeVisible();
});
