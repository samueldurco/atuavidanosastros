import { chartImage, expectChartImage } from './chart-image';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [390, 1440]) {
	test(`Três Pilares: integração, funções, mapa, registro e entrada em ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=three-pillars');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(
			page.getByRole('heading', { name: 'Sol, Lua e Ascendente', exact: true })
		).toBeVisible();
		await expect(page.getByText('Há uma nova edição desta leitura', { exact: true })).toHaveCount(
			0
		);
		const nav = page.getByRole('navigation', { name: 'Capítulos da leitura' });
		expect(await nav.getByRole('button').count()).toBe(3);
		for (const [name, title] of [
			['Sol · expressão', 'O que faz sentido precisa também caber na sua vida'],
			['Lua · necessidades', 'O que faz sentido precisa também caber na sua vida'],
			['Ascendente · primeiro movimento', 'A maneira de começar e o trabalho de continuar']
		]) {
			await page.getByRole('button', { name: new RegExp(name) }).click();
			await expect(
				page.getByRole('article', { name: 'Capítulo selecionado' }).getByRole('heading')
			).toHaveText(title);
		}
		let chapter = 0;
		for (const button of await nav.getByRole('button').all()) {
			const title = await button.innerText();
			await button.click();
			await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true
			);
			await page.getByRole('article', { name: 'Capítulo selecionado' }).screenshot({
				path: testInfo.outputPath(`reconstruction-pillars-${width}-chapter-${++chapter}.png`)
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
		await expectChartImage(chartImage(page), 10);
		const pending = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Baixar SVG', exact: true }).click();
		const download = await pending;
		expect(await download.failure()).toBeNull();
		await download.saveAs(testInfo.outputPath(`reconstruction-pillars-${width}.svg`));
		await page
			.getByLabel('Sua anotação', { exact: true })
			.fill('Vou distinguir intenção, necessidade e convite em uma conversa breve.');
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
			text: 'Vou distinguir intenção, necessidade e convite em uma conversa breve.'
		});
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await nav.getByRole('button').first().click();
		await page.screenshot({
			path: testInfo.outputPath(`reconstruction-pillars-${width}-map.png`),
			fullPage: true
		});
		await page.goto('/testar-produtos/_spec?product=three-pillars&pillarsContext=workload');
		await nav
			.getByRole('button', {
				name: 'Quando continuar exige rever o tamanho do esforço',
				exact: true
			})
			.click();
		await expect(page.getByRole('article', { name: 'Capítulo selecionado' })).toContainText(
			/sobrecarga|descanso/
		);
		await page.screenshot({
			path: testInfo.outputPath(`reconstruction-pillars-${width}-workload.png`),
			fullPage: true
		});
		await page.goto('/testar-produtos/_spec?product=three-pillars&view=intake');
		await expect(
			page.getByRole('heading', { name: /Sol, Lua e Ascendente/ }).first()
		).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await page.screenshot({
			path: testInfo.outputPath(`reconstruction-pillars-${width}-intake.png`),
			fullPage: true
		});
	});
}

for (const width of [320, 820]) {
	test(`Três Pilares: leitor editorial, teclado e acessibilidade em ${width}px`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/testar-produtos/_spec?product=three-pillars');
		await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
		await expect(page.locator('.page-intro .product-cover .product-art')).toBeVisible();
		await expect(
			page.getByText('A ilustração da capa é decorativa;', { exact: false })
		).toBeVisible();
		const nav = page.getByRole('navigation', { name: 'Capítulos da leitura' });
		await expect(nav.getByRole('button')).toHaveCount(3);
		const article = page.getByRole('article', { name: 'Capítulo selecionado' });
		expect(await article.locator('.chapter-prose p').count()).toBeGreaterThan(1);
		const nextChapter = nav.getByRole('button').nth(1);
		await nextChapter.focus();
		await expect(nextChapter).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(nextChapter).toHaveAttribute('aria-current', 'step');
		await expect(article.getByRole('heading')).toHaveText(await nextChapter.innerText());
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true
		);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await page.screenshot({
			path: testInfo.outputPath(`reconstruction-pillars-e4-${width}.png`),
			fullPage: true
		});
	});
}

test('Três Pilares: texto ampliado a 200% preserva navegação e leitura', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/testar-produtos/_spec?product=three-pillars');
	await page.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
	await page.evaluate(() => {
		document.documentElement.style.fontSize = '200%';
	});
	await expect(page.getByRole('navigation', { name: 'Capítulos da leitura' })).toBeVisible();
	await expect(page.getByRole('article', { name: 'Capítulo selecionado' })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
