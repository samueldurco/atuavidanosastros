import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
	await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('HOME distingue produtos digitais, continuidade e imagens de cada seção', async ({ page }) => {
	await page.goto('/');
	const products = page.locator('#produtos');
	await expect(products.getByText('03 / Leituras digitais avulsas')).toBeVisible();
	await expect(products.locator('article')).toHaveCount(3);
	await expect(products.getByRole('link', { name: 'Ver produto digital' })).toHaveCount(3);
	await expect(products.locator('#atv-mais-home')).toHaveCount(0);
	await expect(page.locator('#atv-mais-home').getByRole('heading', { level: 3 })).toHaveCount(3);
	await expect(page.locator('#universos').getByRole('heading', { level: 3 })).toHaveCount(6);
	const images = page.locator(
		'#ferramentas .tool-open img, #produtos .reading-cover img, #universos img, #revista .article-image img, #loja .shop-scene img'
	);
	await expect(images).toHaveCount(25);
	const sources = await images.evaluateAll((items) =>
		items.map((item) => (item as HTMLImageElement).src)
	);
	expect(new Set(sources).size).toBe(sources.length);
	for (const image of await images.all()) {
		await image.scrollIntoViewIfNeeded();
		await expect
			.poll(() => image.evaluate((item) => (item as HTMLImageElement).naturalWidth))
			.toBeGreaterThan(0);
	}
});

for (const width of [390, 1440]) {
	test(`coleção: cenas, navegação e peças reais em ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/');
		await expect(page.locator('.nav-trigger').first()).toBeEnabled({ timeout: 30_000 });
		const shop = page.locator('#loja');
		await shop.scrollIntoViewIfNeeded();
		const previous = shop.getByRole('button', { name: 'Ver cena anterior da loja' });
		const next = shop.getByRole('button', { name: 'Ver próxima cena da loja' });
		await expect(previous).toBeDisabled();
		await next.click();
		await expect(shop.locator('.shop-counter')).toHaveText(/02\s*\/\s*(?:de\s*)?04/);
		await expect(shop.getByRole('heading', { name: 'Uma pausa com seu signo.' })).toBeInViewport();
		await shop.getByRole('button', { name: 'Ver decoração e papelaria · em casa' }).click();
		await expect(next).toBeDisabled();
		await expect(shop.getByRole('link', { name: 'Pôster Virgo' })).toHaveAttribute(
			'href',
			'/loja/peca/poster-virgem'
		);
		await shop.getByRole('button', { name: 'Ver roupas · no corpo' }).press('Enter');
		await expect(previous).toBeDisabled();
		await expect(shop.locator('.scene-selectors [aria-current="true"]')).toHaveAttribute(
			'aria-label',
			'Ver roupas · no corpo'
		);
		await expect(shop.locator('.scene-pieces a')).toHaveCount(7);
		for (const link of await shop.locator('.scene-pieces a').all())
			await expect(link).toHaveAttribute('href', /^\/loja\/peca\/[a-z-]+$/);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await shop.screenshot({ path: testInfo.outputPath(`shop-${width}.png`) });
	});
}

for (const width of [320, 1440]) {
	test(`amostra legível, expansível e acessível em ${width}px`, async ({ page }, testInfo) => {
		test.setTimeout(120_000);
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/');
		const sample = page.locator('#amostra');
		const expand = sample.getByRole('button', { name: 'Ampliar mapa' });
		await expect(expand).toBeEnabled();
		await page.evaluate(() => document.fonts.ready);
		for (const id of ['produtos', 'atv-mais-home', 'universos', 'revista']) {
			const section = page.locator(`#${id}`);
			await section.scrollIntoViewIfNeeded();
			await section.screenshot({ path: testInfo.outputPath(`${id}-${width}.png`) });
		}
		await sample.scrollIntoViewIfNeeded();
		await sample.screenshot({ path: testInfo.outputPath(`sample-${width}.png`) });
		await expand.click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('img')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(dialog).not.toBeVisible();
		await expect(expand).toBeFocused();
		await sample.locator('summary').filter({ hasText: 'Posições do mapa' }).click();
		await expect(sample.getByRole('table')).toBeVisible();
		await expect(sample.getByRole('row')).toHaveCount(13);
		await sample.locator('.sample-synthesis summary').click();
		await expect(sample.locator('.synthesis-copy')).toBeVisible();
		await expect(sample.getByRole('link', { name: 'Conhecer a leitura completa' })).toHaveAttribute(
			'href',
			'/produtos/mapa-astral-completo'
		);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		const accessibility = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
			.analyze();
		await testInfo.attach('accessibility', {
			body: JSON.stringify(accessibility, null, 2),
			contentType: 'application/json'
		});
		expect(
			accessibility.violations.map(({ id, nodes }) => ({
				id,
				targets: nodes.map(({ target }) => target)
			}))
		).toEqual([]);
	});
}
