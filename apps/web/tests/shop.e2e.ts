import { expect, test } from '@playwright/test';
import { scanAccessibility } from './fixtures/accessibility';

test('Coleções conceituais permitem filtros, detalhes e estado vazio sem checkout', async ({
	page
}) => {
	await page.goto('/loja');
	await expect(page.locator('#colecoes')).toHaveAttribute('data-hydrated', 'true');
	const refuseAnalytics = page.getByRole('button', { name: 'Recusar opcionais' });
	if (await refuseAnalytics.isVisible()) {
		await refuseAnalytics.click();
		await expect(refuseAnalytics).toBeHidden();
	}
	const region = page.locator('#colecoes');
	await expect(region).toHaveAttribute('data-hydrated', 'true');
	await expect(region.getByRole('status')).toContainText('19 direções');
	await expect(region.getByTestId('shop-direction')).toHaveCount(6);
	await region.getByRole('button', { name: 'Próxima', exact: true }).click();
	await expect(region.getByText('Página 2 de 4')).toBeVisible();
	await region.getByLabel('Técnica em estudo', { exact: true }).selectOption('embroidery');
	await expect(region.getByRole('status')).toContainText('4 direções');
	await expect(region.getByText('Página 1 de 1')).toBeVisible();
	await region.getByLabel('Coleção', { exact: true }).selectOption('simbolos-bordados');
	await expect(region.getByTestId('shop-direction')).toHaveCount(1);
	await region.getByText('Conhecer a direção', { exact: true }).click();
	await expect(region.getByText(/Monogramas celestes/)).toBeVisible();
	await region.getByLabel('Para quem', { exact: true }).selectOption('baby');
	await expect(
		region.getByRole('heading', { name: 'Nenhuma direção com esses filtros' })
	).toBeVisible();
	await region.getByRole('button', { name: 'Ver todas as direções' }).click();
	await region.getByLabel('Buscar uma direção').fill('orbita');
	await expect(region.getByTestId('shop-direction')).toHaveCount(1);
	await expect(region.getByRole('heading', { name: 'Órbita Zodiacal' })).toBeVisible();
	await region.getByRole('button', { name: 'Limpar filtros' }).click();
	await region.getByLabel('Signo', { exact: true }).selectOption('aries');
	await expect(region.getByRole('status')).toContainText('16 direções');
	await expect(region.locator('img')).toHaveCount(0);
	await expect(region.getByRole('button', { name: /comprar|carrinho|pagar/i })).toHaveCount(0);
});

test('Loja mantém as 12 rotas editoriais sem ofertas publicadas', async ({ page }) => {
	await page.goto('/loja');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Loja dos Signos');
	await expect(
		page.getByRole('navigation', { name: 'Signos na loja' }).getByRole('link')
	).toHaveCount(12);
	await expect(page.locator('.hero-copy .lead')).toContainText(
		'Ainda não há produtos, preços, estoque, prazo ou avaliações publicados.'
	);
	expect(await page.locator('script[type="application/ld+json"]').allTextContents()).not.toEqual(
		expect.arrayContaining([
			expect.stringMatching(/"@type"\s*:\s*"(Product|Offer|AggregateOffer)"/)
		])
	);
	await page
		.getByRole('navigation', { name: 'Signos na loja' })
		.getByRole('link', { name: /Áries/ })
		.click();
	await expect(page).toHaveURL(/\/loja\/signo\/aries$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Áries na Loja dos Signos');
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
	await expect(
		page.getByText(/Os produtos, os preços e as condições de compra serão exibidos aqui/)
	).toBeVisible();
	const refuseAnalytics = page.getByRole('button', { name: 'Recusar opcionais' });
	if (await refuseAnalytics.isVisible()) await refuseAnalytics.click();
	await page.screenshot({ path: '../../test-results/gate-b/loja-signo-1280.png', fullPage: true });
	await page.setViewportSize({ width: 390, height: 900 });
	expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
		false
	);
	await page.screenshot({ path: '../../test-results/gate-b/loja-signo-390.png', fullPage: true });
});

for (const width of [1440, 820, 390, 320]) {
	test(`Loja cabe na viewport de ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/loja');
		await expect(page.locator('#colecoes')).toHaveAttribute('data-hydrated', 'true');
		const refuseAnalytics = page.getByRole('button', { name: 'Recusar opcionais' });
		if (await refuseAnalytics.isVisible()) {
			await refuseAnalytics.click();
			await expect(refuseAnalytics).toBeHidden();
		}
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		const horizontalOverflow = await page.evaluate(
			() => document.documentElement.scrollWidth > window.innerWidth
		);
		expect(horizontalOverflow).toBe(false);
		await page.screenshot({ path: `../../test-results/gate-b/loja-${width}.png`, fullPage: true });
		if (width === 1440 || width === 390) {
			await page.screenshot({ path: `../../test-results/gate-b/loja-${width}-inicio.png` });
		}
	});
}

for (const width of [1440, 390]) {
	test(`Coleções acessíveis e filtros por teclado em ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/loja');
		await expect(page.locator('#colecoes')).toHaveAttribute('data-hydrated', 'true');
		await page.getByRole('button', { name: 'Recusar opcionais' }).click();
		const search = page.getByLabel('Buscar uma direção');
		await search.focus();
		await page.keyboard.type('orbita');
		await expect(page.getByTestId('shop-direction')).toHaveCount(1);
		await page.keyboard.press('Tab');
		await expect(page.getByLabel('Coleção', { exact: true })).toBeFocused();
		await scanAccessibility(page, testInfo);
		await page.getByRole('button', { name: 'Limpar filtros' }).click();
		await scanAccessibility(page, testInfo);
	});
}
