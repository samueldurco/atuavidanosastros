import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [1440, 820, 390, 320]) {
	test(`three pillars preserve the joint reading and its bases at ${width}`, async ({
		page
	}, testInfo) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=three-pillars');
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('main')).toHaveCount(1);
		await expect(page.locator('.page-intro .product-cover .product-art')).toBeVisible();
		const chapterLinks = page.locator('.reader-index a[href^="#capitulo-"]');
		const chapters = page.locator('#leitura article[id^="capitulo-"]');
		expect(await chapterLinks.count()).toBe(await chapters.count());
		expect(await chapters.count()).toBeGreaterThan(6);
		await chapterLinks.first().focus();
		await expect(chapterLinks.first()).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/#capitulo-1$/);
		await expect(chapters.first().getByRole('heading')).toBeInViewport();
		await expect(page.locator('#leitura .reading-intro')).toContainText('dados calculados');
		await expect(page.locator('#historico')).toContainText('A leitura em HTML é gerada');
		for (const name of [
			'Seu Sol — Fato',
			'Sua Lua — Fato',
			'Seu Ascendente — Fato',
			'Sol e Lua: intenção e necessidade — Hipótese',
			'Ascendente: abordagem e expressão — Hipótese',
			'Relações (1)',
			'Síntese dos Três Pilares (1) e três perguntas práticas'
		])
			await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		const reading = page.locator('#leitura');
		for (const question of [
			'Que intenção quero observar?',
			'Qual necessidade pede espaço?',
			'Qual abordagem posso experimentar de modo reversível?'
		])
			await expect(reading).toContainText(question);
		await expect(reading).toContainText('Base: Sol · Lua · Ascendente');
		await expect(reading).not.toContainText(
			/pillar-[0-2]|sun-moon-dynamics|ascendant-expression|position-sun|position-moon|angle-ascendant|personal-context/
		);
		const source = page.locator('#origem');
		for (const label of ['Sol', 'Lua', 'Ascendente', 'Contexto pessoal relatado'])
			await expect(source.locator(':scope > dl dt', { hasText: label })).toBeVisible();
		const technical = source.locator('details.technical-details');
		const summary = technical.locator('summary');
		await expect(summary).toBeVisible();
		await expect(technical.locator('code', { hasText: 'position-sun' })).toBeHidden();
		await summary.focus();
		await expect(summary).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(technical).toHaveAttribute('open', '');
		for (const item of ['position-sun', 'input.context', 'atv-product-delivery/1.18.0'])
			await expect(technical).toContainText(item);
		await expect(technical.locator('code', { hasText: 'position-sun' })).toBeVisible();
		await page.keyboard.press('Enter');
		await expect(technical).not.toHaveAttribute('open', '');
		await expect(source).toContainText('Fixture de apresentação');
		await expect(source).toContainText('parcial');
		await expect(page.getByRole('button', { name: 'Baixar leitura' })).toBeDisabled();
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toBeDisabled();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		expect(
			(await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
				.violations
		).toEqual([]);
		await page.getByRole('link', { name: 'Histórico desta versão', exact: true }).focus();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/#historico$/);
		await expect(page.getByRole('heading', { name: 'Histórico desta versão' })).toBeInViewport();
		await page.screenshot({
			path: testInfo.outputPath(`three-pillars-reader-${width}.png`),
			fullPage: true
		});
		await page.reload();
		await expect(
			page.getByRole('heading', {
				name: 'Síntese dos Três Pilares (1) e três perguntas práticas',
				exact: true
			})
		).toBeVisible();
	});
}

test('three pillars free and library readers use the approved ink focus', async ({ page }) => {
	for (const [url, selector] of [
		[
			'/testar-produtos/_spec?product=three-pillars&pillarsProfile=lia&pillarsContext=workload',
			".mvp-private[data-mvp-private='experience'][data-product='three-pillars'] .pillars button"
		],
		[
			'/biblioteca/_spec/fluxo?state=ready&product=three-pillars',
			".mvp-private[data-mvp-private='product-reader'][data-product='three-pillars'] .reader-index a"
		]
	] as const) {
		await page.goto(url);
		const focusTarget = page.locator(selector).first();
		await expect(focusTarget).toBeEnabled();
		await focusTarget.focus();
		await expect(focusTarget).toBeFocused();
		await expect(focusTarget).toHaveCSS('outline-style', 'solid');
		await expect(focusTarget).toHaveCSS('outline-width', '3px');
		await expect(focusTarget).toHaveCSS('outline-color', 'rgb(24, 55, 70)');
		await expect(focusTarget).toHaveCSS('outline-offset', '4px');
		await expect(focusTarget).toHaveCSS('box-shadow', 'rgb(255, 248, 233) 0px 0px 0px 7px');
	}
});

test('three pillars pending review, revocation and failure withhold the reading', async ({
	page
}) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=three-pillars`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Baixar leitura' })).toHaveCount(0);
	}
});
