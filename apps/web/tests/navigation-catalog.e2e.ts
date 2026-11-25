import { expect, test } from '@playwright/test';
import { shopDepartments } from '../src/lib/data/shop-departments';
import { shopPreviews } from '../src/lib/data/shop-products';

test('Loja abre categorias filtradas pelo menu e reúne as coleções por signo', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 1050 });
	await page.goto('/');
	const storeTrigger = page.locator('[aria-controls="nav-loja"]');
	const storePanel = page.locator('#nav-loja');
	const cards = page.locator('.shop-card .product-image');
	for (const department of shopDepartments) {
		await storeTrigger.click();
		await storePanel.getByRole('link', { name: new RegExp(`^${department.label}`) }).click();
		await expect(page).toHaveURL(department.href);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(department.label);
		await expect(
			page
				.getByRole('navigation', { name: 'Categorias da Loja dos Signos' })
				.getByRole('link', { name: department.label, exact: true })
		).toHaveAttribute('aria-current', 'page');
		const expected = shopPreviews
			.filter((piece) => department.categories.includes(piece.category))
			.map((piece) => `/loja/peca/${piece.slug}`);
		expect(expected.length).toBeGreaterThan(0);
		await expect(cards).toHaveCount(Math.min(24, expected.length));
		for (let loaded = 24; loaded < expected.length; loaded += 24) {
			await page.getByRole('button', { name: /Carregar mais peças/ }).click();
			await expect(cards).toHaveCount(Math.min(loaded + 24, expected.length));
		}
		await expect(cards).toHaveCount(expected.length);
		await expect(page.getByRole('button', { name: /Carregar mais peças/ })).toHaveCount(0);
		expect(
			new Set(await cards.evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
		).toEqual(new Set(expected));
	}
	expect(
		shopPreviews.every(
			(piece) =>
				shopDepartments.filter((department) => department.categories.includes(piece.category))
					.length === 1
		)
	).toBe(true);
	await storeTrigger.click();
	const collectionLink = storePanel.getByRole('link', { name: /^Coleções/ });
	await expect(collectionLink).toHaveAttribute('href', '/loja?ver=colecoes#colecoes');
	await collectionLink.click();
	await expect(page).toHaveURL('/loja?ver=colecoes#colecoes');
	const collections = page.getByRole('navigation', { name: 'Coleções da Loja dos Signos' });
	await expect(collections.locator('details')).toHaveAttribute('open', '');
	await expect(collections.getByRole('link', { name: /^Peixes/ })).toHaveAttribute(
		'href',
		'/loja/signo/peixes'
	);
	await expect(collections.getByRole('link')).toHaveCount(15);
});

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
	await expect(offers.locator('.nav-item strong')).toHaveText([
		'Assinatura ATV+',
		'Lançamentos',
		'Leituras avulsas'
	]);
	await expect(offers.locator('.nav-item[href="/leituras"]')).toContainText('Leituras avulsas');
	await expect(offers.locator('.nav-item[href="/atv-mais"]')).toContainText('Assinatura ATV+');
	await expect(offers.locator('.nav-item[href="/lancamentos"]')).toContainText('Lançamentos');
	await page.screenshot({ path: testInfo.outputPath('menu-desktop.png') });
	await page.keyboard.press('Escape');
	await expect(offers).toHaveCount(0);
	await expect(button).toBeFocused();
	await menu.locator('[aria-controls="nav-loja"]').click();
	await page.locator('#nav-loja .nav-panel-heading a[href="/loja"]').click();
	await expect(page).toHaveURL(/\/loja$/);
	await expect(page.locator('.nav-panel')).toHaveCount(0);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Loja dos Signos');
	await expect(page.getByRole('search', { name: 'Buscar na Loja dos Signos' })).toBeVisible();
	await expect(page.locator('main')).toContainText('ATVNA · arte zodiacal');
	await expect(page.locator('main')).toContainText('A coleção ainda não está à venda');
	await expect(
		page.locator('main').getByRole('button', { name: /comprar|carrinho|pagar/i })
	).toHaveCount(0);
	await page.screenshot({ path: testInfo.outputPath('loja-produtos-fisicos.png') });
	await page.locator('main a[href="/leituras"]').click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Encontre sua leitura.', {
		useInnerText: true
	});
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
		await menu.locator('[aria-controls="nav-produtos"]').click();
		const offers = page.locator('#nav-produtos .nav-item');
		await expect(offers.locator('strong')).toHaveText([
			'Assinatura ATV+',
			'Lançamentos',
			'Leituras avulsas'
		]);
		for (const offer of await offers.all()) {
			await offer.click({ trial: true });
		}
		if (width === 390) {
			await offers.first().scrollIntoViewIfNeeded();
			await page.screenshot({ path: testInfo.outputPath('menu-mobile-leituras.png') });
		}
		await menu.locator('[aria-controls="nav-loja"]').click();
		const store = page.locator('#nav-loja .nav-item[href="/loja?categoria=roupas"]');
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
	const readings = catalogs.locator('.reading-selection .reading-feature');
	await expect(readings).toHaveCount(3);
	for (const reading of await readings.all()) {
		await expect(reading).toBeVisible();
		await expect(reading.locator('a[data-atv-event="product_click"]')).toHaveAttribute(
			'href',
			/^\/produtos\//
		);
	}
	const subscription = page.locator('#atv-mais-home');
	await expect(subscription.locator('.plus-plan')).toHaveCount(3);
	await expect(subscription.getByRole('link', { name: 'Conhecer os planos' })).toHaveAttribute(
		'href',
		'/atv-mais'
	);
	await expect(page.locator('#loja a[href="/loja"]')).toContainText('Explorar a Loja dos Signos');
	await catalogs.scrollIntoViewIfNeeded();
	await page.screenshot({ path: testInfo.outputPath('home-catalogos.png') });
	await catalogs.getByRole('link', { name: 'Ver todas as leituras' }).click();
	await expect(page).toHaveTitle(/Leituras digitais/);
	await expect(page.locator('.public-product-card')).toHaveCount(30);
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
	await expect(page.locator('.commercial-hero .eyebrow')).toHaveText(
		'Leituras pessoais, ao longo do tempo'
	);
	await expect(page.locator('main')).toContainText('Contratação em preparação');
	await expect(page.locator('.separate a[href="/leituras"]')).toContainText('digitais avulsas');
});
