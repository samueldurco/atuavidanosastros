import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	test(`Propósito & Carreira: complete synthesis, context and chart at ${width}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=purpose-career');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(
			page.getByRole('heading', { name: 'Mapa Astral de Dinheiro e Carreira', exact: true })
		).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		const navigation = page.getByRole('navigation', { name: 'Capítulos da leitura' });
		const titles = (await navigation.getByRole('button').allTextContents()).map((t) => t.trim());
		expect(titles).toHaveLength(7);
		expect(new Set(titles).size).toBe(titles.length);
		expect(titles).toContain('Uma direção de contribuição, várias formas de realizá-la');
		expect(titles).toContain('Preservar o que tem valor sem fechar espaço para o prazer');
		for (const button of await navigation.getByRole('button').all()) {
			const title = await button.innerText();
			await button.click();
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
		}
		await navigation
			.getByRole('button', {
				name: 'Mudar de direção sem transformar a escolha numa prova de valor',
				exact: true
			})
			.click();
		await expect(page.getByRole('article', { name: 'Capítulo selecionado' })).toContainText(
			/descanso/
		);
		await page
			.locator('summary')
			.filter({ hasText: 'Explore seu mapa e os capítulos relacionados' })
			.click();
		await expect(page.locator('svg [data-layer="positions"]')).toHaveCount(10);
		await expect(
			page.locator('svg [data-layer="positions"][data-fact-id="position-sun"]')
		).toHaveCount(1);
		const pending = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Baixar SVG', exact: true }).click();
		const download = await pending;
		expect(download.suggestedFilename()).toMatch(/\.svg$/);
		expect(await download.failure()).toBeNull();
		await expect(
			page.getByRole('link', { name: 'Guardar leitura em PDF', exact: true })
		).toBeVisible();
		await expect(
			page.getByRole('link', { name: 'Guardar uma cópia em texto', exact: true })
		).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await navigation.getByRole('button').first().click();
		await page.screenshot({
			path: `test-results/reconstruction-purpose-${width}.png`,
			fullPage: true
		});
	});
}
