import { expect, test } from '@playwright/test';

for (const width of [1440, 820, 390, 320]) {
	test(`career compass preserves product parts and provenance at ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=career-compass');
		const consent = page.getByRole('button', { name: 'Recusar analytics' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('main')).toHaveCount(1);
		for (const name of [
			'Seu Meio do Céu — Fato [mc]',
			'Direção pública e contribuição — Hipótese [public-direction]',
			'Ambientes e modos de trabalhar — Hipótese [work-possibilities]',
			'Tensão ou excesso possível — Hipótese [tension-or-excess]',
			'Síntese (1) e três perguntas práticas'
		])
			await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		const reading = page.locator('#leitura');
		for (const question of [
			'Que contribuição quero observar?',
			'Em qual ambiente posso testá-la?',
			'Qual experimento reversível cabe nesta semana?'
		])
			await expect(reading).toContainText(question);
		await expect(reading).toContainText('Hipótese');
		await expect(reading).toContainText('Base: Meio do Céu (angle-midheaven)');
		const source = page.locator('#origem');
		await expect(source).toContainText('Contexto profissional relatado (personal-context)');
		await expect(source).toContainText('input.context');
		await expect(source).toContainText('atv-career-compass-calculation/1.0.0');
		await expect(source).toContainText('atv-product-delivery/1.3.0');
		await expect(source).toContainText('Somente signo e grau experimentais do Meio do Céu');
		await expect(source).toContainText('Fixture de apresentação');
		await expect(page.getByRole('button', { name: 'Baixar relatório web' })).toBeDisabled();
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toBeDisabled();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`career-compass-reader-${width}.png`),
			fullPage: true
		});
		await page.getByRole('link', { name: 'Histórico desta versão', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Histórico desta versão' })).toBeInViewport();
	});
}

test('career compass review, revocation and failure withhold reading and downloads', async ({
	page
}) => {
	for (const [state, name] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}&product=career-compass`);
		await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		await expect(page.locator('#leitura')).toHaveCount(0);
		await expect(page.locator('#origem')).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Baixar relatório web' })).toHaveCount(0);
	}
});
