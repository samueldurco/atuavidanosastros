import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Current offer: a rolling 30-day period, distinct from saved civil-month editions.

for (const width of [390, 1440]) {
	test(`Calendário: 30 datas acessíveis, capítulos e céus calculados em ${width}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=personal-calendar');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(
			page.getByRole('heading', { name: 'Calendário de Previsões — Próximos 30 Dias', exact: true })
		).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		const calendar = page.getByRole('region', { name: 'Calendário dos próximos 30 dias' });
		await expect(calendar.getByRole('button')).toHaveCount(30);
		let highlightedDates = 0;
		for (const button of await calendar.getByRole('button').all()) {
			const label = (await button.getAttribute('aria-label'))!;
			const date = label.slice(0, 10);
			const quiet = /: 0 sinais/.test(label);
			if (!quiet) highlightedDates++;
			await button.click();
			await expect(button).toHaveAttribute('aria-current', 'date');
			await expect(calendar.locator('[aria-current="date"]')).toHaveCount(1);
			await expect(
				page.getByRole('heading', {
					name: quiet ? 'Datas sem um novo destaque selecionado' : `${date} — contatos em destaque`,
					exact: true
				})
			).toBeVisible();
		}
		await expect(calendar.getByRole('button', { name: /^15\/01\/2026:/ })).toHaveAttribute(
			'aria-label',
			/marco informado/
		);
		const navigation = page.getByRole('navigation', { name: 'Capítulos da leitura' });
		await navigation.getByRole('button', { name: 'As datas que você marcou', exact: true }).click();
		await expect(page.getByRole('article', { name: 'Capítulo selecionado' })).toContainText(
			'15/01/2026 — Revisão de prioridades com a equipe'
		);
		await expect(page.getByRole('article', { name: 'Capítulo selecionado' })).toContainText(
			'não aumenta o peso astrológico da data'
		);
		expect(
			(await navigation.getByRole('button').allTextContents()).filter((t) =>
				/^\d{2}\/01\/2026/.test(t.trim())
			)
		).toHaveLength(highlightedDates);
		await page
			.locator('summary')
			.filter({ hasText: 'Explore seu mapa e os capítulos relacionados' })
			.click();
		const dates = page.getByRole('combobox', { name: 'Data do céu apresentado', exact: true });
		await expect(dates.locator('option')).toHaveCount(30);
		await dates.selectOption('29');
		await expect(calendar.getByRole('button', { name: /^30\/01\/2026:/ })).toHaveAttribute(
			'aria-current',
			'date'
		);
		await expect(calendar.locator('[aria-current="date"]')).toHaveCount(1);
		await expect(
			page.locator('svg [data-layer="positions"][data-fact-id="calendar-position-2026-01-30-moon"]')
		).toHaveCount(1);
		const finalDateLabel = await calendar
			.getByRole('button', { name: /^30\/01\/2026:/ })
			.getAttribute('aria-label');
		await expect(
			page.getByRole('heading', {
				name: /: 0 sinais/.test(finalDateLabel ?? '')
					? 'Datas sem um novo destaque selecionado'
					: '30/01/2026 — contatos em destaque',
				exact: true
			})
		).toBeVisible();
		await dates.selectOption('0');
		await expect(calendar.getByRole('button', { name: /^01\/01\/2026:/ })).toHaveAttribute(
			'aria-current',
			'date'
		);
		await expect(calendar.locator('[aria-current="date"]')).toHaveCount(1);
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
		await calendar.getByRole('button', { name: /^15\/01\/2026:/ }).click();
		await page.screenshot({
			path: `test-results/reconstruction-calendar-${width}.png`,
			fullPage: true
		});
	});
}
