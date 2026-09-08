import { expect, test } from '@playwright/test';

for (const viewport of [
	{ width: 1440, height: 1000 },
	{ width: 820, height: 1180 },
	{ width: 390, height: 844 },
	{ width: 320, height: 800 }
]) {
	test(`leitor recuperável: composição ${viewport.width}`, async ({ page }, testInfo) => {
		await page.setViewportSize(viewport);
		await page.goto('/biblioteca/_spec/leitor');
		const consent = page.getByRole('button', { name: 'Recusar analytics' });
		if (await consent.isVisible()) await consent.click();
		await page.evaluate(() => document.fonts.ready);
		await expect(page.getByRole('heading', { level: 1 })).toContainText('referência sintética');
		await expect(page.getByRole('main')).toHaveCount(1);
		await expect(page.getByText('Capricórnio', { exact: true })).toBeVisible();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
		).toBeLessThanOrEqual(1);
		await page.getByRole('link', { name: 'Origem e método', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Origem e método' })).toBeInViewport();
		await page.goto('/biblioteca/_spec/leitor');
		await page.screenshot({
			path: testInfo.outputPath(`reader-${viewport.width}.png`),
			fullPage: true
		});
	});
}
test('leitor diferencia erro, formato indisponível e limitação de método', async ({ page }) => {
	await page.goto('/biblioteca/_spec/leitor?state=unavailable');
	await expect(page.getByRole('alert')).toContainText('Não foi possível recuperar');
	await expect(page.getByText('Capricórnio', { exact: true })).toHaveCount(0);
	await page.goto('/biblioteca/_spec/leitor?state=unsupported');
	await expect(
		page.getByRole('heading', { name: 'Este formato ainda não tem um leitor disponível.' })
	).toBeVisible();
	await page.goto('/biblioteca/_spec/leitor?state=partial');
	await expect(page.getByRole('heading', { name: 'Há uma limitação de método.' })).toBeVisible();
});
test('coleção aponta para item e acesso sem sessão volta à entrada', async ({ page, request }) => {
	await page.goto('/biblioteca/_spec');
	const first = page.getByRole('link', { name: /Abrir Bússola/ }).first();
	await expect(first).toHaveAttribute('href', /\/biblioteca\/[0-9a-f-]{36}/);
	await first.click();
	await expect(page).toHaveURL(/\/entrar$/);
	const privateResponse = await request.get('/biblioteca/00000000-0000-0000-0000-000000000001', {
		maxRedirects: 0
	});
	expect(privateResponse.status()).toBe(303);
	expect(privateResponse.headers()['cache-control']).toContain('no-store');
	expect(privateResponse.headers()['referrer-policy']).toBe('no-referrer');
	const response = await request.post('/api/astrology/midheaven', {
		headers: { 'content-type': 'application/json' },
		data: '{broken'
	});
	expect(response.status()).toBe(400);
});
