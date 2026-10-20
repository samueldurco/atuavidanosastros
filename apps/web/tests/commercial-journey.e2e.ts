import { expect, test } from '@playwright/test';

test('a apresentação pós-compra não fica acessível como página pública', async ({ page }) => {
	const response = await page.goto('/ofertas/upsell-birth-chart-life-atlas-post-purchase');
	expect(response?.status()).toBe(404);
	expect(response?.headers()['cache-control']).toBe('private, no-store');
	expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
	await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0);
	await expect(page.locator('a[href="/leituras"]')).toHaveCount(0);
});

test('a prévia do PR permite avaliar a jornada sem navegação pública', async ({ request }) => {
	const response = await request.get('/ofertas/upsell-birth-chart-life-atlas-post-purchase', {
		headers: { host: 'codex-commercial-journeys-20.atuavidanosastros.pages.dev' }
	});
	expect(response.status()).toBe(200);
	expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
	const html = await response.text();
	expect(html).toContain('Prévia interna');
	expect(html).toContain('Continuar para Minha Área');
	expect(html).not.toContain('aria-label="Navegação principal"');
	expect(html).not.toContain('href="/leituras"');
});
