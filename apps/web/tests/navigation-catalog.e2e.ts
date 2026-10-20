import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('atv-analytics-consent', 'denied'));
});

test('menu e rodapé distinguem os catálogos e a assinatura', async ({ page }, testInfo) => {
	await page.setViewportSize({ width: 1920, height: 1080 });
	await page.goto('/leituras');
	await expect(page.locator('header.site-header').getByRole('link')).toHaveCount(2);
	await page.screenshot({ path: testInfo.outputPath('cabecalho-desktop-simples.png') });
	const button = page.getByRole('button', { name: 'Menu', exact: true });
	await expect(button).toBeEnabled();
	await button.click();
	const menu = page.getByRole('navigation', { name: 'Navegação principal', exact: true });
	await expect(menu.getByRole('heading', { name: 'Comece e explore' })).toBeVisible();
	const offers = menu.locator('section', { has: page.locator('#menu-produtos') });
	await expect(offers.locator('a[href="/leituras"]')).toContainText('Leituras digitais');
	await expect(offers.locator('a[href="/loja"]')).toContainText('Produtos físicos');
	await expect(offers.locator('a[href="/loja"]')).toContainText('Loja dos Signos');
	await expect(offers.locator('a[href="/atv-mais"]')).toContainText('ATV+ · Assinatura');
	await expect(menu.locator('.nav-interests a')).toHaveCount(6);
	await expect(menu.locator('a[href="/leituras"]')).toHaveAttribute('aria-current', 'page');
	await page.screenshot({ path: testInfo.outputPath('menu-desktop.png') });
	await page.keyboard.press('Escape');
	await expect(menu).toBeHidden();
	await expect(button).toBeFocused();
	await button.click();
	await offers.locator('a[href="/loja"]').click();
	await expect(page).toHaveURL(/\/loja$/);
	await expect(menu).toBeHidden();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Loja dos Signos');
	await expect(page.locator('main')).toContainText('Produtos físicos');
	await expect(page.locator('main')).toContainText('A coleção ainda não está à venda');
	await expect(
		page.locator('main').getByRole('button', { name: /comprar|carrinho|pagar/i })
	).toHaveCount(0);
	await page.screenshot({ path: testInfo.outputPath('loja-produtos-fisicos.png'), fullPage: true });
	await page.locator('main a[href="/leituras"]').click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leituras digitais');
	const footer = page.locator('footer');
	await expect(footer.locator('a[href="/leituras"]')).toHaveText('Leituras digitais');
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
		await page.getByRole('button', { name: 'Menu', exact: true }).click();
		const menu = page.getByRole('navigation', { name: 'Navegação principal', exact: true });
		await expect(menu).toBeVisible();
		await expect
			.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), {
				message: `O menu deve caber na tela de ${width}px`
			})
			.toBeLessThanOrEqual(0);
		await menu.locator('a[href="/loja"]').scrollIntoViewIfNeeded();
		await expect(menu.locator('a[href="/loja"]')).toBeInViewport();
		await menu.locator('a[href="/loja"]').click({ trial: true });
		if (width === 390)
			await page.screenshot({ path: testInfo.outputPath('menu-mobile-produtos.png') });
		await menu.getByRole('link', { name: 'Fale conosco', exact: true }).scrollIntoViewIfNeeded();
		await expect(menu.getByRole('link', { name: 'Fale conosco', exact: true })).toBeInViewport();
		await page.keyboard.press('Escape');
		await expect(menu).toBeHidden();
	}
});

test('cabeçalho e menu cabem em telas pequenas quando as fontes não carregam', async ({ page }) => {
	await page.route(/\.(woff2?|ttf)(\?|$)/, (route) => route.abort());
	for (const width of [320, 390]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/');
		await page.getByRole('button', { name: 'Menu', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Fechar menu', exact: true })).toBeInViewport();
		await expect(page.locator('.header-account')).toBeInViewport();
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
	const catalogs = page.getByRole('navigation', { name: 'Catálogos de produtos' });
	await expect(catalogs.locator('a[href="/leituras"]')).toContainText('Leituras digitais');
	await expect(catalogs.locator('a[href="/loja"]')).toContainText(
		'Produtos físicos · Loja dos Signos'
	);
	await catalogs.scrollIntoViewIfNeeded();
	await page.screenshot({ path: testInfo.outputPath('home-catalogos.png') });
	await catalogs.locator('a[href="/leituras"]').click();
	await expect(page).toHaveTitle(/Leituras digitais/);
	await expect(page.locator('.public-product-card')).toHaveCount(19);
	await expect(page.locator('main a[href^="/ferramentas"]')).toHaveCount(0);
	await expect(page.locator('main a[href^="/testar-produtos"]')).toHaveCount(0);
	await expect(page.locator('.public-product-card .badge').first()).toHaveText('Em preparação');
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
