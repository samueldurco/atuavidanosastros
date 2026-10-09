import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	for (const [product, title] of [
		['three-pillars', 'Três Pilares'],
		['birth-chart', 'Mapa Astral — assinaturas e temas de vida'],
		['ascendant', 'Ascendente — aproximação, regente e resposta'],
		['midheaven', 'Meio do Céu']
	]) {
		test(`${product}: integrated reading and chart at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(`/testar-produtos/_spec?product=${product}`);
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
			await page.getByText('Explore seu mapa e os capítulos relacionados', { exact: true }).click();
			const svg = page.locator('svg[data-engine="AstroChartEngineV2/2.0.0"]');
			await expect(svg).toBeVisible();
			await expect(svg.locator('[data-layer="positions"]')).toHaveCount(10);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await page.getByRole('button', { name: /^Sol:/ }).click();
			await expect(page.locator('article h2').first()).toBeVisible();
			expect(
				(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
					.violations
			).toEqual([]);
			await page.screenshot({
				path: `test-results/reconstruction-${product}-${width}.png`,
				fullPage: true
			});
		});
	}
	test(`career reconstruction: chart, chapter and downloads at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=career-compass');
		await expect(
			page.getByRole('heading', { name: 'Bússola de Carreira', exact: true })
		).toBeVisible();
		await page.getByText('Explore seu mapa e os capítulos relacionados', { exact: true }).click();
		const svg = page.locator('svg[data-engine="AstroChartEngineV2/2.0.0"]');
		await expect(svg).toBeVisible();
		const positions = await svg.locator('[data-layer="positions"]').count();
		expect(positions).toBe(10);
		await page.getByRole('combobox', { name: 'Aspectos', exact: true }).selectOption('none');
		await expect(svg.locator('[data-layer="aspects"]')).toHaveCount(0);
		await page.getByLabel('Casas disponíveis').uncheck();
		await expect(svg.locator('[data-layer="houses"]')).toHaveCount(0);
		await page.getByLabel('Graus', { exact: true }).uncheck();
		await page.getByRole('button', { name: 'Ampliar', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Ajustar à tela', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		for (const format of ['SVG', 'PNG']) {
			const pending = page.waitForEvent('download');
			await page.getByRole('button', { name: `Baixar ${format}`, exact: true }).click();
			const download = await pending;
			expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format.toLowerCase()}$`));
			expect(await download.failure()).toBeNull();
		}
		await page.getByRole('button', { name: /^Sol:/ }).click();
		await expect(page.locator('article h2').first()).toBeVisible();
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await page.screenshot({
			path: `test-results/reconstruction-career-${width}.png`,
			fullPage: true
		});
	});
}
