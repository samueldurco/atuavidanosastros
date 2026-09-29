import { expect, test } from '@playwright/test';

const headings = [
	'Seu Ascendente — Fato [asc-fact]',
	'Abordagem e primeiro contato — Hipótese [ascendant-approach]',
	'Possibilidades de expressão — Hipótese [ascendant-possibilities]',
	'Tensão ou excesso possível — Hipótese [ascendant-tension]',
	'Síntese do Ascendente (1) e três perguntas práticas'
];
for (const width of [1440, 820, 390, 320]) {
	test(`ascendant preserves its saved angle and full reading at ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=ascendant');
		const consent = page.getByRole('button', { name: 'Recusar analytics' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('main')).toHaveCount(1);
		for (const name of headings)
			await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		const reading = page.locator('#leitura');
		await expect(reading.getByRole('heading', { level: 3 })).toHaveCount(5);
		await expect(reading).toContainText('Base: Ascendente (angle-ascendant)');
		for (const question of [
			'Como quero iniciar um primeiro contato?',
			'Que alternativa de iniciativa posso observar?',
			'Qual experimento reversível ajuda a ajustar minha abordagem?'
		])
			await expect(reading).toContainText(question);
		const source = page.locator('#origem');
		for (const label of [
			'Ascendente (angle-ascendant)',
			'atv-product-delivery/1.13.0',
			'Fixture de apresentação',
			'parcial'
		])
			await expect(source).toContainText(label);
		await expect(source.locator('dt')).toHaveCount(1);
		await expect(page.getByRole('button', { name: 'Baixar relatório web' })).toBeDisabled();
		await expect(
			page.getByRole('button', { name: 'Baixar cartografia SVG', exact: true })
		).toBeDisabled();
		await expect(page.getByRole('button', { name: 'Baixar card SVG', exact: true })).toBeDisabled();
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toBeDisabled();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`ascendant-reader-${width}.png`),
			fullPage: true
		});
		const historyLink = page.getByRole('link', { name: 'Histórico desta versão', exact: true });
		await historyLink.scrollIntoViewIfNeeded();
		await historyLink.focus();
		await expect(historyLink).toBeFocused();
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/#historico$/);
		await expect(page.getByRole('heading', { name: 'Histórico desta versão' })).toBeInViewport();
		await page.reload();
		await expect(page.getByRole('heading', { name: headings[4], exact: true })).toBeVisible();
	});
}
test('ascendant review, revocation and failure withhold reading and formats', async ({ page }) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=ascendant`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Baixar/ })).toHaveCount(0);
	}
});
