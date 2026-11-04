import { expect, test } from '@playwright/test';

const label = 'Fazer uma consulta pelo WhatsApp';
for (const viewport of [
	{ width: 1440, height: 900 },
	{ width: 390, height: 844 },
	{ width: 320, height: 568 }
]) {
	test(`entrada flutuante e consentimento ${viewport.width}`, async ({ page }, testInfo) => {
		await page.setViewportSize(viewport);
		await page.goto('/');
		const cta = page.getByRole('link', { name: label, exact: true });
		await expect(cta).toBeHidden();
		await page.getByRole('button', { name: 'Recusar opcionais' }).click();
		await expect(cta).toBeVisible();
		const box = (await cta.boundingBox())!;
		expect(box.x).toBeGreaterThanOrEqual(0);
		expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
		expect(box.height).toBeGreaterThanOrEqual(44);
		await page.screenshot({ path: testInfo.outputPath(`entrada-${viewport.width}.png`) });
		await page.evaluate(() => scrollTo(0, 1200));
		await expect(cta).toBeVisible();
		expect(Math.round((await cta.boundingBox())!.y)).toBe(Math.round(box.y));
		if (viewport.width < 600) {
			await page.getByRole('button', { name: 'Menu', exact: true }).click();
			await expect(cta).toBeHidden();
		}
	});
}

test('clique revalida canal e abre somente WhatsApp; fichas preservam compra', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
	await page.goto('/leituras');
	await page.route('https://wa.me/**', (route) =>
		route.fulfill({ status: 200, body: 'WhatsApp de teste local: nenhum envio' })
	);
	await page.getByRole('link', { name: label, exact: true }).click();
	await expect(page).toHaveURL(/^https:\/\/wa.me\/5511999999999\?text=/);
	await page.goto('/produtos/analise-astral-do-casal');
	const cta = page.getByRole('link', { name: label, exact: true });
	await page.locator('#disponibilidade').scrollIntoViewIfNeeded();
	await expect(cta).toBeHidden();
	await page.goto('/privacidade');
	await expect(cta).toHaveCount(0);
});
