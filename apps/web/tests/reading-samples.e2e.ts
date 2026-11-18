import { expect, test } from '@playwright/test';
import { isLaunchProductId } from '@atv/domain';
import { customerOffers } from '../src/lib/data/product-copy';

test('every catalog preview opens the matching public sample and keeps the offer state', async ({
	page
}) => {
	await page.goto('/leituras');
	await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
	await expect(page.locator('#catalogo [data-reading-sample]')).toHaveCount(customerOffers.length);
	for (const product of customerOffers) {
		const card = page
			.locator('.public-product-card')
			.filter({ has: page.locator(`[data-reading-sample="${product.id}"]`) });
		await expect(card.getByRole('link', { name: 'Ver uma amostra' })).toHaveAttribute(
			'href',
			`${product.href}#amostra`
		);
		await expect(card.locator('.badge')).toHaveText(
			isLaunchProductId(product.id) ? 'Teste gratuito disponível' : 'Em preparação'
		);
	}
	await page
		.locator('.public-product-card')
		.first()
		.getByRole('link', { name: 'Ver uma amostra' })
		.click();
	await expect(page).toHaveURL(/#amostra$/);
	await expect(page.locator('#amostra')).toBeInViewport();
});

for (const width of [390, 1440]) {
	test(`all 30 product samples are readable and fit at ${width}px`, async ({ page }, testInfo) => {
		test.setTimeout(180_000);
		await page.setViewportSize({ width, height: 1000 });
		for (const product of customerOffers) {
			const response = await page.goto(`${product.href}#amostra`);
			expect(response?.status(), product.id).toBe(200);
			const consent = page.getByRole('button', { name: 'Recusar opcionais', exact: true });
			if (await consent.isVisible()) await consent.click();
			const sample = page.locator(`#amostra [data-reading-sample="${product.id}"]`);
			await expect(sample).toBeVisible();
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(product.name);
			await expect(sample.locator('.sample-note')).toContainText(/fictíci/);
			await expect(page.locator('#disponibilidade')).toBeAttached();
			await expect(page.locator('#disponibilidade h2')).toHaveText(
				isLaunchProductId(product.id) ? 'Teste gratuito disponível' : 'Produto em preparação'
			);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
				product.id
			).toBe(true);
			await sample.scrollIntoViewIfNeeded();
			await sample.locator('img').evaluateAll((images) =>
				Promise.all(
					images.map(async (image) => {
						const img = image as HTMLImageElement;
						if (!img.complete)
							await new Promise<void>((resolve) => {
								img.onload = () => resolve();
								img.onerror = () => resolve();
							});
						if (img.naturalWidth === 0)
							throw new Error(`Broken sample image: ${img.getAttribute('src')}`);
					})
				)
			);
			await sample.screenshot({ path: testInfo.outputPath(`${product.id}-${width}.png`) });
		}
	});
}
