import { expect, test } from '@playwright/test';

for (const width of [1440, 820, 390, 320]) {
	test(`workflow reader layout and recovery states ${width}`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready');
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('main')).toHaveCount(1);
		await expect(page.getByRole('heading', { name: 'Espaço para uma pergunta' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Solicitar nova versão' })).toBeDisabled();
		await expect(page.getByRole('button', { name: 'Baixar leitura' })).toBeDisabled();
		await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toBeDisabled();
		await expect(page.getByText('Salvar trechos nos meus registros', { exact: true })).toHaveCount(
			0
		);
		await expect(
			page.getByRole('link', { name: 'Lembrete por e-mail', exact: true })
		).toHaveAttribute('href', '#email');
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toHaveCount(0);
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`workflow-reader-${width}.png`),
			fullPage: true
		});
		await page.getByRole('link', { name: 'Histórico desta versão', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Histórico desta versão' })).toBeInViewport();
	});
}
for (const width of [1440, 820, 390, 320]) {
	test(`eligible PDF action remains synthetic and responsive ${width}`, async ({
		page
	}, testInfo) => {
		await page.setViewportSize({ width, height: 1000 });
		await page.goto('/biblioteca/_spec/fluxo?state=ready&format=pdf');
		const consent = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toBeDisabled();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.screenshot({
			path: testInfo.outputPath(`workflow-pdf-${width}.png`),
			fullPage: true
		});
		await page.goto('/biblioteca/_spec/fluxo?state=revoked&format=pdf');
		await expect(page.getByRole('button', { name: 'Baixar PDF', exact: true })).toHaveCount(0);
		await expect(
			page.getByRole('heading', { name: 'Lembrete por e-mail', exact: true })
		).toBeVisible();
		await expect(page.getByRole('button', { name: 'Solicitar e-mail' })).toBeDisabled();
	});
}
test('unapproved/revoked/failed results never masquerade as delivered readings', async ({
	page,
	request
}) => {
	for (const [state, label] of [
		['pending', 'Aguardando revisão editorial'],
		['revoked', 'Leitura temporariamente indisponível'],
		['failed', 'Processamento interrompido']
	]) {
		await page.goto(`/biblioteca/_spec/fluxo?state=${state}`);
		await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
		await expect(page.getByRole('heading', { name: 'Espaço para uma pergunta' })).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Baixar leitura' })).toHaveCount(0);
		await expect(page.getByText('Salvar trechos nos meus registros', { exact: true })).toHaveCount(
			0
		);
	}
	const response = await request.get('/api/workflows/00000000-0000-4000-8000-000000000001');
	expect([401, 503]).toContain(response.status());
	expect(response.headers()['cache-control']).toContain('no-store');
	expect(response.headers()['referrer-policy']).toBe('no-referrer');
});
