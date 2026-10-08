import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	test(`date reading: natal and date chart, chapters and downloads at ${width}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=date-reading');
		await expect(page.getByRole('heading', { name: 'Leitura da Data', exact: true })).toBeVisible();
		await page.getByText('Explore seu mapa e os capítulos relacionados', { exact: true }).click();
		const svg = page.locator('svg[data-engine="AstroChartEngineV2/2.0.0"]');
		await expect(svg).toBeVisible();
		await expect(svg.locator('[data-layer="positions"]')).toHaveCount(20);
		await expect(
			svg.locator('text[data-layer="heading"]').filter({ hasText: 'Céu da data e mapa natal' })
		).toBeVisible();
		expect(await svg.locator('[data-layer="aspects"]').count()).toBeGreaterThan(0);
		await page.getByRole('combobox', { name: 'Aspectos', exact: true }).selectOption('none');
		await expect(svg.locator('[data-layer="aspects"]')).toHaveCount(0);
		await page.getByLabel('Casas disponíveis').uncheck();
		await expect(svg.locator('[data-layer="houses"]')).toHaveCount(0);
		await page.getByRole('combobox', { name: 'Aspectos', exact: true }).selectOption('major');
		await page.getByLabel('Casas disponíveis').check();
		for (const format of ['SVG', 'PNG']) {
			const pending = page.waitForEvent('download');
			await page.getByRole('button', { name: `Baixar ${format}`, exact: true }).click();
			const download = await pending;
			expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format.toLowerCase()}$`));
			expect(await download.failure()).toBeNull();
		}
		await page.getByRole('button', { name: /^Sol:/ }).click();
		await expect(page.locator('article h2').first()).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await page.screenshot({
			path: `test-results/reconstruction-date-${width}.png`,
			fullPage: true
		});
	});
}
