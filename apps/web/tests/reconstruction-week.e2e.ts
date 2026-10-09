import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	test(`Semana: seven dates, unique movements and saved daily skies at ${width}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=week-reading');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(
			page.getByRole('heading', { name: 'Previsões da Semana', exact: true })
		).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		const timeline = page.getByRole('navigation', { name: 'Linha do tempo da semana' });
		await expect(timeline.getByRole('button')).toHaveCount(7);
		const dates = (await timeline.getByRole('button').allTextContents()).map((t) => t.trim());
		expect(new Set(dates).size).toBe(7);
		for (const button of await timeline.getByRole('button').all()) {
			const title = await button.innerText();
			await button.click();
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
			await expect(button).toHaveAttribute('aria-current', 'date');
		}
		await page.getByText('Explore seu mapa e os capítulos relacionados', { exact: true }).click();
		const svg = page.locator('svg[data-engine="AstroChartEngineV2/2.0.0"]');
		await expect(svg).toBeVisible();
		await expect(svg.locator('[data-layer="positions"]')).toHaveCount(20);
		await expect(
			svg
				.locator('text[data-layer="heading"]')
				.filter({ hasText: 'Sua semana · céu da data e mapa natal' })
		).toBeVisible();
		const picker = page.getByRole('combobox', { name: 'Data do céu apresentado', exact: true });
		await expect(picker.locator('option')).toHaveCount(7);
		const firstGeometry = await svg
			.locator('[data-layer="positions"]')
			.evaluateAll((nodes) => nodes.map((n) => n.outerHTML).join(''));
		await picker.selectOption('6');
		await expect(page.getByRole('heading', { name: dates[6], exact: true })).toBeVisible();
		expect(
			await svg
				.locator('[data-layer="positions"]')
				.evaluateAll((nodes) => nodes.map((n) => n.outerHTML).join(''))
		).not.toBe(firstGeometry);
		await page.getByRole('combobox', { name: 'Aspectos', exact: true }).selectOption('none');
		await expect(svg.locator('[data-layer="aspects"]')).toHaveCount(0);
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
		expect(titles[0]).toBe('O tema que atravessa a semana');
		expect(titles).toContain('Continuidade e mudanças de ritmo');
		expect(titles).toContain('Prioridades e realização');
		expect(titles).toContain('Relações e acordos');
		expect(titles).toContain('Cuidado e sustentação');
		expect(titles).not.toContain('Referências desta leitura');
		expect(new Set(titles).size).toBe(titles.length);
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
			path: `test-results/reconstruction-week-${width}.png`,
			fullPage: true
		});
	});
}
