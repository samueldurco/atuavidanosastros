import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	test(`Bússola: síntese, contexto, mapa, registro e entrada em ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=career-compass');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(
			page.getByRole('heading', { name: 'Bússola de Carreira', exact: true })
		).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		const nav = page.getByRole('navigation', { name: 'Capítulos da leitura' });
		expect(await nav.getByRole('button').count()).toBe(11);
		let chapter = 0;
		for (const button of await nav.getByRole('button').all()) {
			const title = await button.innerText();
			await button.click();
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await page.getByRole('article', { name: 'Capítulo selecionado' }).screenshot({
				path: testInfo.outputPath(`reconstruction-compass-${width}-chapter-${++chapter}.png`)
			});
		}
		await expect(
			page.getByRole('link', { name: 'Guardar leitura em PDF', exact: true })
		).toHaveCount(0);
		await expect(
			page.getByRole('link', { name: 'Guardar uma cópia em texto', exact: true })
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
		await download.saveAs(testInfo.outputPath(`reconstruction-compass-${width}.svg`));
		await page
			.getByLabel('Sua anotação', { exact: true })
			.fill('Vou comparar duas tarefas acessíveis, com vinte minutos e sem despesa.');
		let posted: Record<string, unknown> = {};
		await page.route('**/api/private-trials/*', async (route) => {
			if (route.request().method() === 'POST' && route.request().postDataJSON()?.action === 'note')
				posted = route.request().postDataJSON();
			await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
		});
		await page.getByRole('button', { name: 'Salvar anotação desta etapa', exact: true }).click();
		await expect(page.getByText('Salvo na sua biblioteca privada.', { exact: true })).toBeVisible();
		expect(posted).toMatchObject({
			action: 'note',
			step: 0,
			text: 'Vou comparar duas tarefas acessíveis, com vinte minutos e sem despesa.'
		});
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await nav.getByRole('button').first().click();
		await page.screenshot({
			path: testInfo.outputPath(`reconstruction-compass-${width}-map.png`),
			fullPage: true
		});
		for (const [context, theme] of [
			['study', 'Motivação:'],
			['workload', 'Sustentação:']
		]) {
			await page.goto(`/testar-produtos/_spec?product=career-compass&compassContext=${context}`);
			await expect(nav.getByRole('button').nth(2)).toContainText(theme);
			await nav.getByRole('button').nth(1).click();
			await page.screenshot({
				path: testInfo.outputPath(`reconstruction-compass-${width}-${context}.png`),
				fullPage: true
			});
		}
		await page.goto('/testar-produtos/_spec?product=career-compass&view=intake');
		await expect(page.getByRole('heading', { name: /Bússola de Carreira/ }).first()).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await page.screenshot({
			path: testInfo.outputPath(`reconstruction-compass-${width}-intake.png`),
			fullPage: true
		});
	});
}
