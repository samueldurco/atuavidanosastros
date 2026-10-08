import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	test(`Calendário: 31 accessible dates, corresponding chapters and actual noon skies at ${width}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=personal-calendar');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(
			page.getByRole('heading', { name: 'Calendário Pessoal', exact: true })
		).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		const calendar = page.getByRole('region', { name: 'Calendário do mês' });
		await expect(calendar.getByRole('button')).toHaveCount(31);
		for (const button of await calendar.getByRole('button').all()) {
			const day = Number((await button.getAttribute('aria-label'))!.split(' ')[0]);
			await button.click();
			await expect(button).toHaveAttribute('aria-current', 'date');
			await expect(
				page.getByRole('heading', {
					name: new RegExp(`^${String(day).padStart(2, '0')}/01/2026 · [0-3] sina`)
				})
			).toBeVisible();
		}
		await calendar.getByRole('button', { name: /^15 de / }).click();
		await expect(
			page.getByText(/Marco que você trouxe: Revisão de prioridades com a equipe/)
		).toBeVisible();
		const navigation = page.getByRole('navigation', { name: 'Capítulos da leitura' });
		expect(
			(await navigation.getByRole('button').allTextContents()).filter((t) =>
				/^\d{2}\/01\/2026/.test(t.trim())
			)
		).toHaveLength(31);
		await page
			.locator('summary')
			.filter({ hasText: 'Explore seu mapa e os capítulos relacionados' })
			.click();
		const dates = page.getByRole('combobox', { name: 'Data do céu apresentado', exact: true });
		await expect(dates.locator('option')).toHaveCount(31);
		await dates.selectOption('30');
		await expect(
			page.locator('svg [data-layer="positions"][data-fact-id="calendar-position-2026-01-31-moon"]')
		).toHaveCount(1);
		await expect(page.getByRole('heading', { name: /^31\/01\/2026 ·/ })).toBeVisible();
		await dates.selectOption('0');
		await expect(
			page.locator('svg [data-layer="positions"][data-fact-id="calendar-position-2026-01-01-moon"]')
		).toHaveCount(1);
		const pending = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Baixar SVG', exact: true }).click();
		expect(await (await pending).failure()).toBeNull();
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
		await page.locator('.map').screenshot({
			path: `test-results/reconstruction-calendar-chart-${width}.png`
		});
		await page
			.locator('summary')
			.filter({ hasText: 'Explore seu mapa e os capítulos relacionados' })
			.click();
		await calendar.getByRole('button', { name: /^15 de / }).click();
		await page.screenshot({
			path: `test-results/reconstruction-calendar-${width}.png`,
			fullPage: true
		});
	});
}
