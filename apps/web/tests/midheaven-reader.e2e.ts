import { expect, test } from '@playwright/test';

const headings = [
	'Seu Meio do Céu — Fato [mc-fact]',
	'Direção pública e contribuição — Hipótese [midheaven-contribution]',
	'Ambientes e modos de trabalhar — Hipótese [midheaven-possibilities]',
	'Tensão ou excesso possível — Hipótese [midheaven-tension]',
	'Síntese do Meio do Céu (1) e três perguntas práticas'
];
for (const width of [1440, 820, 390, 320]) {
	test(`midheaven preserves its saved angle and full reading at ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=midheaven');
		const consent = page.getByRole('button', { name: 'Recusar analytics' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('main')).toHaveCount(1);
		for (const name of headings)
			await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		const reading = page.locator('#leitura');
		await expect(reading.getByRole('heading', { level: 3 })).toHaveCount(5);
		await expect(reading).toContainText('Base: Meio do Céu (angle-midheaven)');
		for (const question of [
			'Que contribuição pública quero observar?',
			'Em que ambiente posso testar essa contribuição?',
			'Qual experimento reversível cabe na minha rotina?'
		])
			await expect(reading).toContainText(question);
		const source = page.locator('#origem');
		for (const label of [
			'Meio do Céu (angle-midheaven)',
			'atv-product-delivery/1.11.0',
			'Fixture de apresentação',
			'parcial'
		])
			await expect(source).toContainText(label);
		await expect(source.locator('dt')).toHaveCount(1);
		await expect(page.getByRole('button', { name: 'Baixar relatório web' })).toBeDisabled();
		await expect(
			page.getByRole('button', { name: 'Baixar cartografia SVG', exact: true })
		).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Baixar card SVG', exact: true })).toBeDisabled();
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toBeDisabled();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`midheaven-reader-${width}.png`),
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
test('midheaven review, revocation and failure withhold reading and formats', async ({ page }) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=midheaven`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Baixar/ })).toHaveCount(0);
	}
});
