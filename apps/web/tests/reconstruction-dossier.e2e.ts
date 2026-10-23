import { chartImage, chartElementCount, chartTitle, expectChartImage } from './chart-image';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	test(`Dossiê do Casal: perguntas interpretadas, biwheel e mapas individuais em ${width}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=couple-dossier');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(
			page.getByRole('heading', { name: 'Aprofundamento Astral do Casal', exact: true })
		).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		const individual = page.getByRole('region', { name: 'Fatores natais das duas pessoas' });
		await expect(chartImage(individual)).toHaveCount(2);
		for (const wheel of await chartImage(individual).all()) {
			await expectChartImage(wheel, 10);
			await expect.poll(() => chartElementCount(wheel, '[data-layer="houses"]')).toBeGreaterThan(0);
		}
		await page.getByText('Explore seu mapa e os capítulos relacionados', { exact: true }).click();
		const wheel = chartImage(page.locator('.chart-panel'));
		await expectChartImage(wheel, 20);
		await expect.poll(() => chartTitle(wheel)).toBe('Dossiê do Casal · mapas em relação');
		await expect.poll(() => chartElementCount(wheel, '[data-layer="aspects"]')).toBeGreaterThan(0);
		await page.getByRole('combobox', { name: 'Aspectos', exact: true }).selectOption('none');
		await expect.poll(() => chartElementCount(wheel, '[data-layer="aspects"]')).toBe(0);
		await page.getByLabel('Casas disponíveis').uncheck();
		await expect.poll(() => chartElementCount(wheel, '[data-layer="houses"]')).toBe(0);
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
		const titles = (await navigation.getByRole('button').allTextContents()).map((title) =>
			title.trim()
		);
		expect(titles.slice(0, 3)).toEqual([
			'Sua pergunta 1: Como manter presença à distância?',
			'Sua pergunta 2: Como conversar quando discordamos?',
			'Sua pergunta 3: Como combinar espaço individual?'
		]);
		expect(titles.length).toBeGreaterThan(3);
		for (const button of await navigation.getByRole('button').all()) {
			const title = await button.innerText();
			await button.click();
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
			if (title.startsWith('Sua pergunta 1:'))
				await expect(page.getByRole('article', { name: 'Capítulo selecionado' })).toContainText(
					/cuidado/
				);
		}
		await page.getByRole('button', { name: '☆ Marcar capítulo', exact: true }).click();
		await expect(page.getByRole('button', { name: '★ Marcado', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		await expect(
			page.getByRole('link', { name: 'Guardar leitura em PDF', exact: true })
		).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await page.screenshot({
			path: `test-results/reconstruction-dossier-${width}.png`,
			fullPage: true
		});
	});
}
