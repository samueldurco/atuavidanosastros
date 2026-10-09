import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	test(`Mapa Astral: seis assinaturas, quinze capítulos, formatos e contexto em ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=birth-chart');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(
			page.getByRole('heading', { name: 'Mapa Astral — assinaturas e temas de vida', exact: true })
		).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		const nav = page.getByRole('navigation', { name: 'Capítulos da leitura' });
		expect(await nav.getByRole('button').count()).toBe(15);
		let chapter = 0;
		for (const button of await nav.getByRole('button').all()) {
			const title = await button.innerText();
			await button.click();
			await expect(
				page.getByRole('article', { name: 'Capítulo selecionado' }).getByRole('heading')
			).toHaveText(title);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await page.getByRole('article', { name: 'Capítulo selecionado' }).screenshot({
				path: testInfo.outputPath(`reconstruction-birth-${width}-chapter-${++chapter}.png`)
			});
		}
		await expect(
			page.getByRole('link', { name: 'Guardar leitura em PDF', exact: true })
		).toBeVisible();
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
		expect(await download.failure()).toBeNull();
		await download.saveAs(testInfo.outputPath(`reconstruction-birth-${width}.svg`));
		await page
			.getByLabel('Sua anotação', { exact: true })
			.fill('Vou comparar duas formas de estudar e registrar o que consegui explicar.');
		let posted: Record<string, unknown> = {};
		await page.route('**/api/private-trials/*', async (route) => {
			if (route.request().method() === 'POST' && route.request().postDataJSON()?.action === 'note')
				posted = route.request().postDataJSON();
			await route.fulfill({ status: 200, json: { ok: true } });
		});
		await page.getByRole('button', { name: 'Salvar anotação desta etapa', exact: true }).click();
		await expect(page.getByText('Salvo na sua biblioteca privada.', { exact: true })).toBeVisible();
		expect(posted).toMatchObject({
			action: 'note',
			step: 0,
			text: 'Vou comparar duas formas de estudar e registrar o que consegui explicar.'
		});
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await nav.getByRole('button').first().click();
		await page.screenshot({
			path: testInfo.outputPath(`reconstruction-birth-${width}-map.png`),
			fullPage: true
		});
		await page.goto('/testar-produtos/_spec?product=birth-chart&birthContext=workload');
		await nav.getByRole('button').nth(12).click();
		await expect(page.getByRole('article', { name: 'Capítulo selecionado' })).toContainText(
			'Estou com sobrecarga e preciso preservar descanso.'
		);
		await nav.getByRole('button').nth(13).click();
		await expect(page.getByRole('article', { name: 'Capítulo selecionado' })).toContainText(
			'tempo disponível'
		);
		await page.screenshot({
			path: testInfo.outputPath(`reconstruction-birth-${width}-workload.png`),
			fullPage: true
		});
		await page.goto('/testar-produtos/_spec?product=birth-chart&view=intake');
		await expect(page.getByRole('heading', { name: /Mapa Astral/ }).first()).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await page.screenshot({
			path: testInfo.outputPath(`reconstruction-birth-${width}-intake.png`),
			fullPage: true
		});
	});
}
