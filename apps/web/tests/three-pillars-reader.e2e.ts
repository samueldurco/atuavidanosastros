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
			'Seu Sol — Fato [pillar-0]',
			'Sua Lua — Fato [pillar-1]',
			'Seu Ascendente — Fato [pillar-2]',
			'Sol e Lua: intenção e necessidade — Hipótese [sun-moon-dynamics]',
			'Ascendente: abordagem e expressão — Hipótese [ascendant-expression]',
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
		await expect(reading).toContainText(
			'Base: Sol (position-sun) · Lua (position-moon) · Ascendente (angle-ascendant)'
		);
		const source = page.locator('#origem');
		for (const label of [
			'Sol (position-sun)',
			'Lua (position-moon)',
			'Ascendente (angle-ascendant)',
			'Contexto pessoal relatado (personal-context)',
			'input.context',
			'atv-product-delivery/1.18.0',
			'Fixture de apresentação'
		])
			await expect(source).toContainText(label);
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
