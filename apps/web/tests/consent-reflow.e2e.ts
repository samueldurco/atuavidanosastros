import { expect, test } from '@playwright/test';

for (const viewport of [
	{ name: 'janela curta', width: 320, height: 200 },
	{ name: 'paisagem', width: 568, height: 320 },
	{ name: 'mobile', width: 320, height: 844 }
]) {
	test(`consentimento acessível: ${viewport.name}`, async ({ page }, testInfo) => {
		await page.setViewportSize(viewport);
		await page.goto('/');
		await page.evaluate(() => document.fonts.ready);
		const banner = page.getByRole('complementary', { name: 'Preferências de cookies' });
		await expect(banner).toBeVisible();
		const box = await banner.boundingBox();
		expect(box!.y).toBeGreaterThanOrEqual(0);
		expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
		expect(await banner.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
		const title = banner.locator('strong');
		await title.scrollIntoViewIfNeeded();
		const titleBox = await title.boundingBox();
		expect(titleBox!.y).toBeGreaterThanOrEqual(box!.y);
		expect(titleBox!.y + titleBox!.height).toBeLessThanOrEqual(box!.y + box!.height);
		await page.screenshot({ path: testInfo.outputPath('consent-explanation.png') });
		await expect(banner).toContainText('Analytics só é carregado se você aceitar');
		const policy = banner.getByRole('link', { name: 'Privacidade e cookies' });
		await expect(policy).toHaveAttribute('href', '/privacidade');
		await policy.focus();
		await expect(policy).toBeFocused();
		for (const name of ['Recusar analytics', 'Aceitar analytics']) {
			await page.keyboard.press('Tab');
			const button = banner.getByRole('button', { name, exact: true });
			await expect(button).toBeFocused();
			const buttonBox = await button.boundingBox();
			expect(buttonBox!.y).toBeGreaterThanOrEqual(box!.y);
			expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(box!.y + box!.height);
		}
		await page.keyboard.press('Shift+Tab');
		await expect(
			banner.getByRole('button', { name: 'Recusar analytics', exact: true })
		).toBeFocused();
		await page.screenshot({ path: testInfo.outputPath('consent-actions.png') });
		await page.keyboard.press('Enter');
		await expect(banner).not.toBeVisible();
		expect(await page.evaluate(() => localStorage.getItem('atv-analytics-consent'))).toBe('denied');
		await page.reload();
		await expect(banner).not.toBeVisible();
	});
}
