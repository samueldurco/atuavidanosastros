import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for (const width of [390, 1440]) {
	test(`Atlas 360: priority clusters, full book and private path at ${width}px`, async ({
		page
	}) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=life-atlas');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(
			page.getByRole('heading', { name: 'Atlas da Vida 360', exact: true })
		).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		const navigation = page.getByRole('navigation', { name: 'Capítulos da leitura' });
		const titles = (await navigation.getByRole('button').allTextContents()).map((t) => t.trim());
		expect(titles).toHaveLength(14);
		expect(new Set(titles).size).toBe(14);
		expect(titles).toContain('1. Autocuidado e rotina: funções que merecem atenção');
		expect(titles).toContain('3. Trabalho e contribuição: uma experiência possível');
		for (const button of await navigation.getByRole('button').all()) {
			const title = await button.innerText();
			await button.click();
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
		}
		await navigation
			.getByRole('button', { name: 'Seu percurso de trinta dias', exact: true })
			.click();
		await expect(
			page.getByRole('heading', { name: 'Seu percurso de trinta dias', exact: true })
		).toBeVisible();
		await page
			.locator('summary')
			.filter({ hasText: 'Explore seu mapa e os capítulos relacionados' })
			.click();
		await expect(page.locator('svg [data-layer="positions"]')).toHaveCount(10);
		const pending = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Baixar SVG', exact: true }).click();
		const download = await pending;
		expect(download.suggestedFilename()).toMatch(/\.svg$/);
		expect(await download.failure()).toBeNull();
		await download.saveAs(`test-results/reconstruction-atlas-${width}.svg`);
		await expect(
			page.getByRole('link', { name: 'Guardar leitura em PDF', exact: true })
		).toBeVisible();
		await expect(
			page.getByRole('link', { name: 'Guardar uma cópia em texto', exact: true })
		).toBeVisible();
		const notes = page.getByRole('region', { name: 'Suas anotações e acompanhamento' });
		expect(
			await notes.getByRole('combobox', { name: 'Etapa' }).locator('option').allTextContents()
		).toEqual(['Ponto de partida', 'Dia 7', 'Dia 14', 'Dia 21', 'Dia 30']);
		let payload: unknown;
		await page.route('**/api/private-trials/*', async (route) => {
			payload = route.request().postDataJSON();
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ ok: true })
			});
		});
		await notes.getByRole('combobox', { name: 'Etapa' }).selectOption('21');
		await notes
			.getByRole('textbox', { name: 'Sua anotação' })
			.fill('Observei uma tarefa; a condição de tempo mudou; vou reduzir o escopo.');
		await notes.getByRole('button', { name: 'Salvar anotação desta etapa' }).click();
		await expect
			.poll(() => payload)
			.toMatchObject({
				action: 'note',
				step: 21,
				text: 'Observei uma tarefa; a condição de tempo mudou; vou reduzir o escopo.'
			});
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await navigation.getByRole('button').first().click();
		await page.screenshot({
			path: `test-results/reconstruction-atlas-${width}.png`,
			fullPage: true
		});
		await page.goto('/testar-produtos/_spec?product=life-atlas&atlasSet=other&atlasNotes=complete');
		await expect(
			navigation.getByRole('button', {
				name: '1. Recursos e autonomia: funções que merecem atenção',
				exact: true
			})
		).toBeVisible();
		await expect(
			navigation.getByRole('button', {
				name: '4. Redes e projetos: uma experiência possível',
				exact: true
			})
		).toBeVisible();
		await expect(notes.getByRole('heading', { name: 'Dia 21', exact: true })).toBeVisible();
		await expect(
			notes.getByText(
				'Dia 21: observei uma tarefa, preservei meu limite e registrei uma evidência contrária.',
				{ exact: true }
			)
		).toBeVisible();
		await page.screenshot({
			path: `test-results/reconstruction-atlas-reopened-${width}.png`,
			fullPage: true
		});
		await page.goto('/testar-produtos/_spec?product=life-atlas&view=intake');
		const priorities = page.getByRole('group', { name: 'Quatro prioridades para este pedido' });
		await expect(priorities.getByRole('combobox')).toHaveCount(4);
		const choices = [
			'Autocuidado e rotina',
			'Vínculos e acordos',
			'Trabalho e contribuição',
			'Aprendizado e expressão'
		];
		for (const [index, choice] of choices.entries())
			await priorities
				.getByRole('combobox', { name: `Prioridade ${index + 1}` })
				.selectOption(choice);
		await expect(
			priorities
				.getByRole('combobox', { name: 'Prioridade 2' })
				.getByRole('option', { name: choices[0], exact: true })
		).toHaveJSProperty('disabled', true);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await page.screenshot({
			path: `test-results/reconstruction-atlas-intake-${width}.png`,
			fullPage: true
		});
	});
}
