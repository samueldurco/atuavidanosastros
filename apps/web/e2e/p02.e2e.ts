import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [360, 1440]) {
	test(`verified posters at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 1000 });
		const providerRequests: string[] = [];
		page.on('request', (request) => {
			if (/api\.printful\.com|gelato\.com|hotmart\.com/.test(request.url()))
				providerRequests.push(request.url());
		});
		const response = await page.goto('/loja/_revisao/p02');
		expect(response?.status()).toBe(200);
		expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
		const products = page.locator('article.product');
		await expect(products).toHaveCount(2);
		await expect(
			page.getByRole('heading', { name: 'Atlas dos símbolos', exact: true })
		).toBeVisible();
		await expect(
			page.getByRole('heading', { name: 'Campos de experiência', exact: true })
		).toBeVisible();
		for (const product of await products.all()) {
			await product.scrollIntoViewIfNeeded();
			await expect(product.locator('.price')).toHaveText(/149,00\s*\+ frete/);
			await expect(product.getByRole('button')).toBeDisabled();
			await expect(product.locator('img')).toHaveJSProperty('naturalWidth', 1000);
		}
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(
			(await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n')
		).not.toContain('InStock');
		expect(providerRequests).toEqual([]);
		const accessibility = await new AxeBuilder({ page })
			.include('.collection-hero')
			.include('.products')
			.include('.details')
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();
		expect(accessibility.violations).toEqual([]);
		// Use the existing local consent flow so the preview does not obscure the artwork.
		const refuseOptional = page.getByRole('button', { name: 'Recusar opcionais', exact: true });
		if (await refuseOptional.isVisible()) await refuseOptional.click();
		await page.evaluate(() => scrollTo(0, 0));
		await page.screenshot({ path: `../../../evidencias/api-08/p02-${width}.png`, fullPage: true });
	});
}
