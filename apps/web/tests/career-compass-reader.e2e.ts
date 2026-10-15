import { expect, test } from '@playwright/test';

for (const width of [1440, 820, 390, 320]) {
	test(`career compass preserves product parts and provenance at ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&product=career-compass');
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('main')).toHaveCount(1);
		await expect(page.locator('.career-hero .product-art-compass')).toBeVisible();
		await expect(
			page.locator('.career-hero image[href="/brand/mvp/assets/revisao/bussola-gravada.webp"]')
		).toHaveCount(1);
		for (const name of [
			'Seu Meio do Céu',
			'Uma direção para experimentar',
			'Onde testar essa direção',
			'O que observar antes de decidir',
			'Um próximo passo para considerar'
		])
			await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
		const reading = page.locator('#leitura');
		for (const question of [
			'Que contribuição quero observar?',
			'Em qual ambiente posso testá-la?',
			'Qual experimento reversível cabe nesta semana?'
		])
			await expect(reading).toContainText(question);
		await expect(reading).toContainText('Fixture estrutural');
		await expect(reading).toContainText('Base desta parte: Meio do Céu');
		const source = page.locator('#origem');
		await source.getByText('Consultar dados usados nesta leitura').click();
		await expect(source).toContainText('Meio do Céu');
		await expect(source).toContainText('Os fatos calculados foram preservados');
		await expect(source).toContainText('Esta leitura usa uma base parcial do mapa');
		await expect(source).toContainText('Fixture de apresentação');
		await expect(page.getByRole('button', { name: 'Baixar leitura' })).toBeDisabled();
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
		await expect(page.getByRole('button', { name: 'Baixar leitura' })).toHaveCount(0);
	}
});
