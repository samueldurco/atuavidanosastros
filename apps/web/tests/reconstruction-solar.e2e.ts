import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	test(`Revolução Solar: twelve months, annual and natal charts at ${width}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=solar-return');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Revolução Solar', exact: true })).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		const navigation = page.getByRole('navigation', { name: 'Capítulos da leitura' });
		const titles = (await navigation.getByRole('button').allTextContents()).map((t) => t.trim());
		expect(titles.filter((t) => /^Mês \d+/.test(t))).toHaveLength(12);
		expect(titles).not.toContain('Referências desta leitura');
		expect(new Set(titles).size).toBe(titles.length);
		for (const button of await navigation.getByRole('button').all()) {
			const title = await button.innerText();
			await button.click();
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
		}
		await page
			.locator('summary')
			.filter({ hasText: 'Explore seu mapa e os capítulos relacionados' })
			.click();
		const chart = page.getByRole('combobox', { name: 'Carta apresentada', exact: true });
		await expect(chart).toHaveValue('return');
		const factors = page.locator('.chart-panel .factors');
		await expect(factors.getByRole('button')).toHaveCount(12);
		await expect(factors).toContainText('Sol no retorno:');
		await expect(factors).not.toContainText('candidata');
		await expect(
			page.locator('svg [data-layer="positions"][data-fact-id="return-sun"]')
		).toHaveCount(1);
		await chart.selectOption('natal');
		await expect(factors.getByRole('button')).toHaveCount(12);
		await expect(factors).not.toContainText('no retorno:');
		await expect(factors).not.toContainText('candidata');
		await expect(
			page.locator('svg [data-layer="positions"][data-fact-id="position-sun"]')
		).toHaveCount(1);
		await chart.selectOption('return');
		for (const format of ['SVG', 'PNG']) {
			const pending = page.waitForEvent('download');
			await page.getByRole('button', { name: `Baixar ${format}`, exact: true }).click();
			const download = await pending;
			expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${format.toLowerCase()}$`));
			expect(await download.failure()).toBeNull();
		}
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
			path: `test-results/reconstruction-solar-${width}.png`,
			fullPage: true
		});
	});
}
