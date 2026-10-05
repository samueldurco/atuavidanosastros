import { expect, test } from '@playwright/test';

test('legal documents render publicly with contact and canonical links', async ({
	page,
	request
}) => {
	for (const [path, title] of [
		['termos', 'Termos de uso'],
		['privacidade', 'Política de Privacidade']
	]) {
		const response = await request.get(`/${path}`);
		expect(response.status()).toBe(200);
		const html = await response.text();
		expect(html).toContain(title);
		expect(html).not.toContain('Estamos preparando experiências');
		await page.goto(`/${path}`);
		await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
		await expect(
			page.locator('article a[href="mailto:suporte@atuavidanosastros.com.br"]')
		).toBeVisible();
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`https://atuavidanosastros.com.br/${path}`
		);
		if (path === 'termos') {
			await page.screenshot({ path: '../../test-results/social-setup/legal-terms-desktop.png' });
		}
	}
});

test('optional analytics can be declined again on the privacy page', async ({ page }) => {
	await page.goto('/privacidade');
	await page.evaluate(() => localStorage.setItem('atv-analytics-consent', 'granted'));
	await page.getByRole('button', { name: 'Recusar medição opcional', exact: true }).click();
	await expect
		.poll(() => page.evaluate(() => localStorage.getItem('atv-analytics-consent')))
		.toBe('denied');
	await expect(
		page.getByRole('heading', { name: 'Política de Privacidade', exact: true })
	).toBeVisible();
});

test('legal pages fit a small screen and expose both footer links', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 });
	await page.goto('/privacidade');
	await expect(page.locator('footer a[href="/termos"]')).toBeVisible();
	await expect(page.locator('footer a[href="/privacidade"]')).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	await page.screenshot({ path: '../../test-results/social-setup/legal-privacy-mobile.png' });
});

test('TikTok endpoint is present and fails closed without a configured session', async ({
	request
}) => {
	const response = await request.get('/api/integrations/tiktok/connect', { maxRedirects: 0 });
	// Local preview has no provider credentials or production identity.
	expect(response.status()).toBe(503);
	expect(response.headers()['cache-control']).toBe('private, no-store');
	expect(response.headers()['referrer-policy']).toBe('no-referrer');
});
