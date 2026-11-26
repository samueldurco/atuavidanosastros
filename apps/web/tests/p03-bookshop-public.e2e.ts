import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});

for (const width of [320, 390, 768, 1440]) {
	test(`a Livraria apresenta o acervo antes do clube, sem vender, em ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/loja/livraria');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			'Livros para conhecer o céu. E a si.',
			{ useInnerText: true }
		);
		await expect(page.getByText('Em preparação', { exact: true })).toBeVisible();
		await expect(page.locator('.theme-card')).toHaveCount(3);
		await expect(
			page.locator('main form, main [href*="checkout"], main [href*="previa"]')
		).toHaveCount(0);
		await expect(page.locator('.bookshop-public')).not.toContainText(
			/R\$|Comprar|Seu Mapa Astral por Inteiro/
		);
		const shelf = await page.locator('#nossa-estante').boundingBox();
		const club = await page.locator('.paper-sky').boundingBox();
		expect(shelf).not.toBeNull();
		expect(club!.y).toBeGreaterThan(shelf!.y + shelf!.height - 1);
		const accessibility = await new AxeBuilder({ page })
			.include('.bookshop-public')
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
			.analyze();
		expect(accessibility.violations).toEqual([]);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`livraria-publica-${width}.png`),
			fullPage: true
		});
		await page.getByRole('link', { name: 'Conhecer a proposta' }).click();
		await expect(page).toHaveURL(/#nossa-estante$/);
	});
}

test('home e menu levam à apresentação pública como irmã da Loja dos Signos', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('link', { name: 'Conhecer a Livraria' })).toHaveAttribute(
		'href',
		'/loja/livraria'
	);
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.locator('[aria-controls="nav-loja"]').click();
	await expect(page.locator('#nav-loja .nav-item[href="/loja"]')).toContainText('Loja dos Signos');
	await page.locator('#nav-loja .nav-item[href="/loja/livraria"]').click();
	await expect(page).toHaveURL(/\/loja\/livraria$/);
	await page.getByRole('link', { name: 'Ler a Revista ATVNA' }).click();
	await expect(page).toHaveURL(/\/revista$/);
});

test('a chamada da Livraria cabe na home e na Loja em telas pequenas e grandes', async ({
	page
}, testInfo) => {
	for (const width of [320, 1440]) {
		await page.setViewportSize({ width, height: 900 });
		for (const path of ['/', '/loja']) {
			await page.goto(path);
			const announcement = page.getByRole('complementary', {
				name: 'Livraria ATVNA em preparação'
			});
			await expect(announcement.getByRole('link', { name: 'Conhecer a Livraria' })).toHaveAttribute(
				'href',
				'/loja/livraria'
			);
			await announcement.scrollIntoViewIfNeeded();
			expect(
				await announcement.evaluate((element) => element.scrollWidth - element.clientWidth)
			).toBeLessThanOrEqual(1);
			await announcement.screenshot({
				path: testInfo.outputPath(`chamada-${path === '/' ? 'home' : 'loja'}-${width}.png`)
			});
		}
	}
});
