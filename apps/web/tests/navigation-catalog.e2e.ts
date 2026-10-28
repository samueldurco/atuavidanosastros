import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});

test('menu e rodapé distinguem os catálogos e a assinatura', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 1920, height: 1080 });
	await page.goto('/leituras');
	await expect(page.locator('header.site-header').getByRole('link')).toHaveCount(2);
	await page.screenshot({ path: testInfo.outputPath('cabecalho-desktop-simples.png') });
	const button = page.locator('.nav-trigger[aria-controls="nav-produtos"]');
	await expect(button).toBeEnabled();
	await button.click();
	const menu = page.getByRole('navigation', { name: 'Navegação principal', exact: true });
	const offers = page.locator('#nav-produtos');
	await expect(offers.locator('.nav-item[href="/leituras"]')).toContainText('Leituras avulsas');
	await expect(offers.locator('a[href="/atv-mais"]')).toContainText('Assinatura ATV+');
	await expect(offers.locator('a[href^="/leituras?tema="]')).toHaveCount(6);
	await page.screenshot({ path: testInfo.outputPath('menu-desktop.png') });
	await page.keyboard.press('Escape');
	await expect(offers).toHaveCount(0);
	await expect(button).toBeFocused();
	await menu.locator('[aria-controls="nav-loja"]').click();
	await page.locator('#nav-loja a[href="/loja"]').click();
	await expect(page).toHaveURL(/\/loja$/);
	await expect(page.locator('.nav-panel')).toHaveCount(0);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Loja dos Signos');
	await expect(page.locator('main')).toContainText('Produtos físicos');
	await expect(page.locator('main')).toContainText('A coleção ainda não está à venda');
	await expect(
		page.locator('main').getByRole('button', { name: /comprar|carrinho|pagar/i })
	).toHaveCount(0);
	await page.screenshot({ path: testInfo.outputPath('loja-produtos-fisicos.png') });
	await page.locator('main a[href="/leituras"]').click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'Escolha sua próxima descoberta.',
		{ useInnerText: true }
	);
	const footer = page.locator('footer');
	await expect(footer.locator('a[href="/leituras"]')).toHaveText('Produtos digitais');
	await expect(footer.locator('a[href="/loja"]')).toHaveText('Produtos físicos');
	await expect(footer.locator('a[href="/atv-mais"]')).toHaveText('ATV+ · Assinatura');
	await footer.screenshot({ path: testInfo.outputPath('rodape-catalogos.png') });
});

test('menu móvel permite chegar a todos os caminhos sem transbordar a tela', async ({
	page
}, testInfo) => {
	for (const width of [320, 390, 768, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/');
		if (width <= 960) await page.locator('.mobile-menu').click();
		const menu = page.getByRole('navigation', { name: 'Navegação principal', exact: true });
		await expect(menu).toBeVisible();
		await expect
			.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), {
				message: `O menu deve caber na tela de ${width}px`
			})
			.toBeLessThanOrEqual(0);
		await menu.locator('[aria-controls="nav-loja"]').click();
		const store = page.locator('#nav-loja a[href="/loja"]');
		await store.scrollIntoViewIfNeeded();
		await expect(store).toBeInViewport();
		await store.click({ trial: true });
		if (width === 390)
			await page.screenshot({ path: testInfo.outputPath('menu-mobile-produtos.png') });
		await menu.locator('.account-link').scrollIntoViewIfNeeded();
		await expect(menu.locator('.account-link')).toBeInViewport();
		await page.keyboard.press('Escape');
		await expect(page.locator('.nav-panel')).toHaveCount(0);
		if (width <= 960) {
			await page.keyboard.press('Escape');
			await expect(menu).toBeHidden();
		}
	}
});

test('cabeçalho e menu cabem em telas pequenas quando as fontes não carregam', async ({ page }) => {
	await page.route(/\.(woff2?|ttf)(\?|$)/, (route) => route.abort());
	for (const width of [320, 390]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/');
		await page.getByRole('button', { name: 'Menu', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Fechar menu', exact: true })).toBeInViewport();
		await expect(page.locator('.account-link')).toBeInViewport();
		await expect
			.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
			.toBeLessThanOrEqual(0);
		await page.getByRole('button', { name: 'Fechar menu', exact: true }).click();
		await expect(
			page.getByRole('navigation', { name: 'Navegação principal', exact: true })
		).toBeHidden();
	}
});

test('home, universos, produto e ATV+ mantêm o contexto de cada oferta', async ({
	page
}, testInfo) => {
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.goto('/');
	const catalogs = page.locator('#produtos');
	await expect(catalogs.locator('.showcase-card.avulsos')).toBeVisible();
	await expect(catalogs.locator('.showcase-card.subscription')).toBeVisible();
	await expect(page.locator('#loja a[href="/loja"]')).toContainText('Explorar a Loja dos Signos');
	await catalogs.scrollIntoViewIfNeeded();
	await page.screenshot({ path: testInfo.outputPath('home-catalogos.png') });
	await catalogs.locator('.showcase-card.avulsos a[href="/leituras#catalogo"]').click();
	await expect(page).toHaveTitle(/Leituras digitais/);
	await expect(page.locator('.public-product-card')).toHaveCount(19);
	await page.locator('.public-product-card h3 a').first().click();
	await expect(page.locator('main')).toContainText('Leitura digital · produto avulso');
	await page.getByRole('link', { name: 'Catálogo de leituras digitais', exact: true }).click();
	await expect(page).toHaveURL(/\/leituras$/);
	for (const topic of ['mapa-astral', 'previsoes', 'amor', 'carreira', 'tarot', 'sonhos']) {
		const response = await page.goto(`/temas/${topic}`);
		expect(response?.status()).toBe(200);
		await expect(page.locator('#readings-title')).toContainText('Leituras digitais');
		await expect(page.locator('main a[href="/leituras"]')).toContainText(
			'catálogo de leituras digitais'
		);
	}
	await page.goto('/atv-mais');
	await expect(page).toHaveTitle(/Assinatura de leituras digitais/);
	await expect(page.locator('.plus-intro .eyebrow')).toHaveText('Assinatura de leituras digitais');
	await expect(page.locator('main')).toContainText('Assinaturas em preparação');
	await expect(page.locator('main a[href="/leituras"]')).toContainText('digitais avulsas');
});
