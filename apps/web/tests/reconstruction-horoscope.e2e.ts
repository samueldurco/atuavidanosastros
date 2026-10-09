import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	test(`Horóscopo: natal and daily sky, movements and reading at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=horoscope');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Seu Horóscopo', exact: true })).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		await page.getByText('Explore seu mapa e os capítulos relacionados', { exact: true }).click();
		const svg = page.locator('svg[data-engine="AstroChartEngineV2/2.0.0"]');
		await expect(svg).toBeVisible();
		await expect(svg.locator('[data-layer="positions"]')).toHaveCount(20);
		await expect(
			svg
				.locator('text[data-layer="heading"]')
				.filter({ hasText: 'Seu horóscopo · céu da data e mapa natal' })
		).toBeVisible();
		expect(await svg.locator('[data-layer="aspects"]').count()).toBeGreaterThan(0);
		await page.getByRole('combobox', { name: 'Aspectos', exact: true }).selectOption('none');
		await expect(svg.locator('[data-layer="aspects"]')).toHaveCount(0);
		await page.getByLabel('Casas disponíveis').uncheck();
		await expect(svg.locator('[data-layer="houses"]')).toHaveCount(0);
		await page.getByLabel('Casas disponíveis').check();
		await page.getByRole('combobox', { name: 'Aspectos', exact: true }).selectOption('major');
		for (const format of ['SVG', 'PNG']) {
			const pending = page.waitForEvent('download');
			await page.getByRole('button', { name: `Baixar ${format}`, exact: true }).click();
			const download = await pending;
			expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format.toLowerCase()}$`));
			expect(await download.failure()).toBeNull();
		}
		const navigation = page.getByRole('navigation', { name: 'Capítulos da leitura' });
		const titles = (await navigation.getByRole('button').allTextContents()).map((t) => t.trim());
		expect(titles.filter((t) => /^Movimento \d/.test(t)).length).toBeGreaterThanOrEqual(3);
		expect(titles.filter((t) => /^Movimento \d/.test(t)).length).toBeLessThanOrEqual(6);
		expect(titles[0]).toBe('O tema central do seu dia');
		expect(titles).toContain('Estímulos rápidos e pano de fundo');
		expect(titles).not.toContain('Referências desta leitura');
		for (const button of await navigation.getByRole('button').all()) {
			const title = await button.innerText();
			await button.click();
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
		}
		await page.getByRole('button', { name: '☆ Marcar capítulo', exact: true }).click();
		await expect(page.getByRole('button', { name: '★ Marcado', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(
			page.getByRole('link', { name: 'Guardar leitura em PDF', exact: true })
		).toHaveCount(0);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await navigation.getByRole('button').first().click();
		await page.screenshot({
			path: `test-results/reconstruction-horoscope-${width}.png`,
			fullPage: true
		});
	});
}
