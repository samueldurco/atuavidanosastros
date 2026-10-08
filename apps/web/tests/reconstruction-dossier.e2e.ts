import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	test(`Dossiê do Casal: seventeen chapters, real biwheel and native maps at ${width}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=couple-dossier');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Dossiê do Casal', exact: true })).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		const individual = page.getByRole('region', { name: 'Fatores natais das duas pessoas' });
		await expect(individual.locator('svg[data-engine="AstroChartEngineV2/2.0.0"]')).toHaveCount(2);
		await expect(individual.locator('[data-layer="houses"]')).not.toHaveCount(0);
		await page.getByText('Explore seu mapa e os capítulos relacionados', { exact: true }).click();
		const svg = page.locator('.chart-panel svg[data-engine="AstroChartEngineV2/2.0.0"]');
		await expect(svg).toBeVisible();
		await expect(svg.locator('[data-layer="positions"]')).toHaveCount(20);
		await expect(
			svg
				.locator('text[data-layer="heading"]')
				.filter({ hasText: 'Dossiê do Casal · mapas em relação' })
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
		await expect(navigation.getByRole('button')).toHaveCount(17);
		const titles = (await navigation.getByRole('button').allTextContents()).map((title) =>
			title.trim()
		);
		const lastAnswer = titles.findIndex((title) => title.startsWith('Resposta à pergunta 3'));
		expect(lastAnswer).toBeGreaterThanOrEqual(0);
		expect(titles.indexOf('O que vem primeiro e por quê')).toBeGreaterThan(lastAnswer);
		for (const button of await navigation.getByRole('button').all()) {
			const title = await button.innerText();
			await button.click();
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
			if (title.startsWith('Resposta à pergunta 1'))
				await expect(
					page.getByText('Pergunta informada: “Como manter presença à distância?”.', {
						exact: false
					})
				).toBeVisible();
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
