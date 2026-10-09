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
			page.getByRole('heading', { name: 'Mapa de Propósito & Carreira', exact: true })
		).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		const navigation = page.getByRole('navigation', { name: 'Capítulos da leitura' });
		const titles = (await navigation.getByRole('button').allTextContents()).map((t) => t.trim());
		expect(titles.length).toBeGreaterThanOrEqual(15);
		expect(new Set(titles).size).toBe(titles.length);
		expect(titles).toContain('A direção pública e o caminho de seu regente');
		expect(titles).toContain('Recursos: o que sustenta sua margem de escolha');
		for (const button of await navigation.getByRole('button').all()) {
			const title = await button.innerText();
			await button.click();
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
		}
		await navigation
			.getByRole('button', { name: 'Rever uma direção sem perder o chão', exact: true })
			.click();
		await expect(
			page.getByText(/Quero mudar de área e testar uma contribuição/).first()
		).toBeVisible();
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
