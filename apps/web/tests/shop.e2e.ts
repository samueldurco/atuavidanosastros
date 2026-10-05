import { expect, test } from '@playwright/test';

test('Loja mantém as 12 rotas editoriais sem ofertas publicadas', async ({ page }) => {
	await page.goto('/loja');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Loja dos Signos');
	await expect(
		page.getByRole('navigation', { name: 'Signos na loja' }).getByRole('link')
	).toHaveCount(12);
	await expect(page.getByText('Compras ainda indisponíveis', { exact: true })).toBeVisible();
	expect(await page.locator('script[type="application/ld+json"]').allTextContents()).not.toEqual(
		expect.arrayContaining([expect.stringMatching(/"@(type|context)"\s*:\s*"(Product|Offer)"/)])
	);
	await page
		.getByRole('navigation', { name: 'Signos na loja' })
		.getByRole('link', { name: /Áries/ })
		.click();
	await expect(page).toHaveURL(/\/loja\/signo\/aries$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Áries na Loja dos Signos');
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
	await expect(page.getByText(/As compras ainda\s+não estão disponíveis/)).toBeVisible();
	const refuseAnalytics = page.getByRole('button', { name: 'Recusar opcionais' });
	if (await refuseAnalytics.isVisible()) await refuseAnalytics.click();
	await page.screenshot({ path: '../../test-results/gate-b/loja-signo-1280.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 900 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
		false
	);
	await page.screenshot({ path: '../../test-results/gate-b/loja-signo-390.png', fullPage: true });
});

for (const width of [1440, 820, 390, 320]) {
	test(`Loja cabe na viewport de ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/loja');
		const refuseAnalytics = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await refuseAnalytics.isVisible()) await refuseAnalytics.click();
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		const horizontalOverflow = await page.evaluate(
			() => document.documentElement.scrollWidth > window.innerWidth
		);
		expect(horizontalOverflow).toBe(false);
		await page.screenshot({ path: `../../test-results/gate-b/loja-${width}.png`, fullPage: true });
	});
}
