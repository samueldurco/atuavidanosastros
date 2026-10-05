import { expect, test } from '@playwright/test';
import { scanAccessibility as scan } from './fixtures/accessibility';

const surfaces = ['/', '/entrar', '/bussola-de-carreira', '/meu-ceu', '/loja', '/metodo'];
const viewports = [
	{ name: 'desktop', width: 1440, height: 1000 },
	{ name: 'mobile', width: 390, height: 844 }
];

for (const viewport of viewports) {
	for (const path of surfaces) {
		test(`acessibilidade pública ${viewport.name}: ${path}`, async ({ page }, testInfo) => {
			await page.setViewportSize(viewport);
			const response = await page.goto(path);
			expect(response?.status()).toBe(200);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			await expect(page.getByRole('button', { name: 'Recusar analytics' })).toBeVisible();
			await scan(page, testInfo);
		});
	}

	test(`página não encontrada ${viewport.name}`, async ({ page }, testInfo) => {
		await page.setViewportSize(viewport);
		const response = await page.goto('/pagina-inexistente-a11y');
		expect(response?.status()).toBe(404);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('404');
		await expect(page).toHaveTitle('Página não encontrada — A Tua Vida nos Astros');
		await scan(page, testInfo);
		await page.getByRole('link', { name: 'Voltar ao início' }).click();
		await expect(page).toHaveURL('/');
	});

	test(`home após recusar analytics ${viewport.name}`, async ({ page }, testInfo) => {
		await page.setViewportSize(viewport);
		await page.goto('/');
		await page.getByRole('button', { name: 'Recusar analytics' }).click();
		await expect(page.getByRole('complementary', { name: 'Preferências de cookies' })).toHaveCount(
			0
		);
		await scan(page, testInfo);
	});
}

test('menu público aberto por teclado no celular', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await page.getByRole('button', { name: 'Recusar analytics' }).click();
	const menu = page.locator('button[aria-controls="primary-navigation"]');
	await menu.focus();
	await page.keyboard.press('Enter');
	await expect(menu).toHaveAttribute('aria-expanded', 'true');
	await scan(page, testInfo);
	await page.keyboard.press('Escape');
	await expect(menu).toBeFocused();
	await expect(menu).toHaveAttribute('aria-expanded', 'false');
});
