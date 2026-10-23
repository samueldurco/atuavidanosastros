import { chartImage, chartElementCount, expectChartImage, openChartFactors } from './chart-image';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	for (const [product, title] of [
		['three-pillars', 'Sol, Lua e Ascendente'],
		['birth-chart', 'Mapa Astral Completo'],
		['ascendant', 'Ascendente — aproximação, regente e resposta'],
		['midheaven', 'Meio do Céu — direção pública e responsabilidade']
	]) {
		test(`${product}: integrated reading and chart at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(`/testar-produtos/_spec?product=${product}`);
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
			await page.getByText('Explore seu mapa e os capítulos relacionados', { exact: true }).click();
			const wheel = chartImage(page);
			await expectChartImage(wheel, 10);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await openChartFactors(page);
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
		const wheel = chartImage(page);
		await expectChartImage(wheel, 10);
		const previewWidth = await wheel.evaluate((image) => image.getBoundingClientRect().width);
		await page.getByRole('combobox', { name: 'Aspectos', exact: true }).selectOption('none');
		await expect.poll(() => chartElementCount(wheel, '[data-layer="aspects"]')).toBe(0);
		await page.getByLabel('Casas disponíveis').uncheck();
		await expect.poll(() => chartElementCount(wheel, '[data-layer="houses"]')).toBe(0);
		await expect.poll(() => chartElementCount(wheel, 'text[data-layer="markers"]')).toBe(10);
		const graduationPaths = await chartElementCount(wheel, 'path[data-layer="degrees"]');
		expect(graduationPaths).toBeGreaterThan(0);
		await page.getByLabel('Graus', { exact: true }).uncheck();
		// The control hides planet degree labels while preserving the fixed zodiac graduation.
		await expect.poll(() => chartElementCount(wheel, 'text[data-layer="markers"]')).toBe(0);
		await expect
			.poll(() => chartElementCount(wheel, 'path[data-layer="degrees"]'))
			.toBe(graduationPaths);
		const expand = page.getByRole('button', { name: 'Ampliar mapa', exact: true });
		await expand.focus();
		await expand.press('Enter');
		const dialog = page.getByRole('dialog', { name: 'Mapa desta leitura', exact: true });
		await expect(dialog).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Fechar' })).toBeFocused();
		await expect
			.poll(() =>
				dialog.getByRole('img').evaluate(async (element) => {
					const image = element as HTMLImageElement;
					await image.decode();
					return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
				})
			)
			.toBe(true);
		expect(
			await dialog.getByRole('img').evaluate((image) => image.getBoundingClientRect().width)
		).toBeGreaterThan(previewWidth);
		await page.keyboard.press('Tab');
		const exploration = dialog.getByRole('region', {
			name: 'Mapa ampliado; use a rolagem para explorar'
		});
		await expect(exploration).toBeFocused();
		if (width === 390) {
			expect(
				await exploration.evaluate((element) => element.scrollWidth > element.clientWidth)
			).toBe(true);
			await page.keyboard.press('ArrowRight');
			await expect
				.poll(() => exploration.evaluate((element) => element.scrollLeft))
				.toBeGreaterThan(0);
		}
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await page.keyboard.press('Escape');
		await expect(dialog).not.toBeVisible();
		await expect(expand).toBeFocused();
		await expand.press('Enter');
		await dialog.getByRole('button', { name: 'Fechar' }).click();
		await expect(dialog).not.toBeVisible();
		await expect(expand).toBeFocused();
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
		await openChartFactors(page);
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
