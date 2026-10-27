import { expect, test, type Page } from '@playwright/test';
import { scanAccessibility } from './fixtures/accessibility';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});

async function assertShowcaseOnly(page: Page) {
	await expect(page.locator('main')).toContainText('ainda não está à venda');
	await expect(
		page.locator('main').getByRole('button', { name: /comprar|carrinho|pagar/i })
	).toHaveCount(0);
	const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
	expect(
		structuredData.some((value) => /"@type"\s*:\s*"(Product|Offer|AggregateOffer)"/.test(value))
	).toBe(false);
}

test('Vitrine permite filtrar peças existentes e abrir detalhes sem checkout', async ({ page }) => {
	await page.goto('/loja');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Loja dos Signos');
	await expect(page.locator('.shop-card')).toHaveCount(319);
	await assertShowcaseOnly(page);
	await page
		.getByRole('combobox', { name: 'Tipo de peça', exact: true })
		.selectOption('Regata de casal');
	await expect(page.locator('.shop-card')).toHaveCount(3);
	await expect(page.locator('.shop-toolbar [aria-live]')).toContainText('3 peças em preparação');
	await page.locator('.shop-card .product-image').first().click();
	await expect(page).toHaveURL(/\/loja\/peca\//);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.locator('.gallery .main-image img')).toBeVisible();
	await expect(page.locator('meta[name="robots"][content="noindex,follow"]')).toHaveCount(1);
	expect(
		await page
			.locator('meta[name="robots"]')
			.evaluateAll((tags) => tags.every((tag) => tag.getAttribute('content')?.includes('noindex')))
	).toBe(true);
	await assertShowcaseOnly(page);
});

test('Todas as 15 coleções estão acessíveis sem duplicar páginas das peças', async ({ page }) => {
	await page.goto('/loja');
	const nav = page.getByRole('navigation', { name: 'Coleções da Loja dos Signos', exact: true });
	await nav.locator('summary').click();
	await expect(nav.getByRole('link')).toHaveCount(16);
	await expect(nav.getByRole('link', { name: /Acessórios/ })).toBeVisible();
	await expect(nav.getByRole('link', { name: /Premium/ })).toBeVisible();
	await nav.getByRole('link', { name: /Namorados e Sinastria/ }).click();
	await expect(page).toHaveURL(/\/loja\/colecao\/casal$/);
	await expect(page.locator('.shop-card')).toHaveCount(159);
	await page
		.getByRole('combobox', { name: 'Combinação de signos', exact: true })
		.selectOption('Áries + Câncer');
	await expect(page.locator('.shop-card')).toHaveCount(3);
	await page
		.getByRole('combobox', { name: 'Tipo de peça', exact: true })
		.selectOption('Regata de casal');
	await expect(page.locator('.shop-card')).toHaveCount(1);
	await page
		.getByRole('navigation', { name: 'Coleções da Loja dos Signos', exact: true })
		.getByRole('link', { name: /Premium/ })
		.click();
	await expect(page.locator('.shop-card')).toHaveCount(24);
	await expect(page.getByRole('combobox', { name: 'Tipo de peça', exact: true })).toHaveValue(
		'Todas'
	);
	const pieceHref = await page.locator('.shop-card .product-image').first().getAttribute('href');
	await page
		.getByRole('navigation', { name: 'Coleções da Loja dos Signos', exact: true })
		.locator('summary')
		.click();
	await page
		.getByRole('navigation', { name: 'Coleções da Loja dos Signos', exact: true })
		.getByRole('link', { name: /Áries/ })
		.click();
	await expect(page).toHaveURL(/\/loja\/signo\/aries$/);
	await expect(page.locator('.shop-card')).toHaveCount(14);
	await expect(page.locator(`.shop-card .product-image[href="${pieceHref}"]`)).toHaveCount(1);
	await assertShowcaseOnly(page);
});

test('Galeria troca vistas e cores; caminhos inexistentes retornam 404', async ({ page }) => {
	await page.goto('/loja/peca/cropped-aries');
	const image = page.locator('.gallery .main-image img');
	const initial = await image.getAttribute('src');
	await page.getByRole('button', { name: 'No corpo', exact: true }).click();
	await expect(image).not.toHaveAttribute('src', initial!);
	await page.getByRole('button', { name: 'Branco', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Frente da peça', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(image).toHaveAttribute('src', /branco-produto/);
	await expect(image).toHaveAttribute('alt', /branco/);
	for (const path of [
		'/loja/peca/inexistente',
		'/loja/colecao/inexistente',
		'/loja/signo/inexistente'
	]) {
		expect((await page.goto(path))?.status()).toBe(404);
	}
});

test('Rotas de comércio permanecem bloqueadas no ambiente publicado de teste', async ({
	request
}) => {
	const catalog = await request.get('/api/shop/catalog');
	expect(catalog.status()).toBe(503);
	expect(await catalog.json()).toMatchObject({ code: 'physical_commerce_disabled' });
	const cart = await request.post('/api/shop/cart', { data: {} });
	expect(cart.status()).toBe(503);
	expect(await cart.json()).toMatchObject({ code: 'physical_commerce_disabled' });
	expect((await request.post('/api/shop/diagnostic', { data: {} })).status()).toBe(404);
});

for (const width of [1440, 820, 390, 320]) {
	test(`Loja e detalhes cabem na viewport de ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		for (const path of ['/loja', '/loja/colecao/casal', '/loja/peca/cropped-aries']) {
			await page.goto(path);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
			).toBe(false);
			await page.screenshot({ path: testInfo.outputPath(`${path.split('/').pop()}-${width}.png`) });
		}
	});
}

for (const width of [1440, 390]) {
	test(`Vitrine e detalhes acessíveis em ${width}px`, async ({ page }, testInfo) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/loja');
		const category = page.getByRole('combobox', { name: 'Tipo de peça', exact: true });
		await category.focus();
		await expect(category).toBeFocused();
		await page.keyboard.press('r');
		await page.keyboard.press('Enter');
		await scanAccessibility(page, testInfo);
		await page.goto('/loja/peca/cropped-aries');
		await scanAccessibility(page, testInfo);
	});
}
